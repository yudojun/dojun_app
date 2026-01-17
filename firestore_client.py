import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    cred = credentials.Certificate("firebase_key.json")
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
