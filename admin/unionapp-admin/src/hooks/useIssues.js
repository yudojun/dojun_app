import { useEffect, useMemo, useState } from "react";
import {
  createIssue,
  updateIssue,
  archiveIssue as archiveIssueService,
  restoreIssue as restoreIssueService,
  hardDeleteIssue as hardDeleteIssueService,
  changeIssueStatus as changeIssueStatusService,
  reorderIssues,
} from "../services/issueService";

export const STATUS_OPTIONS = [
  { value: "draft", label: "작성중" },
  { value: "review", label: "검토중" },
  { value: "open", label: "모바일 공개" },
  { value: "closed", label: "종료" },
  { value: "archived", label: "보관" },
];

export function formatStatus(value) {
  const map = {
    draft: "작성중",
    review: "검토중",
    open: "모바일 공개",
    closed: "종료",
    archived: "보관",
  };
  return map[value] || value || "-";
}

export function statusBadgeStyle(value) {
  const map = {
    draft: { background: "#f3f4f6", color: "#374151" },
    review: { background: "#fef3c7", color: "#92400e" },
    open: { background: "#dbeafe", color: "#1d4ed8" },
    closed: { background: "#e5e7eb", color: "#374151" },
    archived: { background: "#fee2e2", color: "#b91c1c" },
  };
  return map[value] || map.draft;
}

export function formatType(value) {
  const map = {
    notice: "공지",
    vote: "투표",
    survey: "설문",
  };
  return map[value] || value || "-";
}

export function typeBadgeStyle(value) {
  const map = {
    notice: { background: "#e0f2fe", color: "#0369a1" },
    vote: { background: "#ede9fe", color: "#6d28d9" },
    survey: { background: "#dcfce7", color: "#15803d" },
  };
  return map[value] || map.notice;
}

const DEFAULT_FORM = {
  type: "notice",
  title: "",
  summary: "",
  content: "",
  category: "",
  status: "draft",

  // v3: UI에서 제거, 저장 시 자동 처리
  scope: "",

  isPinned: false,
  resultVisibility: "after_close",
  imageUrl: "",
  company: "",
  union: "",

  // vote / survey
  question: "",
  options: "",
  startAt: "",
  endAt: "",
  multiple: false,
  anonymous: true,
  allowEdit: false,
  maxSelections: "",

  // private only
  internalMemo: "",
  reviewComment: "",
};

function getAutoScope(tab) {
  return tab === "private" ? "비공개" : "전체";
}

function inferTabFromIssue(issue) {
  if (issue?.sourceTab === "private") return "private";
  if (issue?.sourceTab === "public") return "public";
  if (issue?.scope === "비공개") return "private";
  return "public";
}

function normalizeOptions(raw) {
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v).trim()).filter(Boolean);
  }

  return String(raw || "")
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

function buildIssuePayload(form, tab, uid, order = 1) {
  const autoScope = getAutoScope(tab);

  const payload = {
    type: form.type || "notice",
    title: String(form.title || "").trim(),
    summary: String(form.summary || "").trim(),
    content: String(form.content || "").trim(),
    category: String(form.category || "").trim() || "general",
    status: form.status || "draft",
    scope: autoScope,
    resultVisibility: form.resultVisibility || "after_close",
    isPinned: !!form.isPinned,
    imageUrl: String(form.imageUrl || "").trim(),
    company: String(form.company || "").trim(),
    union: String(form.union || "").trim(),
    updatedBy: uid,
    active: (form.status || "draft") !== "archived",
    order: Number.isFinite(Number(form.order)) ? Number(form.order) : order,
  };

  if (form.type === "vote" || form.type === "survey") {
    payload.options = normalizeOptions(form.options);
    payload.startAt = form.startAt || null;
    payload.endAt = form.endAt || null;
    payload.multiple = !!form.multiple;
    payload.maxSelections = form.multiple
      ? Math.max(1, Number(form.maxSelections || 1))
      : 1;
  } else {
    payload.options = [];
    payload.startAt = null;
    payload.endAt = null;
    payload.multiple = false;
    payload.maxSelections = 1;
  }

  return payload;
}

export function isVisibleOnMobile(issue) {
  if (!issue) return false;

  const scope = issue.scope || "전체";
  const type = issue.type || "notice";
  const status = issue.status || "draft";

  if (scope === "비공개") return false;

  if (type === "notice") {
    return status === "open" || status === "closed";
  }

  if (type === "vote" || type === "survey") {
    return status === "open";
  }

  return false;
}

export function formatMobileVisibility(issue) {
  return isVisibleOnMobile(issue) ? "모바일 공개" : "모바일 비공개";
}

