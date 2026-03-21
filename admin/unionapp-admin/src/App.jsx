import { useCallback, useEffect, useMemo, useState } from "react";
import IssueListPanel from "./components/IssueListPanel";
import VoteDashboard from "./components/VoteDashboard";
import Toast from "./components/Toast";
import ConfirmDialog from "./components/ConfirmDialog";
import useAdminAuth from "./hooks/useAdminAuth";
import useIssues, {
  STATUS_OPTIONS,
  formatStatus,
  statusBadgeStyle,
  formatType,
  typeBadgeStyle,
} from "./hooks/useIssues";
import useVoteStats from "./hooks/useVoteStats";
import useConfirm from "./hooks/useConfirm";
import { ui } from "./styles/ui";
import { subscribeIssues } from "./services/issueService";

const MEMBER_COUNT = 700;
const MOBILE_BREAKPOINT = 900;

export default function App() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [toasts, setToasts] = useState([]);

  const [publicIssues, setPublicIssues] = useState([]);
  const [privateIssues, setPrivateIssues] = useState([]);

  // ✅ 모바일 반응형 상태
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= MOBILE_BREAKPOINT;
  });

  // ✅ 모바일에서 투표 대시보드 접기/펼치기
  const [showDashboardMobile, setShowDashboardMobile] = useState(false);

  const {
    user,
    authLoading,
    adminOK,
    adminDoc,
    isEditor,
    isSuperAdmin,
    login,
    logout,
  } = useAdminAuth();

  useEffect(() => {
    if (!user || adminOK !== true) {
      setPublicIssues([]);
      setPrivateIssues([]);
      return;
    }

    const unsubPublic = subscribeIssues(
      "public",
      (rows) => setPublicIssues(rows),
      (err) => console.error("PUBLIC ISSUES SUBSCRIBE ERROR:", err)
    );

    const unsubPrivate = subscribeIssues(
      "private",
      (rows) => setPrivateIssues(rows),
      (err) => console.error("PRIVATE ISSUES SUBSCRIBE ERROR:", err)
    );

    return () => {
      if (typeof unsubPublic === "function") unsubPublic();
      if (typeof unsubPrivate === "function") unsubPrivate();
    };
  }, [user, adminOK]);

  // ✅ 화면 폭 감지
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const allIssues = useMemo(
    () => [...publicIssues, ...privateIssues],
    [publicIssues, privateIssues]
  );

  const {
    tab,
    setTab,
    visibleIssues,
    selectedIssueId,
    setSelectedIssueId,
    selectedIssue,
    editingId,
    isCreating,
    createTargetTab,
    form,
    setForm,
    reordering,
    savingIssue,
    showTrash,
    setShowTrash,
    searchText,
    setSearchText,
    statusFilter,
    setStatusFilter,
    startCreate,
    startEdit,
    cancelEdit,
    saveEdit,
    saveNewIssue,
    normalizeIssueOrders,
    archiveIssue,
    restoreIssue,
    hardDeleteIssue,
    handleChangeIssueStatus,
  } = useIssues({
    enabled: !!user && adminOK === true,
    actorUid: user?.uid || "",
    issues: allIssues,
  });

  const { stats, statsLoading, setStats } = useVoteStats({
    enabled: !!user && adminOK === true,
    selectedIssueId,
  });

  const { confirmState, askConfirm, closeConfirm, handleConfirm } = useConfirm();

  const tabTitle = tab === "public" ? "공개 안건" : "내부 안건";
  const isBusy = savingIssue || reordering;

  // ✅ 모바일에서 생성/수정 중에는 대시보드 자동 숨김
  useEffect(() => {
    if (isMobile && (isCreating || editingId)) {
      setShowDashboardMobile(false);
    }
  }, [isMobile, isCreating, editingId]);

  // ✅ 모바일에서 안건 선택 시 대시보드 펼칠지 여부는 사용자에게 맡김
  // 필요하면 아래처럼 자동 오픈도 가능
  // useEffect(() => {
  //   if (isMobile && selectedIssueId) setShowDashboardMobile(true);
  // }, [isMobile, selectedIssueId]);

  const pushToast = useCallback((message, type = "info", duration = 2500) => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  async function handleLogin(e) {
    e.preventDefault();

    try {
      await login(email, pw);
      pushToast("로그인 성공", "success");
    } catch (err) {
      console.log("LOGIN ERROR:", err.code, err.message);
      pushToast(`로그인 실패: ${err.code}`, "error");
    }
  }

  async function handleLogout() {
    try {
      await logout();
      setEmail("");
      setPw("");
      pushToast("로그아웃 완료", "info");
    } catch (err) {
      console.log("LOGOUT ERROR:", err.code, err.message);
      pushToast(`로그아웃 실패: ${err.code}`, "error");
    }
  }

  function handleArchiveIssue(id) {
    askConfirm({
      title: "안건 보관",
      message: "이 안건을 보관할까?",
      confirmText: "보관",
      cancelText: "취소",
      onConfirm: async () => {
        try {
          await archiveIssue(id);
          pushToast("보관 완료", "success");
        } catch (err) {
          console.log("ARCHIVE ERROR:", err?.code, err?.message);
          pushToast(err?.message || "보관 실패", "error");
        }
      },
    });
  }

  function handleRestoreIssue(id) {
    askConfirm({
      title: "안건 복구",
      message: "이 안건을 다시 복구할까?",
      confirmText: "복구",
      cancelText: "취소",
      onConfirm: async () => {
        try {
          await restoreIssue(id);
          pushToast("복구 완료", "success");
        } catch (err) {
          console.log("RESTORE ERROR:", err?.code, err?.message);
          pushToast(err?.message || "복구 실패", "error");
        }
      },
    });
  }

  function handleHardDeleteIssue(id) {
    askConfirm({
      title: "영구 삭제",
      message: "이건 super_admin만 해야 한다.",
      confirmText: "영구 삭제",
      cancelText: "취소",
      danger: true,
      onConfirm: async () => {
        try {
          await hardDeleteIssue(id);

          if (selectedIssueId === id) {
            setSelectedIssueId(null);
            setStats({ yes: 0, no: 0, hold: 0, total: 0 });
          }

          pushToast("영구 삭제 완료", "warning");
        } catch (err) {
          console.log("HARD DELETE ERROR:", err?.code, err?.message);
          pushToast(
            `영구 삭제 실패: ${err?.code || err?.message || "unknown"}`,
            "error"
          );
        }
      },
    });
  }

  function handleNormalizeIssueOrders() {
    askConfirm({
      title: "순번 정리",
      message: `현재 ${tab === "public" ? "공개" : "내부"} ${
        showTrash ? "보관함" : "목록"
      }의 표시 순번을 1부터 다시 정리할까?`,
      confirmText: "정리",
      cancelText: "취소",
      onConfirm: async () => {
        try {
          await normalizeIssueOrders();
          pushToast("순번 정리 완료", "success");
        } catch (err) {
          console.log("REORDER ERROR:", err?.code, err?.message);
          pushToast(
            `순번 정리 실패: ${err?.code || err?.message || "unknown"}`,
            "error"
          );
        }
      },
    });
  }

  async function handleSaveEdit() {
    try {
      await saveEdit();
      pushToast("안건 저장 완료", "success");
    } catch (err) {
      console.log("SAVE EDIT ERROR:", err?.code, err?.message);
      pushToast(err?.message || "안건 저장 실패", "error");
    }
  }

  async function handleSaveNewIssue() {
    try {
      await saveNewIssue();
      pushToast("새 안건 추가 완료", "success");
    } catch (err) {
      console.log("SAVE NEW ISSUE ERROR:", err?.code, err?.message);
      pushToast(err?.message || "안건 추가 실패", "error");
    }
  }

  async function handleIssueStatusChange(id, nextStatus) {
    try {
      await handleChangeIssueStatus(id, nextStatus);
      pushToast("상태 변경 완료", "success");
    } catch (err) {
      console.log("STATUS CHANGE ERROR:", err?.code, err?.message);
      pushToast(err?.message || "상태 변경 실패", "error");
    }
  }

  if (authLoading) {
    return (
      <div style={ui.statusPage}>
        <h2>로그인 상태 확인 중...</h2>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div style={ui.authPage}>
          <h2>unionapp 관리자 로그인</h2>
          <form onSubmit={handleLogin}>
            <input
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ ...ui.input, marginBottom: 10 }}
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              style={{ ...ui.input, marginBottom: 10 }}
            />
            <button style={{ width: "100%", padding: 10 }}>로그인</button>
          </form>
        </div>
        <Toast items={toasts} onRemove={removeToast} />
      </>
    );
  }

  if (adminOK === null) {
    return (
      <div style={ui.statusPage}>
        <h2>관리자 권한 확인 중...</h2>
      </div>
    );
  }

  if (adminOK === false) {
    return (
      <>
        <div style={ui.statusPage}>
          <h2>권한 없음</h2>
          <div style={ui.uidText}>UID: {user.uid}</div>
          <button onClick={handleLogout}>로그아웃</button>
        </div>
        <Toast items={toasts} onRemove={removeToast} />
      </>
    );
  }

  const layoutStyle = isMobile
    ? {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 14,
        marginTop: 18,
      }
    : ui.layout;

  const mobileDashboardVisible = !isMobile || showDashboardMobile;

  return (
    <>
      <div
        style={{
          ...ui.page,
          height: isMobile ? "100vh" : "auto",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* ✅ 상단 고정 영역 */}
      <div
        style={{
          position: isMobile ? "sticky" : "static",
          top: 0,
          zIndex: 50,
          background: "#f8fafc",
          paddingBottom: isMobile ? 8 : 12,
          paddingTop: isMobile ? 4 : 0,
          borderBottom: isMobile ? "1px solid #e5e7eb" : "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: isMobile ? "flex-start" : "center",
            justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: isMobile ? 26 : 40,
                lineHeight: 1.15,
                fontWeight: 900,
                color: "#1f344d",
              }}
            >
              unionapp 관리자
            </h2>

            <div
              style={{
                marginTop: 6,
                fontSize: isMobile ? 13 : 16,
                color: "#64748b",
                lineHeight: 1.4,
              }}
            >
              UID: {user.uid}
            </div>

            <div
              style={{
                marginTop: 2,
                fontSize: isMobile ? 13 : 16,
                color: "#64748b",
                lineHeight: 1.4,
              }}
            >
              관리자: {adminDoc?.displayName || adminDoc?.name || "(이름 없음)"} / role:{" "}
              {adminDoc?.role || "?"}
            </div>
          </div>

          {!isMobile && (
            <button onClick={handleLogout} style={ui.button}>
              로그아웃
            </button>
          )}
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button
            onClick={() => setTab("public")}
            style={tab === "public" ? ui.activeTabButton : ui.tabButton}
          >
            공개 안건
          </button>

          <button
            onClick={() => setTab("private")}
            style={tab === "private" ? ui.activeTabButton : ui.tabButton}
          >
            내부 안건
          </button>

          <button onClick={() => setShowTrash((prev) => !prev)} style={ui.button}>
            {showTrash ? "보관함 숨기기" : "보관함 보기"}
          </button>

          <button
            onClick={startCreate}
            style={ui.primaryButton}
            disabled={isBusy || !isEditor}
          >
            + 안건 추가
          </button>

          <button onClick={handleNormalizeIssueOrders} style={ui.button} disabled={isBusy}>
            순번 정리
          </button>

          {isMobile && (
            <button onClick={handleLogout} style={ui.button}>
              로그아웃
            </button>
          )}
        </div>

        <div
          style={{
            marginTop: 10,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 150px" : "1fr 180px",
            gap: 8,
            alignItems: "center",
          }}
        >
          <input
            placeholder="제목 / 요약 / 카테고리 검색"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              ...ui.input,
              padding: isMobile ? 10 : 12,
              fontSize: isMobile ? 15 : 16,
            }}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              ...ui.select,
              padding: isMobile ? 10 : 12,
              fontSize: isMobile ? 15 : 16,
            }}
          >
            <option value="all">전체 상태</option>
            {STATUS_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {isMobile && (
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => setShowDashboardMobile((prev) => !prev)}
              style={{
                ...ui.button,
                padding: "8px 12px",
                fontSize: 15,
              }}
            >
              {showDashboardMobile ? "대시보드 숨기기" : "대시보드 보기"}
            </button>
          </div>
        )}
      </div>

        {/* ✅ 아래 스크롤 영역 */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            paddingTop: 16,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {isMobile ? (
            <div style={{ display: "grid", gap: 14 }}>
              {showDashboardMobile && (
                <div style={ui.rightPane}>
                  <VoteDashboard
                    selectedIssueId={selectedIssueId}
                    selectedIssue={selectedIssue}
                    stats={stats}
                    statsLoading={statsLoading}
                    memberCount={MEMBER_COUNT}
                    formatStatus={formatStatus}
                    statusBadgeStyle={statusBadgeStyle}
                  />
                </div>
              )}

              <div style={ui.leftPane}>
                <IssueListPanel
                  tab={tab}
                  tabTitle={tabTitle}
                  showTrash={showTrash}
                  visibleIssues={visibleIssues}
                  selectedIssueId={selectedIssueId}
                  editingId={editingId}
                  isCreating={isCreating}
                  createTargetTab={createTargetTab}
                  form={form}
                  setForm={setForm}
                  onSaveNewIssue={handleSaveNewIssue}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={cancelEdit}
                  onStartEdit={startEdit}
                  onArchive={handleArchiveIssue}
                  onRestore={handleRestoreIssue}
                  onHardDelete={handleHardDeleteIssue}
                  onChangeStatus={handleIssueStatusChange}
                  onSelectIssue={setSelectedIssueId}
                  savingIssue={savingIssue}
                  statusOptions={STATUS_OPTIONS}
                  formatStatus={formatStatus}
                  statusBadgeStyle={statusBadgeStyle}
                  formatType={formatType}
                  typeBadgeStyle={typeBadgeStyle}
                  canCreateOrEdit={isEditor}
                  canHardDelete={isSuperAdmin}
                />
              </div>
            </div>
          ) : (
            <div style={ui.layout}>
              <div style={ui.leftPane}>
                <IssueListPanel
                  tab={tab}
                  tabTitle={tabTitle}
                  showTrash={showTrash}
                  visibleIssues={visibleIssues}
                  selectedIssueId={selectedIssueId}
                  editingId={editingId}
                  isCreating={isCreating}
                  createTargetTab={createTargetTab}
                  form={form}
                  setForm={setForm}
                  onSaveNewIssue={handleSaveNewIssue}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={cancelEdit}
                  onStartEdit={startEdit}
                  onArchive={handleArchiveIssue}
                  onRestore={handleRestoreIssue}
                  onHardDelete={handleHardDeleteIssue}
                  onChangeStatus={handleIssueStatusChange}
                  onSelectIssue={setSelectedIssueId}
                  savingIssue={savingIssue}
                  statusOptions={STATUS_OPTIONS}
                  formatStatus={formatStatus}
                  statusBadgeStyle={statusBadgeStyle}
                  formatType={formatType}
                  typeBadgeStyle={typeBadgeStyle}
                  canCreateOrEdit={isEditor}
                  canHardDelete={isSuperAdmin}
                />
              </div>

              <div style={ui.rightPane}>
                <VoteDashboard
                  selectedIssueId={selectedIssueId}
                  selectedIssue={selectedIssue}
                  stats={stats}
                  statsLoading={statsLoading}
                  memberCount={MEMBER_COUNT}
                  formatStatus={formatStatus}
                  statusBadgeStyle={statusBadgeStyle}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <Toast items={toasts} onRemove={removeToast} />
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        danger={confirmState.danger}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
      />
    </>
  );
}