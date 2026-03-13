import { useEffect, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import {
  archiveIssue as archiveIssueService,
  changeIssueStatus,
  createIssue,
  hardDeleteIssue as hardDeleteIssueService,
  reorderIssues,
  restoreIssue as restoreIssueService,
  subscribeIssues,
  updateIssue,
} from "../services/issueService";

export const STATUS_OPTIONS = [
  { value: "draft", label: "작성중" },
  { value: "review", label: "검토중" },
  { value: "open", label: "진행중" },
  { value: "closed", label: "종료" },
  { value: "archived", label: "보관" },
];

export const TYPE_OPTIONS = [
  { value: "notice", label: "공지" },
  { value: "vote", label: "투표" },
  { value: "survey", label: "설문" },
];

export const RESULT_VISIBILITY_OPTIONS = [
  { value: "public", label: "항상 공개" },
  { value: "after_close", label: "종료 후 공개" },
  { value: "admin_only", label: "관리자만" },
];

function parseOptions(text) {
  return String(text || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function stringifyOptions(options) {
  return Array.isArray(options) ? options.join("\n") : "";
}

function createEmptyForm(tab = "public", order = 1) {
  return {
    type: "notice",
    title: "",
    summary: "",
    content: "",
    category: "general",
    scope: tab === "public" ? "전체" : "비공개",
    status: "draft",
    startAt: "",
    endAt: "",
    resultVisibility: "after_close",
    isPinned: false,
    imageUrl: "",
    company: "",
    union: "",
    optionsText: "",
    multiple: false,
    maxSelections: 1,
    order,
    active: true,
  };
}

export function formatStatus(status) {
  const found = STATUS_OPTIONS.find((x) => x.value === status);
  return found ? found.label : status || "-";
}

export function formatType(type) {
  const found = TYPE_OPTIONS.find((x) => x.value === type);
  return found ? found.label : type || "-";
}

export function statusBadgeStyle(status) {
  const map = {
    draft: { bg: "#f3f4f6", color: "#374151" },
    review: { bg: "#ede9fe", color: "#5b21b6" },
    open: { bg: "#e0f2fe", color: "#075985" },
    closed: { bg: "#fef3c7", color: "#92400e" },
    archived: { bg: "#e5e7eb", color: "#4b5563" },
  };

  const picked = map[status] || map.draft;

  return {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    background: picked.bg,
    color: picked.color,
    fontWeight: 800,
    fontSize: 12,
  };
}

export function typeBadgeStyle(type) {
  const map = {
    notice: { bg: "#dbeafe", color: "#1d4ed8" },
    vote: { bg: "#dcfce7", color: "#166534" },
    survey: { bg: "#fef3c7", color: "#92400e" },
  };

  const picked = map[type] || map.notice;

  return {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    background: picked.bg,
    color: picked.color,
    fontWeight: 800,
    fontSize: 12,
  };
}

function toFirestoreTimestamp(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("날짜 형식이 올바르지 않아");
  }

  return Timestamp.fromDate(date);
}

function validateForm(form) {
  const type = form.type || "notice";
  const title = String(form.title || "").trim();
  const content = String(form.content || "").trim();
  const options = parseOptions(form.optionsText);
  const startAt = form.startAt ? new Date(form.startAt).getTime() : null;
  const endAt = form.endAt ? new Date(form.endAt).getTime() : null;
  const maxSelections = Number(form.maxSelections || 1);

  if (!title) {
    throw new Error("제목은 필수야");
  }

  if (type === "notice" && !content) {
    throw new Error("공지는 본문이 필요해");
  }

  if ((type === "vote" || type === "survey") && options.length < 2) {
    throw new Error("투표/설문 옵션은 최소 2개 이상 필요해");
  }

  if (
    startAt !== null &&
    endAt !== null &&
    Number.isFinite(startAt) &&
    Number.isFinite(endAt) &&
    startAt > endAt
  ) {
    throw new Error("종료일시는 시작일시보다 빠를 수 없어");
  }

  if (type === "survey" && form.multiple) {
    if (maxSelections < 2) {
      throw new Error("복수 선택 설문은 최대 선택 수가 2 이상이어야 해");
    }

    if (maxSelections > options.length) {
      throw new Error("최대 선택 수는 옵션 수를 넘을 수 없어");
    }
  }
}

function normalizePayloadFromForm(form, fallbackTab) {
  const type = form.type || "notice";
  const parsedOptions = parseOptions(form.optionsText);
  const scopeFallback = fallbackTab === "public" ? "전체" : "비공개";
  const trimmedCategory = String(form.category || "").trim() || "general";

  const startAtTs = toFirestoreTimestamp(form.startAt);
  const endAtTs = toFirestoreTimestamp(form.endAt);

  if (type === "notice") {
    return {
      type: "notice",
      title: String(form.title || "").trim(),
      summary: String(form.summary || "").trim(),
      content: String(form.content || "").trim(),
      category: trimmedCategory,
      scope: form.scope || scopeFallback,
      status: form.status || "draft",
      startAt: startAtTs,
      endAt: endAtTs,
      resultVisibility: "public",
      isPinned: Boolean(form.isPinned),
      imageUrl: String(form.imageUrl || "").trim(),
      company: "",
      union: "",
      options: [],
      multiple: false,
      maxSelections: 1,
      order: Number(form.order) || 1,
      active: form.status === "archived" ? false : true,
    };
  }

  if (type === "vote") {
    return {
      type: "vote",
      title: String(form.title || "").trim(),
      summary: String(form.summary || "").trim(),
      content: "",
      category: trimmedCategory,
      scope: form.scope || scopeFallback,
      status: form.status || "draft",
      startAt: startAtTs,
      endAt: endAtTs,
      resultVisibility: form.resultVisibility || "after_close",
      isPinned: Boolean(form.isPinned),
      imageUrl: "",
      company: String(form.company || "").trim(),
      union: String(form.union || "").trim(),
      options: parsedOptions,
      multiple: false,
      maxSelections: 1,
      order: Number(form.order) || 1,
      active: form.status === "archived" ? false : true,
    };
  }

  return {
    type: "survey",
    title: String(form.title || "").trim(),
    summary: String(form.summary || "").trim(),
    content: "",
    category: trimmedCategory,
    scope: form.scope || scopeFallback,
    status: form.status || "draft",
    startAt: startAtTs,
    endAt: endAtTs,
    resultVisibility: form.resultVisibility || "after_close",
    isPinned: Boolean(form.isPinned),
    imageUrl: "",
    company: "",
    union: "",
    options: parsedOptions,
    multiple: Boolean(form.multiple),
    maxSelections: form.multiple ? Number(form.maxSelections || 1) : 1,
    order: Number(form.order) || 1,
    active: form.status === "archived" ? false : true,
  };
}

export default function useIssues({ enabled, actorUid }) {
  const [tab, setTab] = useState("public");
  const [issues, setIssues] = useState([]);
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createTargetTab, setCreateTargetTab] = useState("public");
  const [pendingCreateTab, setPendingCreateTab] = useState(null);

  const [form, setForm] = useState(createEmptyForm("public", 1));

  const [reordering, setReordering] = useState(false);
  const [savingIssue, setSavingIssue] = useState(false);
  const [showTrash, setShowTrash] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const isBusy = savingIssue || reordering;

  const activeIssues = useMemo(() => {
    return issues.filter((it) => it.active !== false && it.status !== "archived");
  }, [issues]);

  const archivedIssues = useMemo(() => {
    return issues.filter((it) => it.active === false || it.status === "archived");
  }, [issues]);

  const selectedIssue = useMemo(() => {
    return activeIssues.find((x) => x.id === selectedIssueId) || null;
  }, [activeIssues, selectedIssueId]);

  const nextOrder = useMemo(() => {
    const numbers = activeIssues
      .map((it) => Number(it.order))
      .filter((n) => Number.isFinite(n) && n > 0 && n < 1000000);

    if (numbers.length === 0) return 1;
    return Math.max(...numbers) + 1;
  }, [activeIssues]);

  const visibleIssues = useMemo(() => {
    const base = showTrash ? archivedIssues : activeIssues;
    const q = searchText.trim().toLowerCase();

    return base.filter((it) => {
      const matchesSearch =
        !q ||
        String(it.title || "").toLowerCase().includes(q) ||
        String(it.summary || "").toLowerCase().includes(q) ||
        String(it.content || "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" ? true : (it.status || "draft") === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [activeIssues, archivedIssues, showTrash, searchText, statusFilter]);

  function resetForm(targetTab = tab, order = nextOrder) {
    setForm(createEmptyForm(targetTab, order));
  }

  useEffect(() => {
    if (!enabled) return;

    const unsub = subscribeIssues(
      tab,
      (rows) => {
        setIssues(rows);

        const liveRows = rows.filter((x) => x.active !== false && x.status !== "archived");

        setSelectedIssueId((prev) => {
          if (liveRows.length === 0) return null;
          if (prev && liveRows.some((x) => x.id === prev)) return prev;
          return liveRows[0].id;
        });
      },
      (err) => {
        console.log("ISSUES READ ERROR:", err.code, err.message);
      }
    );

    return () => unsub();
  }, [enabled, tab]);

  useEffect(() => {
    setEditingId(null);
    setIsCreating(false);
    setShowTrash(false);
    setPendingCreateTab(null);
    resetForm(tab, 1);
  }, [tab]);

  useEffect(() => {
    if (!pendingCreateTab) return;
    if (tab !== pendingCreateTab) return;

    setCreateTargetTab(pendingCreateTab);
    setIsCreating(true);
    setEditingId(null);
    setShowTrash(false);
    resetForm(pendingCreateTab, nextOrder);
    setPendingCreateTab(null);
  }, [tab, pendingCreateTab, nextOrder]);

  function startCreate(targetTab) {
    if (isBusy) return;

    setPendingCreateTab(targetTab);

    if (tab !== targetTab) {
      setTab(targetTab);
      return;
    }

    setCreateTargetTab(targetTab);
    setIsCreating(true);
    setEditingId(null);
    setShowTrash(false);
    resetForm(targetTab, nextOrder);
    setPendingCreateTab(null);
  }

  function startEdit(it) {
    if (isBusy) return;

    setPendingCreateTab(null);
    setIsCreating(false);
    setShowTrash(false);
    setSelectedIssueId(it.id);
    setEditingId(it.id);
    setForm({
      type: it.type || "notice",
      title: it.title || "",
      summary: it.summary || "",
      content: it.content || "",
      category: it.category || "general",
      scope: it.scope || (tab === "public" ? "전체" : "비공개"),
      status: it.status || "draft",
      startAt: it.startAt || "",
      endAt: it.endAt || "",
      resultVisibility:
        it.type === "notice" ? "public" : it.resultVisibility || "after_close",
      isPinned: Boolean(it.isPinned),
      imageUrl: it.imageUrl || "",
      company: it.company || "",
      union: it.union || "",
      optionsText: stringifyOptions(it.options || []),
      multiple: Boolean(it.multiple),
      maxSelections: Number(it.maxSelections ?? 1),
      order: Number(it.order ?? 1),
      active: it.active !== false,
    });
  }

  function cancelEdit() {
    if (isBusy) return;

    setEditingId(null);
    setIsCreating(false);
    setPendingCreateTab(null);
    resetForm();
  }

  async function saveEdit() {
    if (isBusy) return;
    if (!editingId) return;

    validateForm(form);
    const payload = normalizePayloadFromForm(form, tab);

    try {
      setSavingIssue(true);
      await updateIssue(tab, editingId, payload, actorUid);
      setEditingId(null);
      resetForm(tab, nextOrder);
    } finally {
      setSavingIssue(false);
    }
  }

  async function saveNewIssue() {
    if (isBusy) return;

    validateForm(form);
    const payload = normalizePayloadFromForm(form, createTargetTab || tab);

    try {
      setSavingIssue(true);

      const docRef = await createIssue(createTargetTab, payload, actorUid);

      setIsCreating(false);
      resetForm(createTargetTab, nextOrder);

      if (tab === createTargetTab) {
        setSelectedIssueId(docRef.id);
      }
    } finally {
      setSavingIssue(false);
    }
  }

  async function normalizeIssueOrders() {
    if (isBusy) return;
    if (visibleIssues.length === 0) {
      throw new Error("정렬할 안건이 없습니다.");
    }

    try {
      setReordering(true);
      await reorderIssues(tab, visibleIssues);
    } finally {
      setReordering(false);
    }
  }

  async function archiveIssue(id) {
    if (isBusy) return;

    try {
      setSavingIssue(true);
      await archiveIssueService(tab, id, actorUid);

      if (selectedIssueId === id) setSelectedIssueId(null);
      if (editingId === id) {
        setEditingId(null);
        resetForm();
      }
    } finally {
      setSavingIssue(false);
    }
  }

  async function restoreIssue(id) {
    if (isBusy) return;

    try {
      setSavingIssue(true);
      await restoreIssueService(tab, id, actorUid);
    } finally {
      setSavingIssue(false);
    }
  }

  async function hardDeleteIssue(id) {
    if (isBusy) return;

    try {
      setSavingIssue(true);
      await hardDeleteIssueService(tab, id);
    } finally {
      setSavingIssue(false);
    }
  }

  async function handleChangeIssueStatus(id, nextStatus) {
    if (isBusy) return;

    try {
      setSavingIssue(true);
      await changeIssueStatus(tab, id, nextStatus, actorUid);
    } finally {
      setSavingIssue(false);
    }
  }

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