export default function useIssues({
  enabled = true,
  actorUid = "",
  currentUser = null,
  issues = [],
}) {
  const [tab, setTab] = useState("public");

  const [form, setForm] = useState({
    ...DEFAULT_FORM,
    scope: getAutoScope("public"),
  });

  const [editingId, setEditingId] = useState(null);
  const [editingSourceTab, setEditingSourceTab] = useState("public");
  const [isCreating, setIsCreating] = useState(false);
  const [savingIssue, setSavingIssue] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  const [showTrash, setShowTrash] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reordering, setReordering] = useState(false);

  const uid = actorUid || currentUser?.uid || "admin";

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      scope: getAutoScope(tab),
    }));
  }, [tab]);

  const visibleIssues = useMemo(() => {
    let list = Array.isArray(issues) ? [...issues] : [];

    list = list.filter(
      (issue) => (issue.sourceTab || inferTabFromIssue(issue)) === tab
    );

    list = list.filter((issue) => {
      const archived = issue.status === "archived";
      return showTrash ? archived : !archived;
    });

    if (statusFilter !== "all") {
      list = list.filter((issue) => issue.status === statusFilter);
    }

    const q = searchText.trim().toLowerCase();
    if (q) {
      list = list.filter((issue) => {
        const target = [
          issue.title,
          issue.summary,
          issue.content,
          issue.category,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return target.includes(q);
      });
    }

    list.sort((a, b) => {
      const ao = Number(a.order ?? 999999);
      const bo = Number(b.order ?? 999999);
      return ao - bo;
    });

    return list;
  }, [issues, tab, showTrash, statusFilter, searchText]);

  const selectedIssue = useMemo(() => {
    return (
      visibleIssues.find(
        (issue) => (issue.docId || issue.id) === selectedIssueId
      ) || null
    );
  }, [visibleIssues, selectedIssueId]);

  const createTargetTab = tab;

  const getIssueSourceTab = (issueId) => {
    const target = issues.find(
      (issue) => (issue.docId || issue.id) === issueId
    );
    return target?.sourceTab || inferTabFromIssue(target) || tab;
  };

  const moveIssueUp = async (issueId) => {
    if (!enabled) throw new Error("현재 순서를 변경할 수 없는 상태입니다.");
    if (!uid) throw new Error("사용자 UID가 없습니다.");

    const targetTab = getIssueSourceTab(issueId);
    const ordered = visibleIssues.filter(
      (issue) => (issue.sourceTab || inferTabFromIssue(issue)) === targetTab
    );

    const index = ordered.findIndex(
      (issue) => (issue.docId || issue.id) === issueId
    );

    if (index <= 0) return;

    const next = [...ordered];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];

    const normalized = next.map((issue, idx) => ({
      ...issue,
      order: idx + 1,
    }));

    setReordering(true);
    try {
      await reorderIssues(targetTab, normalized, uid);
    } catch (error) {
      console.error("위로 이동 실패:", error);
      throw error;
    } finally {
      setReordering(false);
    }
  };

