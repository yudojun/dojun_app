import requests

PROJECT_ID = "unionapp-27bbd"
COLLECTION = "issues_public"


def _get_string(fields: dict, key: str, default: str = "") -> str:
    field = fields.get(key) or {}
    value = field.get("stringValue")
    if value is None:
        return default
    return str(value).strip()


def _get_integer(fields: dict, key: str, default: int = 0) -> int:
    field = fields.get(key) or {}
    raw = field.get("integerValue")
    if raw is None:
        raw = field.get("stringValue")
    try:
        return int(raw)
    except Exception:
        return default


def _get_boolean(fields: dict, key: str, default: bool = False) -> bool:
    field = fields.get(key) or {}
    raw = field.get("booleanValue")
    if isinstance(raw, bool):
        return raw

    raw = field.get("stringValue")
    if isinstance(raw, str):
        return raw.strip().lower() == "true"

    return default


def _get_timestamp(fields: dict, key: str) -> str:
    field = fields.get(key) or {}
    return (field.get("timestampValue") or field.get("stringValue") or "").strip()


def _get_string_array(fields: dict, key: str) -> list[str]:
    field = fields.get(key) or {}
    values = (field.get("arrayValue") or {}).get("values", []) or []

    result = []
    for item in values:
        if "stringValue" in item:
            result.append((item.get("stringValue") or "").strip())
    return result


def fetch_public_issues(id_token=None):
    url = (
        f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}"
        f"/databases/(default)/documents/{COLLECTION}"
    )

    headers = {}
    if id_token:
        headers["Authorization"] = f"Bearer {id_token}"

    try:
        r = requests.get(url, headers=headers, timeout=10)
        print("fetch_public_issues status:", r.status_code)
        print("fetch_public_issues url:", url)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        print("fetch_public_issues error:", repr(e))
        return []

    documents = data.get("documents", []) or []
    results = []

    for doc in documents:
        fields = doc.get("fields", {}) or {}
        doc_name = doc.get("name", "") or ""
        doc_id = doc_name.split("/")[-1] if doc_name else ""

        item = {
            "id": doc_id,
            "title": _get_string(fields, "title"),
            "summary": _get_string(fields, "summary"),
            "content": _get_string(fields, "content"),
            "company": _get_string(fields, "company"),
            "union": _get_string(fields, "union"),
            "scope": _get_string(fields, "scope", "전체") or "전체",
            "type": _get_string(fields, "type", "vote") or "vote",
            "status": _get_string(fields, "status", "open") or "open",
            "imageUrl": _get_string(fields, "imageUrl", ""),
            "category": _get_string(fields, "category", ""),
            "resultVisibility": _get_string(fields, "resultVisibility", "public"),
            "multiple": _get_boolean(fields, "multiple", False),
            "maxSelections": _get_integer(fields, "maxSelections", 1),
            "options": _get_string_array(fields, "options"),
            "order": _get_integer(fields, "order", 999999),
            "active": _get_boolean(fields, "active", True),
            "isPinned": _get_boolean(fields, "isPinned", False),
            "createdAt": _get_timestamp(fields, "createdAt"),
            "updatedAt": _get_timestamp(fields, "updatedAt"),
            "startAt": _get_timestamp(fields, "startAt"),
            "endAt": _get_timestamp(fields, "endAt"),
        }

        print(
            "PARSED ISSUE |",
            "id:", item["id"],
            "| title:", item["title"],
            "| type:", item["type"],
            "| status:", item["status"],
            "| active:", item["active"],
            "| pinned:", item["isPinned"],
        )

        results.append(item)

    print("DEBUG parsed issues count:", len(results))
    return results