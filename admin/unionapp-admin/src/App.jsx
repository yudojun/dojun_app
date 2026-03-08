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
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

const COL_PUBLIC = "issues_public";
const COL_PRIVATE = "issues_private";
const COL_ADMINS = "admins";
const COL_VOTE_STATS = "vote_stats";
const MEMBER_COUNT = 700; // ✅ 도준 조합원 수

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function pct(part, total) {
  if (!total || total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function StatRow({ label, value, percent }) {
  // percent: 0~100
  const w = clamp(percent, 0, 100);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 90px", gap: 10, alignItems: "center" }}>
      <div style={{ fontWeight: 700 }}>{label}</div>

      <div style={{ background: "#eee", borderRadius: 8, height: 14, overflow: "hidden" }}>
        <div style={{ width: `${w}%`, height: "100%", background: "#2d8cff" }} />
      </div>

      <div style={{ textAlign: "right", color: "#444" }}>
        {value} ({w}%)
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  // login form
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  // admin check
  const [adminOK, setAdminOK] = useState(false);
  const [adminDoc, setAdminDoc] = useState(null);

  // UI state
  const [tab, setTab] = useState("public"); // "public" | "private"
  const activeCol = tab === "public" ? COL_PUBLIC : COL_PRIVATE;

  // issues data
  const [issues, setIssues] = useState([]);

  // selected issue for dashboard
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);

  // vote stats (realtime)
  const [stats, setStats] = useState({ yes: 0, no: 0, hold: 0, total: 0 });
  const [statsLoading, setStatsLoading] = useState(false);

  // editing
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    summary: "",
    company: "",
    union: "",
    scope: "전체", // ✅ scope도 관리자에서 관리 가능하게
    order: 1,
  });

  // auth watch
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // admin doc check
  useEffect(() => {
    if (!user) {
      setAdminOK(false);
      setAdminDoc(null);
      return;
    }

    (async () => {
      try {
        const ref = doc(db, COL_ADMINS, user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          console.log("ADMIN DOC NOT FOUND:", user.uid);
          setAdminOK(false);
          setAdminDoc(null);
          return;
        }
        const data = snap.data();
        const ok = data?.active === true && data?.role === "admin";
        setAdminOK(ok);
        setAdminDoc({ id: snap.id, ...data });
      } catch (err) {
        console.log("ADMIN DOC READ ERROR:", err.code, err.message);
        setAdminOK(false);
        setAdminDoc(null);
      }
    })();
  }, [user]);

  // realtime issues subscribe (admin only)
  useEffect(() => {
    if (!user || !adminOK) return;

    const q = query(collection(db, activeCol), orderBy("order", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setIssues(rows);

        // 선택 쟁점 유지(가능하면)
        if (selectedIssueId) {
          const found = rows.find((x) => x.id === selectedIssueId);
          setSelectedIssue(found || null);
        } else {
          // 첫 항목 자동 선택
          if (rows.length > 0) {
            setSelectedIssueId(rows[0].id);
            setSelectedIssue(rows[0]);
          } else {
            setSelectedIssueId(null);
            setSelectedIssue(null);
          }
        }
      },
      (err) => {
        console.log("ISSUES READ ERROR:", err.code, err.message);
        alert(`쟁점 읽기 실패: ${err.code}`);
      }
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, adminOK, activeCol]);

  // realtime vote_stats subscribe (selected issue)
  useEffect(() => {
    if (!user || !adminOK) return;
    if (!selectedIssueId) return;

    setStatsLoading(true);

    const ref = doc(db, COL_VOTE_STATS, selectedIssueId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setStats({ yes: 0, no: 0, hold: 0, total: 0 });
          setStatsLoading(false);
          return;
        }
        const d = snap.data() || {};
        setStats({
          yes: Number(d.yes || 0),
          no: Number(d.no || 0),
          hold: Number(d.hold || 0),
          total: Number(d.total || 0),
        });
        setStatsLoading(false);
      },
      (err) => {
        console.log("VOTE_STATS READ ERROR:", err.code, err.message);
        setStats({ yes: 0, no: 0, hold: 0, total: 0 });
        setStatsLoading(false);
      }
    );

    return () => unsub();
  }, [user, adminOK, selectedIssueId]);

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
      scope: it.scope || "전체",
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
        scope: form.scope || "전체",
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
      // 대시보드 선택이 삭제 대상이면 초기화
      if (selectedIssueId === id) {
        setSelectedIssueId(null);
        setSelectedIssue(null);
        setStats({ yes: 0, no: 0, hold: 0, total: 0 });
      }
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
      const now = Date.now();
      await addDoc(collection(db, targetCol), {
        title,
        summary: "",
        company: "",
        union: "",
        scope: targetTab === "public" ? "전체" : "비공개",
        order: now, // 임시 정렬값
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    } catch (err) {
      console.log("ADD ERROR:", err.code, err.message);
      alert(`추가 실패: ${err.code}`);
    }
  }

  // ✅ (옵션) 투표 집계 초기화: vote_stats/{issueId}를 0으로 세팅
  // 주의: votes(ballots)까지 지우려면 Cloud Functions 또는 관리자 서버가 필요함.
  async function resetVoteStats(issueId) {
    if (!issueId) return;
    if (!confirm("정말 이 쟁점의 투표 집계를 0으로 초기화할까?")) return;

    try {
      await setDoc(doc(db, COL_VOTE_STATS, issueId), {
        yes: 0,
        no: 0,
        hold: 0,
        total: 0,
        updated_at: serverTimestamp(),
      }, { merge: true });

      alert("vote_stats 초기화 완료");
    } catch (err) {
      console.log("RESET STATS ERROR:", err.code, err.message);
      alert(`초기화 실패: ${err.code}`);
    }
  }

  const tabTitle = useMemo(() => (tab === "public" ? "공개 쟁점" : "비공개 쟁점"), [tab]);

  const participation = useMemo(() => {
    const t = Number(stats.total || 0);
    if (!MEMBER_COUNT || MEMBER_COUNT <= 0) return 0;
    return Math.round((t / MEMBER_COUNT) * 1000) / 10; // 소수 1자리
  }, [stats.total]);

  const yesPct = useMemo(() => pct(stats.yes, stats.total), [stats.yes, stats.total]);
  const noPct = useMemo(() => pct(stats.no, stats.total), [stats.no, stats.total]);
  const holdPct = useMemo(() => pct(stats.hold, stats.total), [stats.hold, stats.total]);

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

  // ---------- 관리자 권한 없으면 차단 ----------
  if (!adminOK) {
    return (
      <div style={{ maxWidth: 720, margin: "40px auto", padding: 12 }}>
        <h2>권한 없음</h2>
        <div style={{ color: "#555", marginTop: 8 }}>UID: {user.uid}</div>
        <p style={{ marginTop: 16, color: "#b00" }}>
          admins/{user.uid} 문서가 없거나, active=true / role="admin"이 아닙니다.
        </p>
        <button onClick={logout}>로그아웃</button>
      </div>
    );
  }

  // ---------- 메인 화면 ----------
  return (
    <div style={{ maxWidth: 1100, margin: "30px auto", padding: 12 }}>
      <h2>로그인 성공</h2>
      <div style={{ color: "#555" }}>UID: {user.uid}</div>
      <div style={{ color: "#777", marginTop: 4 }}>
        관리자: {adminDoc?.name || "(이름 없음)"} / role: {adminDoc?.role || "?"}
      </div>

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

      {/* ✅ 2컬럼 레이아웃: 왼쪽 목록 / 오른쪽 대시보드 */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16, marginTop: 18 }}>
        {/* ===================== 왼쪽: 쟁점 목록 ===================== */}
        <div>
          <h3>쟁점 목록 ({tabTitle})</h3>

          {issues.length === 0 ? (
            <p style={{ color: "#777" }}>현재 문서가 없습니다. (또는 권한/규칙 문제)</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {issues.map((it) => {
                const isEditing = editingId === it.id;
                const isSelected = selectedIssueId === it.id;

                return (
                  <div
                    key={it.id}
                    style={{
                      border: isSelected ? "2px solid #2d8cff" : "1px solid #ddd",
                      borderRadius: 12,
                      padding: 14,
                      background: "#fff",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setSelectedIssueId(it.id);
                      setSelectedIssue(it);
                    }}
                  >
                    {!isEditing ? (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ fontWeight: 800, fontSize: 18 }}>
                            {it.title || "(제목 없음)"}
                          </div>
                          <div style={{ marginLeft: "auto", fontSize: 12, color: "#888" }}>
                            id: {it.id}
                          </div>
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
                        <div style={{ marginTop: 6 }}>
                          <b>scope</b>: {it.scope || "전체"}
                        </div>
                        <div style={{ marginTop: 8, fontSize: 12, color: "#888" }}>
                          order: {it.order ?? "(없음)"}
                        </div>

                        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                          <button onClick={(e) => { e.stopPropagation(); startEdit(it); }}>
                            편집
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); removeIssue(it.id); }}>
                            삭제
                          </button>
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
                            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                            style={{ padding: 10 }}
                          />
                          <input
                            placeholder="요약"
                            value={form.summary}
                            onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
                            style={{ padding: 10 }}
                          />
                          <textarea
                            placeholder="회사안"
                            value={form.company}
                            onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                            rows={3}
                            style={{ padding: 10 }}
                          />
                          <textarea
                            placeholder="조합안"
                            value={form.union}
                            onChange={(e) => setForm((p) => ({ ...p, union: e.target.value }))}
                            rows={3}
                            style={{ padding: 10 }}
                          />

                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <label style={{ fontWeight: 700 }}>scope</label>
                            <select
                              value={form.scope}
                              onChange={(e) => setForm((p) => ({ ...p, scope: e.target.value }))}
                              style={{ padding: 10 }}
                            >
                              <option value="전체">전체</option>
                              <option value="회사안">회사안</option>
                              <option value="조합안">조합안</option>
                              <option value="비공개">비공개</option>
                            </select>

                            <label style={{ marginLeft: 8, fontWeight: 700 }}>order</label>
                            <input
                              type="number"
                              value={form.order}
                              onChange={(e) => setForm((p) => ({ ...p, order: Number(e.target.value) }))}
                              style={{ width: 160, padding: 10 }}
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

        {/* ===================== 오른쪽: 투표 대시보드 ===================== */}
        <div>
          <h3>투표 대시보드</h3>

          {!selectedIssueId ? (
            <div style={{ padding: 14, border: "1px solid #ddd", borderRadius: 12, background: "#fff" }}>
              쟁점을 선택하면 투표 현황이 표시됩니다.
            </div>
          ) : (
            <div style={{ padding: 14, border: "1px solid #ddd", borderRadius: 12, background: "#fff" }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>
                {selectedIssue?.title || "선택된 쟁점"}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#888" }}>
                issueId: {selectedIssueId}
              </div>

              <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: "#f7f9ff" }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>참여</div>
                <div style={{ marginTop: 6, fontSize: 14, color: "#333" }}>
                  총 참여: <b>{stats.total}</b> / 조합원: <b>{MEMBER_COUNT}</b>
                </div>
                <div style={{ marginTop: 4, color: "#333" }}>
                  참여율: <b>{participation}%</b>
                </div>
                {statsLoading && <div style={{ marginTop: 8, color: "#777" }}>집계 로딩 중…</div>}
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 900, marginBottom: 10 }}>투표 그래프</div>
                <div style={{ display: "grid", gap: 10 }}>
                  <StatRow label="찬성" value={stats.yes} percent={yesPct} />
                  <StatRow label="반대" value={stats.no} percent={noPct} />
                  <StatRow label="보류" value={stats.hold} percent={holdPct} />
                </div>
              </div>

              <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => resetVoteStats(selectedIssueId)}>
                  (옵션) 집계 초기화
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "#777", lineHeight: 1.5 }}>
                ※ “집계 초기화”는 vote_stats만 0으로 되돌립니다. <br />
                ballots(votes/{`{issueId}`}/ballots)까지 완전 삭제는 운영 안전상 Cloud Functions/서버에서 처리하는 걸 추천.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}