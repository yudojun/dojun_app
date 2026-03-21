import React, { useMemo } from "react";
import { ui } from "../styles/ui";

const TYPE_OPTIONS = [
  { value: "notice", label: "공지" },
  { value: "vote", label: "투표" },
  { value: "survey", label: "설문" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "작성중" },
  { value: "review", label: "검토중" },
  { value: "open", label: "모바일 공개" },
  { value: "closed", label: "종료" },
  { value: "archived", label: "보관" },
];

const RESULT_VISIBILITY_OPTIONS = [
  { value: "after_close", label: "종료 후 공개" },
  { value: "public", label: "즉시 공개" },
  { value: "admin_only", label: "관리자만" },
];

function getAutoScope(tab) {
  return tab === "private" ? "비공개" : "전체";
}

function getTabLabel(tab) {
  return tab === "private" ? "내부 안건" : "공개 안건";
}

function getVisibilityGuide(tab, type, status) {
  if (tab === "private") {
    return {
      visible: false,
      badge: "모바일 비공개",
      text: "내부 안건은 항상 관리자 전용이며 모바일 앱에 노출되지 않습니다.",
    };
  }

  if (type === "notice") {
    const visible = status === "open" || status === "closed";
    return {
      visible,
      badge: visible ? "모바일 공개" : "모바일 비공개",
      text: visible
        ? "공개 공지는 현재 모바일 앱에 노출됩니다."
        : "공개 공지는 상태가 '모바일 공개' 또는 '종료'일 때만 모바일에 노출됩니다.",
    };
  }

  const visible = status === "open";
  return {
    visible,
    badge: visible ? "모바일 공개" : "모바일 비공개",
    text: visible
      ? "공개 투표/설문은 현재 모바일 앱에 노출됩니다."
      : "공개 투표/설문은 상태가 '모바일 공개'일 때만 모바일에 노출됩니다.",
  };
}

function normalizeOptionsText(value) {
  if (Array.isArray(value)) return value.join("\n");
  return value || "";
}

function parseOptions(value) {
  return String(value || "")
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

function validateForm({ tab, form }) {
  const errors = [];

  if (!String(form.title || "").trim()) {
    errors.push("제목은 필수입니다.");
  }

  if (!String(form.summary || "").trim()) {
    errors.push("요약은 필수입니다.");
  }

  if (!String(form.category || "").trim()) {
    errors.push("카테고리는 필수입니다.");
  }

  if (form.type === "vote" || form.type === "survey") {
    const options = parseOptions(form.options);

    if (options.length < 2) {
      errors.push("투표/설문 선택지는 최소 2개 이상이어야 합니다.");
    }

    if (form.multiple) {
      const maxSelections = Number(form.maxSelections || 0);

      if (!Number.isFinite(maxSelections) || maxSelections < 1) {
        errors.push("복수 선택 허용 시 최대 선택 개수는 1 이상이어야 합니다.");
      }

      if (options.length > 0 && maxSelections > options.length) {
        errors.push("최대 선택 개수는 선택지 개수를 초과할 수 없습니다.");
      }
    }

    if (form.startAt && form.endAt && form.startAt > form.endAt) {
      errors.push("종료일시는 시작일시보다 빠를 수 없습니다.");
    }
  }

  return errors;
}

const local = {
  formWrap: {
    border: "1px solid #dcdfe5",
    borderRadius: 16,
    background: "#ffffff",
    padding: 16,
    marginBottom: 12,
  },
  titleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  badge: {
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
  },
  noticeBox: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "#f8fafc",
    padding: 12,
    fontSize: 14,
    lineHeight: 1.6,
    marginBottom: 12,
  },
  errorBox: {
    border: "1px solid #fecaca",
    borderRadius: 12,
    background: "#fef2f2",
    color: "#991b1b",
    padding: 12,
    marginBottom: 12,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    fontSize: 14,
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    fontSize: 14,
    boxSizing: "border-box",
    resize: "vertical",
    fontFamily: "inherit",
  },
  label: {
    display: "block",
    fontWeight: 700,
    marginBottom: 6,
    color: "#1f2937",
  },
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minHeight: 42,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#fff",
    boxSizing: "border-box",
  },
  buttonRow: {
    display: "flex",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  primaryButton: {
    padding: "10px 16px",
    borderRadius: 10,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "10px 16px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#111827",
    fontWeight: 700,
    cursor: "pointer",
  },
};

