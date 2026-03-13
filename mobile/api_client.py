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


def fetch_public_issues(id_token):
    url = (
        f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}"
        f"/databases/(default)/documents/{COLLECTION}"
    )
    headers = {"Authorization": f"Bearer {id_token}"}

    r = requests.get(url, headers=headers)
    r.raise_for_status()

    data = r.json()
    documents = data.get("documents", []) or []
    results = []

    for doc in documents:
        fields = doc.get("fields", {}) or {}
        doc_name = doc.get("name", "") or ""
        doc_id = doc_name.split("/")[-1] if doc_name else ""

        print("DEBUG field keys:", doc_id, list(fields.keys()))
        raw_type = fields.get("type")
        print("DEBUG raw type field:", raw_type)

        title = _get_string(fields, "title")
        summary = _get_string(fields, "summary")
        company = _get_string(fields, "company")
        union = _get_string(fields, "union")
        scope = _get_string(fields, "scope", "전체") or "전체"
        issue_type = _get_string(fields, "type", "vote") or "vote"
        status = _get_string(fields, "status", "open") or "open"
        image_url = _get_string(fields, "imageUrl", "")
        category = _get_string(fields, "category", "")
        result_visibility = _get_string(fields, "resultVisibility", "public")
        multiple = _get_boolean(fields, "multiple", False)
        max_selections = _get_integer(fields, "maxSelections", 1)
        options = _get_string_array(fields, "options")
        order = _get_integer(fields, "order", 0)
        updated_at = _get_timestamp(fields, "updated_at")
        start_at = _get_timestamp(fields, "startAt")
        end_at = _get_timestamp(fields, "endAt")

        item = {
            "id": doc_id,
            "title": title,
            "summary": summary,
            "company": company,
            "union": union,
            "scope": scope,
            "type": issue_type,
            "status": status,
            "imageUrl": image_url,
            "category": category,
            "resultVisibility": result_visibility,
            "multiple": multiple,
            "maxSelections": max_selections,
            "options": options,
            "order": order,
            "updated_at": updated_at,
            "startAt": start_at,
            "endAt": end_at,
        }

        results.append(item)

        print(
            "DEBUG doc:",
            item["id"],
            "| title:",
            repr(item["title"]),
            "| type:",
            repr(item["type"]),
            "| status:",
            repr(item["status"]),
            "| options:",
            item["options"],
        )

    print("DEBUG parsed issues count:", len(results))
    return results