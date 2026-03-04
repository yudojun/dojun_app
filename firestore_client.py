import os
from kivy.utils import platform
import requests

# 폰(안드로이드)에서는 firebase-admin을 쓰지 않게 막는다.
# (일단 앱이 켜지는 게 우선)
if platform == "android":

    def fetch_issues():
        return []  # 또는 LOCAL_ISSUES를 그대로 쓰게 main.py에서 처리

    def fetch_remote_version():
        return 0

else:
    import firebase_admin
    from firebase_admin import credentials, firestore

    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    KEY_PATH = os.path.join(BASE_DIR, "firebase_key.json")

    if not firebase_admin._apps:
        cred = credentials.Certificate(KEY_PATH)
        firebase_admin.initialize_app(cred)

    db = firestore.client()

    def fetch_issues():
        docs = db.collection("issues").stream()
        return [doc.to_dict() for doc in docs]

    def fetch_remote_version():
        doc = db.collection("meta").document("version").get()
        if doc.exists:
            return doc.to_dict().get("version", 0)
        return 0

    FIRESTORE_PROJECT_ID = "unionapp-27bbd"

    def fetch_vote_summary(id_token: str, issue_id: str) -> dict:
        """
        votes/{issue_id}/ballots 문서들 GET해서 choice 개수 집계
        return: {"yes": n, "no": n, "hold": n, "total": n}
        """
        url = (
            f"https://firestore.googleapis.com/v1/projects/{FIRESTORE_PROJECT_ID}"
            f"/databases/(default)/documents/votes/{issue_id}/ballots"
        )

        headers = {"Authorization": f"Bearer {id_token}"}
        r = requests.get(url, headers=headers)
        # ballots가 0개면 404로 올 수 있어서 안전 처리
        if r.status_code == 404:
            return {"yes": 0, "no": 0, "hold": 0, "total": 0}

        r.raise_for_status()
        data = r.json()
        docs = data.get("documents", [])

        yes = no = hold = 0
        for doc in docs:
            fields = doc.get("fields", {})
            choice = fields.get("choice", {}).get("stringValue", "")
            if choice == "yes":
                yes += 1
            elif choice == "no":
                no += 1
            elif choice == "hold":
                hold += 1

        total = yes + no + hold
        return {"yes": yes, "no": no, "hold": hold, "total": total}
