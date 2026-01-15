import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    cred = credentials.Certificate("firebase_key.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()


def load_issues_from_firestore():
    docs = db.collection("issues").order_by("order").stream()

    results = []
    for doc in docs:
        d = doc.to_dict()
        results.append(
            (
                d.get("title", ""),
                d.get("summary", ""),
                d.get("company", ""),
                d.get("union_opt", ""),
            )
        )
    return results
