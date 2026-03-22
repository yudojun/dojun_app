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

    list = list.filter((issue) => inferTabFromIssue(issue) === tab);

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
    return visibleIssues.find((issue) => issue.id === selectedIssueId) || null;
  }, [visibleIssues, selectedIssueId]);

  const createTargetTab = tab;

  const resetForm = () => {
    setForm({
      ...DEFAULT_FORM,
      scope: getAutoScope(tab),
    });
    setEditingId(null);
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
    setIsCreating(true);
  };

  const startEdit = (issue) => {
    if (!issue) return;

    setIsCreating(false);
    setEditingId(issue.id);

    setForm({
      type: issue.type || "notice",
      title: issue.title || "",
      summary: issue.summary || "",
      content: issue.content || "",
      category: issue.category || "",
      status: issue.status || "draft",

      // v3 정책:
      // 수정 화면에서도 기존 scope 유지보다
      // 현재 탭 기준 정규화를 우선한다.
      scope: getAutoScope(tab),

      isPinned: !!issue.isPinned,
      resultVisibility: issue.resultVisibility || "after_close",
      imageUrl: issue.imageUrl || "",
      company: issue.company || "",
      union: issue.union || "",
      question: issue.question || "",
      options: Array.isArray(issue.options)
        ? issue.options.join("\n")
        : issue.options || "",
      startAt: issue.startAt || "",
      endAt: issue.endAt || "",
      multiple: !!issue.multiple,
      anonymous: issue.anonymous ?? true,
      allowEdit: !!issue.allowEdit,
      maxSelections: issue.maxSelections ?? "",
      order: issue.order ?? "",
      internalMemo: issue.internalMemo || "",
      reviewComment: issue.reviewComment || "",
    });
  };

  const saveNewIssue = async () => {
    if (!enabled) throw new Error("현재 저장할 수 없는 상태입니다.");

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

    setSavingIssue(true);
    try {
      const currentOrder =
        Number(form.order) ||
        Number(
          visibleIssues.find((issue) => issue.id === editingId)?.order || 1
        );

      const payload = buildIssuePayload(form, tab, uid, currentOrder);
      await updateIssue(tab, editingId, payload, uid);
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
    try {
      await archiveIssueService(tab, issueId, uid);
    } catch (error) {
      console.error("안건 보관 실패:", error);
      throw error;
    }
  };

  const restoreIssue = async (issueId) => {
    if (!enabled) throw new Error("현재 복구할 수 없는 상태입니다.");
    try {
      await restoreIssueService(tab, issueId, uid);
    } catch (error) {
      console.error("안건 복구 실패:", error);
      throw error;
    }
  };

  const hardDeleteIssue = async (issueId) => {
    if (!enabled) throw new Error("현재 삭제할 수 없는 상태입니다.");
    try {
      await hardDeleteIssueService(tab, issueId);
    } catch (error) {
      console.error("안건 영구 삭제 실패:", error);
      throw error;
    }
  };

  const handleChangeIssueStatus = async (issueId, nextStatus) => {
    if (!enabled) throw new Error("현재 상태를 변경할 수 없는 상태입니다.");
    try {
      await changeIssueStatusService(tab, issueId, nextStatus, uid);
    } catch (error) {
      console.error("안건 상태 변경 실패:", error);
      throw error;
    }
  };

  const normalizeIssueOrders = async () => {
    if (!enabled) throw new Error("현재 순서를 정리할 수 없는 상태입니다.");

    setReordering(true);
    try {
      const normalized = visibleIssues.map((issue, index) => ({
        ...issue,
        order: index + 1,
      }));

      console.log(
      "normalizeIssueOrders normalized full:",
      JSON.stringify(
        normalized.map((it, index) => ({
          index,
          id: it.id,
          docId: it.docId,
          displayId: it.displayId,
          title: it.title,
          status: it.status,
          order: it.order,
        })),
        null,
        2
      )
    );
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
  };
}