import requests

API_BASE = "http://127.0.0.1:8000"  # 나중에 서버 IP로 변경


def fetch_issues():
    try:
        r = requests.get(f"{API_BASE}/issues", timeout=5)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print("❌ API 호출 실패:", e)
        return []
