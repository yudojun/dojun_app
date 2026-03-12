import { useEffect, useMemo, useState } from "react";
import {
  changeIssueStatus,
  createIssue,
  hardDeleteIssue as hardDeleteIssueService,
  reorderIssues,
  restoreIssue as restoreIssueService,
  softDeleteIssue as softDeleteIssueService,
  subscribeIssues,
  updateIssue,
} from "../services/issueService";

export const STATUS_OPTIONS = [
  { value: "draft", label: "작성중" },
  { value: "open", label: "진행중" },
  { value: "closed", label: "종료" },
  { value: "archived", label: "보관" },
];

function createEmptyForm(tab = "public", order = 1) {
  return {
    title: "",
    summary: "",
    company: "",
    union: "",
    scope: tab === "public" ? "전체" : "비공개",
    order,
    status: "draft",
  };
}

export function formatStatus(status) {
  const found = STATUS_OPTIONS.find((x) => x.value === status);
  return found ? found.label : status || "-";
}

export function statusBadgeStyle(status) {
  const map = {
    draft: { bg: "#f3f4f6", color: "#374151" },
    open: { bg: "#e0f2fe", color: "#075985" },
    closed: { bg: "#fef3c7", color: "#92400e" },
    archived: { bg: "#ede9fe", color: "#5b21b6" },
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

export default function useIssues({ enabled }) {
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

  const liveIssues = useMemo(() => {
    return issues.filter((it) => it.deleted !== true);
  }, [issues]);

  const selectedIssue = useMemo(() => {
    return liveIssues.find((x) => x.id === selectedIssueId) || null;
  }, [liveIssues, selectedIssueId]);

  const nextOrder = useMemo(() => {
    const numbers = liveIssues
      .map((it) => Number(it.order))
      .filter((n) => Number.isFinite(n) && n > 0 && n < 1000000);

    if (numbers.length === 0) return 1;
    return Math.max(...numbers) + 1;
  }, [liveIssues]);

  const visibleIssues = useMemo(() => {
    const base = showTrash
      ? issues.filter((it) => it.deleted === true)
      : issues.filter((it) => it.deleted !== true);

    const q = searchText.trim().toLowerCase();

    return base.filter((it) => {
      const matchesSearch =
        !q ||
        String(it.title || "").toLowerCase().includes(q) ||
        String(it.summary || "").toLowerCase().includes(q) ||
        String(it.company || "").toLowerCase().includes(q) ||
        String(it.union || "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" ? true : (it.status || "draft") === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [issues, showTrash, searchText, statusFilter]);

  function resetForm(targetTab = tab, order = nextOrder) {
    setForm(createEmptyForm(targetTab, order));
  }

  useEffect(() => {
    if (!enabled) return;

    const unsub = subscribeIssues(
      tab,
      (rows) => {
        setIssues(rows);

        const liveRows = rows.filter((x) => x.deleted !== true);

        if (liveRows.length === 0) {
          setSelectedIssueId(null);
          return;
        }

        const stillExists = liveRows.some((x) => x.id === selectedIssueId);

        if (!selectedIssueId || !stillExists) {
          setSelectedIssueId(liveRows[0].id);
        }
      },
      (err) => {
        console.log("ISSUES READ ERROR:", err.code, err.message);
        alert(`쟁점 읽기 실패: ${err.code}`);
      }
    );

    return () => unsub();
  }, [enabled, tab, selectedIssueId]);

  useEffect(() => {
    setEditingId(null);
    setIsCreating(false);
    setShowTrash(false);
    resetForm(tab, nextOrder);
  }, [tab, nextOrder]);

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
    setPendingCreateTab(null);
    setIsCreating(false);
    setShowTrash(false);
    setEditingId(it.id);
    setForm({
      title: it.title || "",
      summary: it.summary || "",
      company: it.company || "",
      union: it.union || "",
      scope: it.scope || (tab === "public" ? "전체" : "비공개"),
      order: Number(it.order ?? 1),
      status: it.status || "draft",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setIsCreating(false);
    setPendingCreateTab(null);
    resetForm();
  }

  async function saveEdit() {
    if (!editingId) return;

    if (!form.title.trim()) {
      alert("제목은 필수야");
      return;
    }

    try {
      setSavingIssue(true);

      await updateIssue(tab, editingId, {
        title: form.title.trim(),
        summary: form.summary.trim(),
        company: form.company.trim(),
        union: form.union.trim(),
        scope: form.scope || (tab === "public" ? "전체" : "비공개"),
        status: form.status || "draft",
        order: Number(form.order) || 1,
      });

      setEditingId(null);
      resetForm();
    } catch (err) {
      console.log("UPDATE ERROR:", err.code, err.message);
      alert(`저장 실패: ${err.code}`);
    } finally {
      setSavingIssue(false);
    }
  }

  async function saveNewIssue() {
    if (!form.title.trim()) {
      alert("제목은 필수야");
      return;
    }

    try {
      setSavingIssue(true);

      const docRef = await createIssue(createTargetTab, {
        title: form.title.trim(),
        summary: form.summary.trim(),
        company: form.company.trim(),
        union: form.union.trim(),
        scope: form.scope || (createTargetTab === "public" ? "전체" : "비공개"),
        status: form.status || "draft",
        order: Number(form.order) || nextOrder,
      });

      setIsCreating(false);
      resetForm(createTargetTab, nextOrder);

      if (tab === createTargetTab) {
        setSelectedIssueId(docRef.id);
      }
    } catch (err) {
      console.log("ADD ERROR:", err.code, err.message);
      alert(`추가 실패: ${err.code}`);
    } finally {
      setSavingIssue(false);
    }
  }

  async function normalizeIssueOrders() {
    if (visibleIssues.length === 0) {
      alert("정렬할 쟁점이 없습니다.");
      return;
    }

    if (
      !window.confirm(
        `현재 ${tab === "public" ? "공개" : "비공개"} ${
          showTrash ? "휴지통" : "목록"
        }의 순서를 1부터 다시 정리할까?`
      )
    ) {
      return;
    }

    try {
      setReordering(true);
      await reorderIssues(tab, visibleIssues);

      if (editingId) {
        const editedIndex = visibleIssues.findIndex((x) => x.id === editingId);
        if (editedIndex >= 0) {
          setForm((prev) => ({ ...prev, order: editedIndex + 1 }));
        }
      }

      alert("순서 재정렬 완료");
    } catch (err) {
      console.log("REORDER ERROR:", err.code, err.message);
      alert(`순서 재정렬 실패: ${err.code}`);
    } finally {
      setReordering(false);
    }
  }

  async function softDeleteIssue(id) {
    if (!window.confirm("정말 삭제할까? 이 작업은 문서를 숨김 처리합니다.")) return;

    try {
      await softDeleteIssueService(tab, id);

      if (selectedIssueId === id) {
        setSelectedIssueId(null);
      }

      if (editingId === id) {
        setEditingId(null);
        resetForm();
      }
    } catch (err) {
      console.log("SOFT DELETE ERROR:", err.code, err.message);
      alert(`삭제 실패: ${err.code}`);
    }
  }

  async function restoreIssue(id) {
    if (!window.confirm("이 문서를 복구할까?")) return;

    try {
      await restoreIssueService(tab, id);
      alert("복구 완료");
    } catch (err) {
      console.log("RESTORE ERROR:", err.code, err.message);
      alert(`복구 실패: ${err.code}`);
    }
  }

  async function hardDeleteIssue(id) {
    if (!window.confirm("정말 영구 삭제할까? 이건 되돌리기 어렵다.")) return;

    try {
      await hardDeleteIssueService(tab, id);
      alert("영구 삭제 완료");
    } catch (err) {
      console.log("HARD DELETE ERROR:", err.code, err.message);
      alert(`영구 삭제 실패: ${err.code}`);
    }
  }

  async function handleChangeIssueStatus(id, nextStatus) {
    try {
      await changeIssueStatus(tab, id, nextStatus);
    } catch (err) {
      console.log("STATUS UPDATE ERROR:", err.code, err.message);
      alert(`상태 변경 실패: ${err.code}`);
    }
  }

  return {
    tab,
    setTab,
    issues,
    liveIssues,
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
  };
}