export default function IssueForm({
  tab = "public",
  form,
  setForm,
  onSaveNewIssue,
  onSaveEdit,
  onCancelEdit,
  editingId,
  savingIssue = false,
  canCreateOrEdit = true,
}) {
  const autoScope = getAutoScope(tab);
  const visibilityGuide = getVisibilityGuide(tab, form.type, form.status);
  const errors = useMemo(() => validateForm({ tab, form }), [tab, form]);
  const canSubmit = canCreateOrEdit && !savingIssue && errors.length === 0;

  const updateField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (editingId) {
      await onSaveEdit();
      return;
    }

    await onSaveNewIssue();
  };

  const badgeStyle = {
    ...local.badge,
    background: visibilityGuide.visible ? "#dbeafe" : "#f3f4f6",
    color: visibilityGuide.visible ? "#1d4ed8" : "#4b5563",
  };

  return (
    <form onSubmit={handleSubmit} style={local.formWrap}>
      <div style={local.titleRow}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>
            {editingId ? "안건 수정" : "새 안건 작성"}
          </div>
          <div style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
            현재 작성 위치: <b>{getTabLabel(tab)}</b>
          </div>
        </div>

        <div style={badgeStyle}>{visibilityGuide.badge}</div>
      </div>

      <div style={local.noticeBox}>
        <div style={{ fontWeight: 800, marginBottom: 4 }}>운영 안내</div>
        <div>범위(scope)는 직접 선택하지 않습니다.</div>
        <div>
          현재 탭 기준으로 자동 저장됩니다: <b>{getTabLabel(tab)} → {autoScope}</b>
        </div>
        <div style={{ marginTop: 6, color: "#4b5563" }}>{visibilityGuide.text}</div>
      </div>

      {errors.length > 0 && (
        <div style={local.errorBox}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>입력 확인</div>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {errors.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={local.grid2}>
        <div>
          <label style={local.label}>안건 유형</label>
          <select
            value={form.type || "notice"}
            onChange={(e) => updateField("type", e.target.value)}
            style={local.input}
          >
            {TYPE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={local.label}>상태</label>
          <select
            value={form.status || "draft"}
            onChange={(e) => updateField("status", e.target.value)}
            style={local.input}
          >
            {STATUS_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={local.label}>제목</label>
        <input
          type="text"
          value={form.title || ""}
          onChange={(e) => updateField("title", e.target.value)}
          style={local.input}
          placeholder="제목을 입력하세요"
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={local.label}>요약</label>
        <textarea
          value={form.summary || ""}
          onChange={(e) => updateField("summary", e.target.value)}
          style={{ ...local.textarea, minHeight: 90 }}
          placeholder="목록 카드에 보여줄 핵심 요약"
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={local.label}>본문</label>
        <textarea
          value={form.content || ""}
          onChange={(e) => updateField("content", e.target.value)}
          style={{ ...local.textarea, minHeight: 160 }}
          placeholder="상세 설명, 배경, 운영 판단 근거 등을 입력하세요"
        />
      </div>

      <div style={{ ...local.grid2, marginTop: 12 }}>
        <div>
          <label style={local.label}>카테고리</label>
          <input
            type="text"
            value={form.category || ""}
            onChange={(e) => updateField("category", e.target.value)}
            style={local.input}
            placeholder="예: 임단협 / 공지 / 제도개선"
          />
        </div>

        <div>
          <label style={local.label}>결과 공개 범위</label>
          <select
            value={form.resultVisibility || "after_close"}
            onChange={(e) => updateField("resultVisibility", e.target.value)}
            style={local.input}
          >
            {RESULT_VISIBILITY_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ ...local.grid2, marginTop: 12 }}>
        <div>
          <label style={local.label}>이미지 URL</label>
          <input
            type="text"
            value={form.imageUrl || ""}
            onChange={(e) => updateField("imageUrl", e.target.value)}
            style={local.input}
            placeholder="선택 사항"
          />
        </div>

        <div>
          <label style={local.label}>정렬 순서</label>
          <input
            type="number"
            min="1"
            value={form.order ?? ""}
            onChange={(e) =>
              updateField("order", e.target.value === "" ? "" : Number(e.target.value))
            }
            style={local.input}
            placeholder="자동"
          />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={local.checkRow}>
          <input
            type="checkbox"
            checked={!!form.isPinned}
            onChange={(e) => updateField("isPinned", e.target.checked)}
          />
          상단 고정
        </label>
      </div>

      {tab === "private" && (
        <>
          <div style={{ marginTop: 12 }}>
            <label style={local.label}>내부 메모</label>
            <textarea
              value={form.internalMemo || ""}
              onChange={(e) => updateField("internalMemo", e.target.value)}
              style={{ ...local.textarea, minHeight: 100 }}
              placeholder="관리자 내부 메모"
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={local.label}>검토 코멘트</label>
            <textarea
              value={form.reviewComment || ""}
              onChange={(e) => updateField("reviewComment", e.target.value)}
              style={{ ...local.textarea, minHeight: 80 }}
              placeholder="검토용 코멘트"
            />
          </div>
        </>
      )}

      {(form.type === "vote" || form.type === "survey") && (
        <>
          <div style={{ marginTop: 12 }}>
            <label style={local.label}>선택지 (줄바꿈으로 구분)</label>
            <textarea
              value={normalizeOptionsText(form.options)}
              onChange={(e) => updateField("options", e.target.value)}
              style={{ ...local.textarea, minHeight: 120 }}
              placeholder={"찬성\n반대\n보류"}
            />
          </div>

          <div style={{ ...local.grid2, marginTop: 12 }}>
            <div>
              <label style={local.label}>시작일시</label>
              <input
                type="datetime-local"
                value={form.startAt || ""}
                onChange={(e) => updateField("startAt", e.target.value)}
                style={local.input}
              />
            </div>

            <div>
              <label style={local.label}>종료일시</label>
              <input
                type="datetime-local"
                value={form.endAt || ""}
                onChange={(e) => updateField("endAt", e.target.value)}
                style={local.input}
              />
            </div>
          </div>

          <div style={{ ...local.grid2, marginTop: 12 }}>
            <label style={local.checkRow}>
              <input
                type="checkbox"
                checked={!!form.multiple}
                onChange={(e) => updateField("multiple", e.target.checked)}
              />
              복수 선택 허용
            </label>

            {form.multiple ? (
              <div>
                <label style={local.label}>최대 선택 개수</label>
                <input
                  type="number"
                  min="1"
                  value={form.maxSelections ?? ""}
                  onChange={(e) =>
                    updateField(
                      "maxSelections",
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  style={local.input}
                />
              </div>
            ) : (
              <div style={local.noticeBox}>
                단일 선택 모드에서는 최대 선택 개수가 자동으로 1로 처리됩니다.
              </div>
            )}
          </div>
        </>
      )}

      <div style={local.buttonRow}>
        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            ...local.primaryButton,
            opacity: canSubmit ? 1 : 0.5,
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {savingIssue ? "저장 중..." : editingId ? "수정 저장" : "안건 생성"}
        </button>

        <button
          type="button"
          onClick={onCancelEdit}
          style={local.secondaryButton}
        >
          취소
        </button>
      </div>
    </form>
  );
}