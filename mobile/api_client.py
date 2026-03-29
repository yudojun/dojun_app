import requests

PROJECT_ID = "unionapp-27bbd"
ISSUES_COLLECTION = "issues_public"


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


def fetch_public_issues(id_token: str):
    if not id_token:
        raise PermissionError("로그인 토큰이 없습니다.")

    url = (
        "https://firestore.googleapis.com/v1/"
        f"projects/{PROJECT_ID}/databases/(default)/documents/{ISSUES_COLLECTION}"
    )
    headers = {"Authorization": f"Bearer {id_token}"}

    r = requests.get(url, headers=headers, timeout=15)

    print("fetch_public_issues status:", r.status_code)
    print("fetch_public_issues url:", r.url)

    if r.status_code == 401:
        raise PermissionError("401 인증 만료: 다시 로그인 필요")
    if r.status_code == 403:
        raise PermissionError("403 권한 거부: issues_public 읽기 권한 확인 필요")

    r.raise_for_status()

    payload = r.json()
    docs = payload.get("documents", []) or []

    def s(fields, key, default=""):
        return (fields.get(key) or {}).get("stringValue", default)

    def b(fields, key, default=False):
        return (fields.get(key) or {}).get("booleanValue", default)

    def i(fields, key, default=0):
        raw = (fields.get(key) or {}).get("integerValue")
        try:
            return int(raw)
        except Exception:
            return default

    def ts(fields, key):
        return (fields.get(key) or {}).get("timestampValue", "")

    def arr(fields, key):
        values = ((fields.get(key) or {}).get("arrayValue") or {}).get("values", [])
        result = []
        for item in values:
            if "stringValue" in item:
                result.append(item.get("stringValue", ""))
        return result

    results = []

    for doc in docs:
        name = doc.get("name", "")
        issue_id = name.split("/")[-1] if name else ""
        fields = doc.get("fields", {}) or {}

        results.append(
            {
                "id": issue_id,
                "title": s(fields, "title"),
                "summary": s(fields, "summary"),
                "content": s(fields, "content"),
                "category": s(fields, "category"),
                "scope": s(fields, "scope"),
                "status": s(fields, "status", "draft"),
                "type": s(fields, "type", "notice"),
                "resultVisibility": s(fields, "resultVisibility", "public"),
                "company": s(fields, "company"),
                "union": s(fields, "union"),
                "multiple": b(fields, "multiple", False),
                "maxSelections": i(fields, "maxSelections", 1),
                "options": arr(fields, "options"),
                "startAt": ts(fields, "startAt"),
                "endAt": ts(fields, "endAt"),
                "createdAt": ts(fields, "createdAt"),
                "updatedAt": ts(fields, "updatedAt"),
                "imageUrl": s(fields, "imageUrl", ""),
                "active": b(fields, "active", True),
                "isPinned": b(fields, "isPinned", False),
                "order": i(fields, "order", 999999),
            }
        )

    return results