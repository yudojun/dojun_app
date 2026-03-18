import os
from kivy.utils import platform
import requests

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY_PATH = os.path.join(BASE_DIR, "firebase", "firebase_key.json")
FIRESTORE_PROJECT_ID = "unionapp-27bbd"


def _default_version_meta():
    return {
        "latestVersion": "0.0.0",
        "minimumVersion": "0.0.0",
        "updateRequired": False,
        "message": "",
        "downloadUrl": "",
    }


if platform == "android":
    # 안드로이드에서는 firebase-admin 미사용, REST만 허용
    def fetch_issues():
        return []

    def fetch_remote_version():
        return 0

    def fetch_version_meta():
        return _default_version_meta()

    def fetch_vote_summary(id_token: str, issue_id: str) -> dict:
        if not id_token or not issue_id:
            return {"yes": 0, "no": 0, "hold": 0, "total": 0}

        url = (
            f"https://firestore.googleapis.com/v1/projects/{FIRESTORE_PROJECT_ID}"
            f"/databases/(default)/documents/votes/{issue_id}/ballots"
        )

        headers = {"Authorization": f"Bearer {id_token}"}

        try:
            r = requests.get(url, headers=headers, timeout=10)

            if r.status_code == 404:
                return {"yes": 0, "no": 0, "hold": 0, "total": 0}

            r.raise_for_status()
            data = r.json()
            docs = data.get("documents", []) or []

            yes = no = hold = 0
            for doc in docs:
                fields = doc.get("fields", {}) or {}
                choice = (fields.get("choice") or {}).get("stringValue", "")

                if choice == "yes":
                    yes += 1
                elif choice == "no":
                    no += 1
                elif choice == "hold":
                    hold += 1

            total = yes + no + hold
            return {"yes": yes, "no": no, "hold": hold, "total": total}

        except Exception as e:
            print("fetch_vote_summary(android) error:", repr(e))
            return {"yes": 0, "no": 0, "hold": 0, "total": 0}

else:
    import firebase_admin
    from firebase_admin import credentials, firestore

    if not firebase_admin._apps:
        cred = credentials.Certificate(KEY_PATH)
        firebase_admin.initialize_app(cred)

    db = firestore.client()

    def fetch_issues():
        docs = db.collection("issues_public").stream()
        results = []
        for doc in docs:
            item = doc.to_dict() or {}
            item["id"] = doc.id
            results.append(item)
        return results

    def fetch_remote_version():
        doc = db.collection("meta").document("version").get()
        if doc.exists:
            data = doc.to_dict() or {}
            version = data.get("version")
            if version is not None:
                return int(version)
        return 0

    def fetch_version_meta():
        doc = db.collection("meta").document("version").get()

        if not doc.exists:
            return _default_version_meta()

        data = doc.to_dict() or {}

        return {
            "latestVersion": str(data.get("latestVersion", "0.0.0")),
            "minimumVersion": str(data.get("minimumVersion", "0.0.0")),
            "updateRequired": bool(data.get("updateRequired", False)),
            "message": str(data.get("message", "")),
            "downloadUrl": str(data.get("downloadUrl", "")),
        }

    def fetch_vote_summary(id_token: str, issue_id: str) -> dict:
        if not id_token or not issue_id:
            return {"yes": 0, "no": 0, "hold": 0, "total": 0}

        url = (
            f"https://firestore.googleapis.com/v1/projects/{FIRESTORE_PROJECT_ID}"
            f"/databases/(default)/documents/votes/{issue_id}/ballots"
        )

        headers = {"Authorization": f"Bearer {id_token}"}
        r = requests.get(url, headers=headers, timeout=10)

        if r.status_code == 404:
            return {"yes": 0, "no": 0, "hold": 0, "total": 0}

        r.raise_for_status()
        data = r.json()
        docs = data.get("documents", []) or []

        yes = no = hold = 0
        for doc in docs:
            fields = doc.get("fields", {}) or {}
            choice = (fields.get("choice") or {}).get("stringValue", "")

            if choice == "yes":
                yes += 1
            elif choice == "no":
                no += 1
            elif choice == "hold":
                hold += 1

        total = yes + no + hold
        return {"yes": yes, "no": no, "hold": hold, "total": total}