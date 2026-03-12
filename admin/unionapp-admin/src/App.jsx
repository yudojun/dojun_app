import { useCallback, useState } from "react";
import IssueListPanel from "./components/IssueListPanel";
import VoteDashboard from "./components/VoteDashboard";
import Toast from "./components/Toast";
import ConfirmDialog from "./components/ConfirmDialog";
import useAdminAuth from "./hooks/useAdminAuth";
import useIssues, {
  STATUS_OPTIONS,
  formatStatus,
  statusBadgeStyle,
} from "./hooks/useIssues";
import useVoteStats from "./hooks/useVoteStats";
import useConfirm from "./hooks/useConfirm";
import { ui } from "./styles/ui";

const MEMBER_COUNT = 700;

export default function App() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [toasts, setToasts] = useState([]);

  const { user, authLoading, adminOK, adminDoc, login, logout } = useAdminAuth();

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
    softDeleteIssue,
    restoreIssue,
    hardDeleteIssue,
    handleChangeIssueStatus,
  } = useIssues({
    enabled: !!user && adminOK === true,
  });

  const { stats, statsLoading, resetVoteStats, setStats } = useVoteStats({
    enabled: !!user && adminOK === true,
    selectedIssueId,
  });

  const { confirmState, askConfirm, closeConfirm, handleConfirm } = useConfirm();

  const tabTitle = tab === "public" ? "공개 쟁점" : "비공개 쟁점";

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
      pushToast("로그아웃 완료", "info");
    } catch (err) {
      console.log("LOGOUT ERROR:", err.code, err.message);
      pushToast(`로그아웃 실패: ${err.code}`, "error");
    }
  }

  function handleResetVoteStats(issueId) {
    if (!issueId) return;

    askConfirm({
      title: "집계 초기화",
      message: "정말 이 쟁점의 투표 집계를 0으로 초기화할까?",
      confirmText: "초기화",
      cancelText: "취소",
      danger: true,
      onConfirm: async () => {
        try {
          await resetVoteStats(issueId);
          pushToast("vote_stats 초기화 완료", "success");
        } catch (err) {
          console.log("RESET STATS ERROR:", err.code, err.message);
          pushToast(`초기화 실패: ${err.code}`, "error");
        }
      },
    });
  }

  function handleSoftDeleteIssue(id) {
    askConfirm({
      title: "문서 삭제",
      message: "정말 삭제할까? 이 작업은 문서를 숨김 처리합니다.",
      confirmText: "삭제",
      cancelText: "취소",
      danger: true,
      onConfirm: async () => {
        try {
          await softDeleteIssue(id);

          if (selectedIssueId === id) {
            setSelectedIssueId(null);
            setStats({ yes: 0, no: 0, hold: 0, total: 0 });
          }

          pushToast("문서가 휴지통으로 이동됐어", "success");
        } catch (err) {
          console.log("SOFT DELETE ERROR:", err.code, err.message);
          pushToast(`삭제 실패: ${err.code}`, "error");
        }
      },
    });
  }

  function handleRestoreIssue(id) {
    askConfirm({
      title: "문서 복구",
      message: "이 문서를 복구할까?",
      confirmText: "복구",
      cancelText: "취소",
      onConfirm: async () => {
        try {
          await restoreIssue(id);
          pushToast("복구 완료", "success");
        } catch (err) {
          console.log("RESTORE ERROR:", err.code, err.message);
          pushToast(`복구 실패: ${err.code}`, "error");
        }
      },
    });
  }

  function handleHardDeleteIssue(id) {
    askConfirm({
      title: "영구 삭제",
      message: "정말 영구 삭제할까? 이건 되돌리기 어렵다.",
      confirmText: "영구 삭제",
      cancelText: "취소",
      danger: true,
      onConfirm: async () => {
        try {
          await hardDeleteIssue(id);
          pushToast("영구 삭제 완료", "warning");
        } catch (err) {
          console.log("HARD DELETE ERROR:", err.code, err.message);
          pushToast(`영구 삭제 실패: ${err.code}`, "error");
        }
      },
    });
  }

  function handleNormalizeIssueOrders() {
    askConfirm({
      title: "순서 재정렬",
      message: `현재 ${tab === "public" ? "공개" : "비공개"} ${
        showTrash ? "휴지통" : "목록"
      }의 순서를 1부터 다시 정리할까?`,
      confirmText: "정리",
      cancelText: "취소",
      onConfirm: async () => {
        try {
          await normalizeIssueOrders();
          pushToast("순서 재정렬 완료", "success");
        } catch (err) {
          console.log("REORDER ERROR:", err.code, err.message);
          pushToast(`순서 재정렬 실패: ${err.code}`, "error");
        }
      },
    });
  }

  async function handleSaveEdit() {
    try {
      await saveEdit();
      pushToast("수정 저장 완료", "success");
    } catch {
      pushToast("수정 저장 실패", "error");
    }
  }

  async function handleSaveNewIssue() {
    try {
      await saveNewIssue();
      pushToast("새 쟁점 추가 완료", "success");
    } catch {
      pushToast("쟁점 추가 실패", "error");
    }
  }

  async function handleIssueStatusChange(id, nextStatus) {
    try {
      await handleChangeIssueStatus(id, nextStatus);
      pushToast("상태 변경 완료", "success");
    } catch {
      pushToast("상태 변경 실패", "error");
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
        <ConfirmDialog
          open={confirmState.open}
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmState.confirmText}
          cancelText={confirmState.cancelText}
          danger={confirmState.danger}
          onConfirm={handleConfirm}
          onCancel={closeConfirm}
        />
      </>
    );
  }

  if (adminOK === null) {
    return (
      <>
        <div style={ui.statusPage}>
          <h2>관리자 권한 확인 중...</h2>
          <div style={ui.uidText}>UID: {user.uid}</div>
        </div>

        <Toast items={toasts} onRemove={removeToast} />
        <ConfirmDialog
          open={confirmState.open}
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmState.confirmText}
          cancelText={confirmState.cancelText}
          danger={confirmState.danger}
          onConfirm={handleConfirm}
          onCancel={closeConfirm}
        />
      </>
    );
  }

  if (adminOK === false) {
    return (
      <>
        <div style={ui.statusPage}>
          <h2>권한 없음</h2>
          <div style={ui.uidText}>UID: {user.uid}</div>
          <p style={{ marginTop: 16, color: "#b00" }}>
            admins/{user.uid} 문서가 없거나, active=true / role="admin"이 아닙니다.
          </p>
          <button onClick={handleLogout}>로그아웃</button>
        </div>

        <Toast items={toasts} onRemove={removeToast} />
        <ConfirmDialog
          open={confirmState.open}
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmState.confirmText}
          cancelText={confirmState.cancelText}
          danger={confirmState.danger}
          onConfirm={handleConfirm}
          onCancel={closeConfirm}
        />
      </>
    );
  }

  return (
    <>
      <div style={ui.page}>
        <h2>unionapp 관리자</h2>
        <div style={ui.uidText}>UID: {user.uid}</div>
        <div style={ui.metaText}>
          관리자: {adminDoc?.name || "(이름 없음)"} / role: {adminDoc?.role || "?"}
        </div>

        <div style={ui.toolbar}>
          <button onClick={handleLogout}>로그아웃</button>
          <button onClick={() => startCreate("public")}>+ 공개 쟁점 추가</button>
          <button onClick={() => startCreate("private")}>+ 비공개 쟁점 추가</button>
          <button
            onClick={handleNormalizeIssueOrders}
            disabled={reordering || visibleIssues.length === 0}
          >
            {reordering ? "순서 정리 중..." : `${tab === "public" ? "공개" : "비공개"} 순서 정리`}
          </button>
          <button onClick={() => setShowTrash((p) => !p)}>
            {showTrash ? "기본 목록 보기" : "휴지통 보기"}
          </button>

          <div style={ui.tabGroup}>
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

        <div style={ui.filterGrid}>
          <input
            placeholder="제목 / 요약 / 회사안 / 조합안 검색"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={ui.input}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={ui.input}
          >
            <option value="all">모든 상태</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontWeight: 700,
              color: "#334155",
            }}
          >
            {showTrash ? "휴지통 모드" : `${tabTitle} 목록`}
          </div>
        </div>

        <div style={ui.mainGrid}>
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
            onSoftDelete={handleSoftDeleteIssue}
            onRestore={handleRestoreIssue}
            onHardDelete={handleHardDeleteIssue}
            onChangeStatus={handleIssueStatusChange}
            onSelectIssue={setSelectedIssueId}
            savingIssue={savingIssue}
            statusOptions={STATUS_OPTIONS}
            formatStatus={formatStatus}
            statusBadgeStyle={statusBadgeStyle}
          />

          <VoteDashboard
            selectedIssueId={selectedIssueId}
            selectedIssue={selectedIssue}
            stats={stats}
            statsLoading={statsLoading}
            memberCount={MEMBER_COUNT}
            onResetVoteStats={handleResetVoteStats}
            formatStatus={formatStatus}
            statusBadgeStyle={statusBadgeStyle}
          />
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
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
      />
    </>
  );
}