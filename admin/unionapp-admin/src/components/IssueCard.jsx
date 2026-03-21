import { useMemo, useState } from "react";
import IssueForm from "./IssueForm";
import { ui } from "../styles/ui";
import { isVisibleOnMobile, formatMobileVisibility } from "../hooks/useIssues";

function previewText(value, max = 100) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function pillStyle(background, color) {
  return {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    background,
    color,
    fontWeight: 800,
    fontSize: 12,
    lineHeight: 1.2,
  };
}

function mobileVisibilityBadgeStyle(issue) {
  const visible = isVisibleOnMobile(issue);
  return pillStyle(
    visible ? "#dcfce7" : "#fee2e2",
    visible ? "#166534" : "#991b1b"
  );
}

function getIsMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 900;
}

const local = {
  headerRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    flexWrap: "wrap",
  },
  title: {
    fontWeight: 900,
    fontSize: 18,
    lineHeight: 1.35,
    color: "#1f2e43",
    flex: "1 1 220px",
    minWidth: 0,
  },
  idText: {
    color: "#888",
    fontSize: 12,
    marginTop: 6,
  },
  infoLine: {
    marginTop: 8,
    lineHeight: 1.6,
    color: "#1f2e43",
  },
  mobileHint: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: 700,
  },
  actionWrap: {
    marginTop: 14,
    display: "grid",
    gap: 10,
  },
  primaryActions: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
  },
  secondaryActions: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 8,
  },
  button: {
    minHeight: 46,
    padding: "10px 12px",
    border: "1px solid #cfd8e3",
    borderRadius: 10,
    background: "#fff",
    color: "#111827",
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
  },
  dangerButton: {
    minHeight: 46,
    padding: "10px 12px",
    border: "1px solid #fecaca",
    borderRadius: 10,
    background: "#fff1f2",
    color: "#b91c1c",
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
  },
  statusSelectWrap: {
    display: "grid",
    gap: 6,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: "#475569",
  },
  toggleRow: {
    marginTop: 10,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  toggleButton: {
    minHeight: 40,
    padding: "8px 12px",
    border: "1px solid #dbe4f0",
    borderRadius: 10,
    background: "#f8fbff",
    color: "#1d4ed8",
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
  },
};

