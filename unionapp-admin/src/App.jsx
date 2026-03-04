import { useEffect, useMemo, useState } from "react";
import { auth, db } from "./firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

const COL_PUBLIC = "issues_public";
const COL_PRIVATE = "issues_private";

export default function App() {
  const [user, setUser] = useState(null);

  // login form
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  // UI state
  const [tab, setTab] = useState("public"); // "public" | "private"
  const activeCol = tab === "public" ? COL_PUBLIC : COL_PRIVATE;

  // data
  const [issues, setIssues] = useState([]);

  // editing
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    summary: "",
    company: "",
    union: "",
    order: 1,
  });

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // realtime subscribe
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, activeCol), orderBy("order", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setIssues(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.log("READ ERROR:", err.code, err.message);
        alert(`읽기 실패: ${err.code}`);
      }
    );

    return () => unsub();
  }, [user, activeCol]);

  async function login(e) {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, pw);
    } catch (err) {
      console.log("LOGIN ERROR:", err.code, err.message);
      alert(`로그인 실패: ${err.code}`);
    }
  }

  async function logout() {
    await signOut(auth);
  }

  function startEdit(it) {
    setEditingId(it.id);
    setForm({
      title: it.title || "",
      summary: it.summary || "",
      company: it.company || "",
      union: it.union || "",
      order: it.order ?? 1,
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id) {
    if (!form.title.trim()) {
      alert("제목은 필수야");
      return;
    }

    try {
      await updateDoc(doc(db, activeCol, id), {
        title: form.title,
        summary: form.summary,
        company: form.company,
        union: form.union,
        order: Number(form.order) || 1,
        updated_at: serverTimestamp(),
      });
      setEditingId(null);
    } catch (err) {
      console.log("UPDATE ERROR:", err.code, err.message);
      alert(`저장 실패: ${err.code}`);
    }
  }

  async function removeIssue(id) {
    if (!confirm("정말 삭제할까?")) return;
    try {
      await deleteDoc(doc(db, activeCol, id));
    } catch (err) {
      console.log("DELETE ERROR:", err.code, err.message);
      alert(`삭제 실패: ${err.code}`);
    }
  }

  async function addIssue(targetTab) {
    const targetCol = targetTab === "public" ? COL_PUBLIC : COL_PRIVATE;

    const title = prompt(targetTab === "public" ? "공개 쟁점 제목" : "비공개 쟁점 제목");
    if (!title) return;

    try {
      await addDoc(collection(db, targetCol), {
        title,
        summary: "",
        company: "",
        union: "",
        order: Date.now(), // 임시 정렬값 (나중에 숫자로 정리 가능)
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    } catch (err) {
      console.log("ADD ERROR:", err.code, err.message);
      alert(`추가 실패: ${err.code}`);
    }
  }

  const tabTitle = useMemo(() => {
    return tab === "public" ? "공개 쟁점" : "비공개 쟁점";
  }, [tab]);

  // ---------- 로그인 화면 ----------
  if (!user) {
    return (
      <div style={{ maxWidth: 420, margin: "50px auto", padding: 12 }}>
        <h2>unionapp 관리자 로그인</h2>
        <form onSubmit={login}>
          <input
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 10 }}
          />
          <button style={{ width: "100%", padding: 10 }}>로그인</button>
        </form>
      </div>
    );
  }

  // ---------- 메인 화면 ----------
  return (
    <div style={{ maxWidth: 920, margin: "30px auto", padding: 12 }}>
      <h2>로그인 성공</h2>
      <div style={{ color: "#555" }}>UID: {user.uid}</div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={logout}>로그아웃</button>

        <button onClick={() => addIssue("public")}>+ 공개 쟁점 추가</button>
        <button onClick={() => addIssue("private")}>+ 비공개 쟁점 추가</button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button
            onClick={() => setTab("public")}
            style={{
              fontWeight: tab === "public" ? 800 : 400,
              opacity: tab === "public" ? 1 : 0.6,
            }}
          >
            공개
          </button>
          <button
            onClick={() => setTab("private")}
            style={{
              fontWeight: tab === "private" ? 800 : 400,
              opacity: tab === "private" ? 1 : 0.6,
            }}
          >
            비공개
          </button>
        </div>
      </div>

      <h3 style={{ marginTop: 18 }}>쟁점 목록 ({tabTitle})</h3>

      {issues.length === 0 ? (
        <p style={{ color: "#777" }}>
          현재 문서가 없습니다. (또는 권한/규칙 문제)
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {issues.map((it) => {
            const isEditing = editingId === it.id;

            return (
              <div
                key={it.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 12,
                  padding: 14,
                  background: "#fff",
                }}
              >
                {!isEditing ? (
                  <>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>
                      {it.title || "(제목 없음)"}
                    </div>
                    <div style={{ color: "#666", marginTop: 6 }}>
                      요약: {it.summary || ""}
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <b>회사안</b>: {it.company || ""}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <b>조합안</b>: {it.union || ""}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: "#888" }}>
                      order: {it.order ?? "(없음)"} / id: {it.id}
                    </div>

                    <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                      <button onClick={() => startEdit(it)}>편집</button>
                      <button onClick={() => removeIssue(it.id)}>삭제</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
                      편집 중
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      <input
                        placeholder="제목"
                        value={form.title}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, title: e.target.value }))
                        }
                        style={{ padding: 10 }}
                      />
                      <input
                        placeholder="요약"
                        value={form.summary}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, summary: e.target.value }))
                        }
                        style={{ padding: 10 }}
                      />
                      <textarea
                        placeholder="회사안"
                        value={form.company}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, company: e.target.value }))
                        }
                        rows={3}
                        style={{ padding: 10 }}
                      />
                      <textarea
                        placeholder="조합안"
                        value={form.union}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, union: e.target.value }))
                        }
                        rows={3}
                        style={{ padding: 10 }}
                      />

                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <label>순서(order)</label>
                        <input
                          type="number"
                          value={form.order}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              order: Number(e.target.value),
                            }))
                          }
                          style={{ width: 140, padding: 10 }}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                      <button onClick={() => saveEdit(it.id)}>저장</button>
                      <button onClick={cancelEdit}>취소</button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}