import requests

PROJECT_ID = "unionapp-27bbd"
COLLECTION = "issues_public"


def fetch_public_issues(id_token):
    url = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/{COLLECTION}"
    headers = {"Authorization": f"Bearer {id_token}"}

    r = requests.get(url, headers=headers)
    r.raise_for_status()

    data = r.json()
    documents = data.get("documents", []) or []
    results = []

    for doc in documents:
        fields = doc.get("fields", {}) or {}

        def get_str(key):
            v = fields.get(key, {})
            return (v.get("stringValue") or "").strip()

        def get_int(key):
            v = fields.get(key, {})
            raw = v.get("integerValue")
            if raw is None:
                raw = v.get("stringValue")  # 혹시 문자열로 들어온 경우 대비
            try:
                return int(raw)
            except Exception:
                return 0

        def get_ts(key):
            v = fields.get(key, {}) or {}
            # timestampValue가 없으면 stringValue도 허용
            return (v.get("timestampValue") or v.get("stringValue") or "").strip()

        doc_name = doc.get("name", "") or ""
        doc_id = doc_name.split("/")[-1] if doc_name else ""

        item = {
            "id": doc_id,  # ✅ 핵심: Firestore 문서ID
            "title": get_str("title"),
            "summary": get_str("summary"),
            "company": get_str("company"),
            "union": get_str("union"),
            "scope": get_str("scope") or "전체",
            "order": get_int("order"),
            "updated_at": get_ts("updated_at"),
        }
        results.append(item)

        # ✅ 디버그는 여기서! (문서별로 확인)
        print("DEBUG doc:", item["id"], item["title"], "| scope:", item["scope"])

    print("DEBUG parsed issues count:", len(results))
    return results