export default function IssueCard({
  issue,
  isEditing,
  isSelected,
  showTrash,
  tab,
  form,
  setForm,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onArchive,
  onRestore,
  onHardDelete,
  onChangeStatus,
  onSelectIssue,
  savingIssue,
  formatStatus,
  statusBadgeStyle,
  formatType,
  typeBadgeStyle,
  canEdit,
  canHardDelete,
}) {
  const isMobile = getIsMobile();
  const [expanded, setExpanded] = useState(false);

  const cardStyle =
    isSelected && !showTrash
      ? { ...(ui.issueCard || {}), ...(ui.issueCardSelected || {}) }
      : ui.issueCard || {};

  const isLocked = !!savingIssue;
  const canSelectCard = !showTrash && !isEditing && !isLocked;
  const currentStatus = issue.status || "draft";
  const mobileVisible = isVisibleOnMobile(issue);

  const shouldShowDetails = useMemo(() => {
    if (isEditing) return true;
    if (!isMobile) return true;
    return expanded;
  }, [isEditing, isMobile, expanded]);

  const handleCardClick = () => {
    if (!canSelectCard) return;
    onSelectIssue(issue.id);
  };

  const stopClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div style={cardStyle} onClick={handleCardClick}>
      {!isEditing ? (
        <>
          <div style={local.headerRow}>
            <div style={local.title}>{issue.title || "(제목 없음)"}</div>

            <div style={typeBadgeStyle(issue.type || "notice")}>
              {formatType(issue.type || "notice")}
            </div>

            <div style={statusBadgeStyle(currentStatus)}>
              {formatStatus(currentStatus)}
            </div>

            {!showTrash && (
              <div style={mobileVisibilityBadgeStyle(issue)}>
                {formatMobileVisibility(issue)}
              </div>
            )}

            {!!issue.isPinned && (
              <div style={pillStyle("#fef3c7", "#92400e")}>상단 고정</div>
            )}
          </div>

          <div style={local.idText}>id: {issue.id}</div>

          <div style={ui.subText || { marginTop: 6, color: "#6b7280" }}>
            요약: {shouldShowDetails ? (issue.summary || "(없음)") : previewText(issue.summary, 60) || "(없음)"}
          </div>

          {!showTrash && (
            <div
              style={{
                ...local.mobileHint,
                color: mobileVisible ? "#166534" : "#991b1b",
              }}
            >
              {mobileVisible
                ? "현재 모바일 앱에 노출되는 문서야."
                : issue.type === "notice"
                  ? "현재 모바일 앱에 숨김 상태야. 공지는 status가 open 또는 closed여야 보여."
                  : "현재 모바일 앱에 숨김 상태야. 투표/설문은 status가 open이어야 보여."}
            </div>
          )}

          {isMobile && !isEditing && (
            <div style={local.toggleRow} onClick={stopClick}>
              <button
                type="button"
                style={local.toggleButton}
                onClick={() => setExpanded((prev) => !prev)}
              >
                {expanded ? "상세 접기" : "상세 보기"}
              </button>

              <div style={ui.mutedText || { color: "#888", fontSize: 12 }}>
                순서: {issue.order ?? "(없음)"}
              </div>
            </div>
          )}

          {shouldShowDetails && (
            <>
              <div style={local.infoLine}>
                <b>본문</b>: {previewText(issue.content, 80) || "(없음)"}
              </div>

              <div style={{ marginTop: 8 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    alert(issue.content || "본문이 없습니다.");
                  }}
                  style={{
                    padding: "6px 10px",
                    fontSize: 13,
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    background: "#f8f8f8",
                    cursor: "pointer",
                  }}
                >
                  상세 보기
                </button>
              </div>

              {issue.type === "vote" || issue.type === "survey" ? (
                <>
                  <div style={local.infoLine}>
                    <b>선택지 수</b>: {Array.isArray(issue.options) ? issue.options.length : 0}
                  </div>
                  <div style={local.infoLine}>
                    <b>복수 선택</b>: {issue.multiple ? "허용" : "단일"}
                  </div>
                  <div style={local.infoLine}>
                    <b>최대 선택</b>: {issue.maxSelections ?? 1}
                  </div>
                  <div style={local.infoLine}>
                    <b>결과 공개</b>: {issue.resultVisibility || "after_close"}
                  </div>
                </>
              ) : (
                <div style={local.infoLine}>
                  <b>이미지</b>: {issue.imageUrl ? "있음" : "없음"}
                </div>
              )}

              <div style={local.infoLine}>
                <b>구분</b>: {tab === "private" ? "내부 안건" : "공개 안건"}
              </div>
              <div style={local.infoLine}>
                <b>상태</b>: {formatStatus(currentStatus)}
              </div>
              <div style={local.infoLine}>
                <b>활성</b>: {issue.active === false ? "비활성" : "활성"}
              </div>

              {!isMobile && (
                <div style={{ marginTop: 8, ...(ui.mutedText || {}) }}>
                  순서: {issue.order ?? "(없음)"}
                </div>
              )}
            </>
          )}

          {!showTrash ? (
            canEdit && (
              <div style={local.actionWrap} onClick={stopClick}>
                <div style={local.primaryActions}>
                  <button
                    onClick={() => onStartEdit(issue)}
                    disabled={isLocked}
                    style={local.button}
                  >
                    편집
                  </button>

                  <button
                    onClick={() => onArchive(issue.id)}
                    disabled={isLocked}
                    style={local.button}
                  >
                    보관
                  </button>
                </div>

                <div style={local.statusSelectWrap}>
                  <div style={local.statusLabel}>상태 변경</div>
                  <select
                    value={currentStatus}
                    disabled={isLocked}
                    onChange={(e) => {
                      const nextStatus = e.target.value;
                      if (nextStatus !== currentStatus) {
                        onChangeStatus(issue.id, nextStatus);
                      }
                    }}
                    style={ui.select}
                  >
                    <option value="draft">작성중</option>
                    <option value="review">검토중</option>
                    <option value="open">모바일 공개</option>
                    <option value="closed">종료</option>
                  </select>
                </div>
              </div>
            )
          ) : (
            <div style={local.secondaryActions} onClick={stopClick}>
              {canEdit && (
                <button
                  onClick={() => onRestore(issue.id)}
                  disabled={isLocked}
                  style={local.button}
                >
                  복구
                </button>
              )}

              {canHardDelete && (
                <button
                  onClick={() => onHardDelete(issue.id)}
                  disabled={isLocked}
                  style={local.dangerButton}
                >
                  영구 삭제
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div onClick={stopClick}>
          <IssueForm
            tab={tab}
            form={form}
            setForm={setForm}
            onSaveNewIssue={() => {}}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            editingId={issue.id}
            savingIssue={savingIssue}
            canCreateOrEdit={canEdit}
          />
        </div>
      )}
    </div>
  );
}