const moveIssueDown = async (issueId) => {
  if (!enabled) throw new Error("현재 순서를 변경할 수 없는 상태입니다.");
  if (!uid) throw new Error("사용자 UID가 없습니다.");

  const targetTab = getIssueSourceTab(issueId);
  const ordered = visibleIssues.filter(
    (issue) => (issue.sourceTab || inferTabFromIssue(issue)) === targetTab
  );

  const index = ordered.findIndex(
    (issue) => (issue.docId || issue.id) === issueId
  );

  if (index < 0 || index >= ordered.length - 1) return;

  const next = [...ordered];
  [next[index], next[index + 1]] = [next[index + 1], next[index]];

  const normalized = next.map((issue, idx) => ({
    ...issue,
    order: idx + 1,
  }));

  setReordering(true);
  try {
    await reorderIssues(targetTab, normalized, uid);
  } catch (error) {
    console.error("아래로 이동 실패:", error);
    throw error;
  } finally {
    setReordering(false);
  }
};
  const resetForm = () => {
    setForm({
      ...DEFAULT_FORM,
      scope: getAutoScope(tab),
    });
    setEditingId(null);
    setEditingSourceTab(tab);
    setIsCreating(false);
  };

  const cancelEdit = () => {
    resetForm();
  };

  const startCreate = () => {
    const nextOrder =
      visibleIssues.length > 0
        ? Math.max(...visibleIssues.map((issue) => Number(issue.order || 0))) + 1
        : 1;

    setForm({
      ...DEFAULT_FORM,
      scope: getAutoScope(tab),
      order: nextOrder,
    });
    setEditingId(null);
    setEditingSourceTab(tab);
    setIsCreating(true);
  };

  const startEdit = (issue) => {
    if (!enabled || !issue) return;

    const safeId = issue.docId || issue.id;

    setIsCreating(false);
    setEditingId(safeId);
    setEditingSourceTab(issue.sourceTab || inferTabFromIssue(issue) || tab);
    setSelectedIssueId(safeId);

    setForm({
      type: issue.type || "notice",
      title: issue.title || "",
      summary: issue.summary || "",
      content: issue.content || "",
      category: issue.category || "general",
      scope: issue.scope || getAutoScope(tab),
      status: issue.status || "draft",
      startAt: issue.startAt || null,
      endAt: issue.endAt || null,
      resultVisibility: issue.resultVisibility || "after_close",
      isPinned: Boolean(issue.isPinned),
      imageUrl: issue.imageUrl || "",
      company: issue.company || "",
      union: issue.union || "",
      options: Array.isArray(issue.options) ? issue.options : [],
      multiple: Boolean(issue.multiple),
      maxSelections: Number(issue.maxSelections || 1),
      active: Boolean(issue.active ?? true),
      order: Number(issue.order || 1),
    });
  };

  const saveNewIssue = async () => {
    if (!enabled) throw new Error("현재 저장할 수 없는 상태입니다.");
    if (!uid) throw new Error("사용자 UID가 없습니다.");

    setSavingIssue(true);
    try {
      const payload = buildIssuePayload(form, tab, uid, visibleIssues.length + 1);
      await createIssue(tab, payload, uid);
      resetForm();
    } catch (error) {
      console.error("안건 생성 실패:", error);
      throw error;
    } finally {
      setSavingIssue(false);
    }
  };

  const saveEdit = async () => {
    if (!enabled) throw new Error("현재 저장할 수 없는 상태입니다.");
    if (!editingId) return;
    if (!uid) throw new Error("사용자 UID가 없습니다.");

    setSavingIssue(true);
    try {
      const currentOrder =
        Number(form.order) ||
        Number(
          visibleIssues.find(
            (issue) => (issue.docId || issue.id) === editingId
          )?.order || 1
        );

      const payload = buildIssuePayload(
        form,
        editingSourceTab,
        uid,
        currentOrder
      );

      await updateIssue(editingSourceTab, editingId, payload, uid);
      resetForm();
    } catch (error) {
      console.error("안건 수정 실패:", error);
      throw error;
    } finally {
      setSavingIssue(false);
    }
  };

  const archiveIssue = async (issueId) => {
    if (!enabled) throw new Error("현재 보관할 수 없는 상태입니다.");
    if (!uid) throw new Error("사용자 UID가 없습니다.");

    setSavingIssue(true);
    try {
      const targetTab = getIssueSourceTab(issueId);
      await archiveIssueService(targetTab, issueId, uid);
    } catch (error) {
      console.error("안건 보관 실패:", error);
      throw error;
    } finally {
      setSavingIssue(false);
    }
  };

  const restoreIssue = async (issueId) => {
    if (!enabled) throw new Error("현재 복구할 수 없는 상태입니다.");
    if (!uid) throw new Error("사용자 UID가 없습니다.");

    setSavingIssue(true);
    try {
      const targetTab = getIssueSourceTab(issueId);
      await restoreIssueService(targetTab, issueId, uid);
    } catch (error) {
      console.error("안건 복구 실패:", error);
      throw error;
    } finally {
      setSavingIssue(false);
    }
  };

  const hardDeleteIssue = async (issueId) => {
    if (!enabled) throw new Error("현재 삭제할 수 없는 상태입니다.");

    setSavingIssue(true);
    try {
      const targetTab = getIssueSourceTab(issueId);
      await hardDeleteIssueService(targetTab, issueId);
    } catch (error) {
      console.error("안건 영구 삭제 실패:", error);
      throw error;
    } finally {
      setSavingIssue(false);
    }
  };

  const handleChangeIssueStatus = async (issueId, nextStatus) => {
    if (!enabled) throw new Error("현재 상태를 변경할 수 없는 상태입니다.");
    if (!uid) throw new Error("사용자 UID가 없습니다.");

    setSavingIssue(true);
    try {
      const targetTab = getIssueSourceTab(issueId);
      await changeIssueStatusService(targetTab, issueId, nextStatus, uid);
    } catch (error) {
      console.error("안건 상태 변경 실패:", error);
      throw error;
    } finally {
      setSavingIssue(false);
    }
  };

  const normalizeIssueOrders = async () => {
    if (!enabled) throw new Error("현재 순서를 정리할 수 없는 상태입니다.");
    if (!uid) throw new Error("사용자 UID가 없습니다.");

    setReordering(true);
    try {
      const normalized = visibleIssues.map((issue, index) => ({
        ...issue,
        order: index + 1,
      }));

      await reorderIssues(tab, normalized, uid);
    } catch (error) {
      console.error("안건 순서 재정렬 실패:", error);
      throw error;
    } finally {
      setReordering(false);
    }
  };

  return {
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
    moveIssueUp,
    moveIssueDown,
  };
}