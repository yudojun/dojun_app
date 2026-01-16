from fastapi import FastAPI
import firebase_admin
from firebase_admin import credentials, firestore
from pydantic import BaseModel
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import secrets

security = HTTPBasic()

templates = Jinja2Templates(directory="server/templates")


class IssueCreate(BaseModel):
    title: str
    summary: str = ""
    company: str = ""
    union_opt: str = ""
    order: int = 0


class IssueUpdate(BaseModel):
    title: str
    summary: str
    company: str
    union_opt: str
    order: int


app = FastAPI()

# Firebase 초기화
cred = credentials.Certificate("server/firebase_key.json")
firebase_admin.initialize_app(cred)
db = firestore.client()


def admin_auth(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = "*ydj"
    correct_password = "301004"  # 나중에 반드시 바꿔라

    is_user_ok = secrets.compare_digest(credentials.username, correct_username)
    is_pass_ok = secrets.compare_digest(credentials.password, correct_password)

    if not (is_user_ok and is_pass_ok):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 실패",
            headers={"WWW-Authenticate": "Basic"},
        )

    return credentials.username


@app.get("/admin", response_class=HTMLResponse)
def admin_page(request: Request, user: str = Depends(admin_auth)):
    return templates.TemplateResponse("admin.html", {"request": request, "user": user})


@app.get("/issues")
def get_issues():
    docs = db.collection("issues").order_by("order").stream()
    results = []

    for d in docs:
        data = d.to_dict()
        results.append(
            {
                "id": d.id,  # 👈 추가!
                "title": data.get("title", ""),
                "summary": data.get("summary", ""),
                "company": data.get("company", ""),
                "union": data.get("union_opt", ""),
            }
        )

    return results


@app.post("/issues")
def create_issue(issue: IssueCreate):
    print("🔥 POST /issues 호출됨")
    print("🔥 받은 데이터:", issue)

    doc_ref = db.collection("issues").document()

    doc_ref.set(
        {
            "title": issue.title,
            "summary": issue.summary,
            "company": issue.company,
            "union_opt": issue.union_opt,
            "order": issue.order,
            "updated_at": datetime.utcnow(),
        }
    )

    print("🔥 Firestore set() 실행 완료, id =", doc_ref.id)

    return {"status": "ok", "id": doc_ref.id}


@app.delete("/issues/{issue_id}")
def delete_issue(issue_id: str):
    doc_ref = db.collection("issues").document(issue_id)
    doc = doc_ref.get()

    if not doc.exists:
        return {"error": "not found"}

    doc_ref.delete()
    return {"result": "deleted"}


@app.put("/issues/{issue_id}")
def update_issue(issue_id: str, issue: IssueUpdate):
    ref = db.collection("issues").document(issue_id)

    if not ref.get().exists:
        return {"error": "not found"}

    ref.update(
        {
            "title": issue.title,
            "summary": issue.summary,
            "company": issue.company,
            "union_opt": issue.union_opt,
            "order": issue.order,
            "updated_at": datetime.now(),
        }
    )

    return {"result": "updated"}
