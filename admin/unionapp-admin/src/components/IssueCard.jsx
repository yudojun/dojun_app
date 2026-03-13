import IssueForm from "./IssueForm";
import { ui } from "../styles/ui";

function previewText(value, max = 100) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

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
  statusOptions,
  formatStatus,
  statusBadgeStyle,
  formatType,
  typeBadgeStyle,
  canEdit,
  canHardDelete,
}) {
  const cardStyle =
    isSelected && !showTrash
      ? { ...ui.issueCard, ...ui.issueCardSelected }
      : ui.issueCard;

  const isLocked = !!savingIssue;
  const canSelectCard = !showTrash && !isEditing && !isLocked;
  const currentStatus = issue.status || "draft";

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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              {issue.title || "(제목 없음)"}
            </div>
            <div style={typeBadgeStyle(issue.type || "notice")}>
              {formatType(issue.type || "notice")}
            </div>
            <div style={statusBadgeStyle(currentStatus)}>
              {formatStatus(currentStatus)}
            </div>
            <div style={{ marginLeft: "auto", ...ui.mutedText }}>
              id: {issue.id}
            </div>
          </div>

          <div style={ui.subText}>요약: {previewText(issue.summary, 120)}</div>

          {issue.type === "notice" && (
            <>
              <div style={{ marginTop: 6 }}>
                <b>본문</b>: {previewText(issue.content, 100)}
              </div>
              <div style={{ marginTop: 6 }}>
                <b>이미지</b>: {issue.imageUrl ? "있음" : "없음"}
              </div>
            </>
          )}

          {issue.type === "vote" && (
            <>
              <div style={{ marginTop: 10 }}>
                <b>회사안</b>: {previewText(issue.company, 80)}
              </div>
              <div style={{ marginTop: 6 }}>
                <b>조합안</b>: {previewText(issue.union, 80)}
              </div>
              <div style={{ marginTop: 6 }}>
                <b>옵션 수</b>: {Array.isArray(issue.options) ? issue.options.length : 0}
              </div>
            </>
          )}

          {issue.type === "survey" && (
            <>
              <div style={{ marginTop: 6 }}>
                <b>옵션 수</b>: {Array.isArray(issue.options) ? issue.options.length : 0}
              </div>
              <div style={{ marginTop: 6 }}>
                <b>복수 선택</b>: {issue.multiple ? "허용" : "단일"}
              </div>
              <div style={{ marginTop: 6 }}>
                <b>최대 선택</b>: {issue.maxSelections ?? 1}
              </div>
            </>
          )}

          <div style={{ marginTop: 6 }}>
            <b>범위</b>: {issue.scope || "전체"}
          </div>
          <div style={{ marginTop: 6 }}>
            <b>상태</b>: {formatStatus(currentStatus)}
          </div>
          <div style={{ marginTop: 6 }}>
            <b>활성</b>: {issue.active === false ? "비활성" : "활성"}
          </div>
          <div style={{ marginTop: 8, ...ui.mutedText }}>
            순서: {issue.order ?? "(없음)"}
          </div>

          {!showTrash ? (
            canEdit && (
              <div style={ui.actionsRow} onClick={stopClick}>
                <button
                  onClick={() => onStartEdit(issue)}
                  disabled={isLocked}
                >
                  편집
                </button>

                <button
                  onClick={() => onArchive(issue.id)}
                  disabled={isLocked}
                >
                  보관
                </button>

                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onChangeStatus(issue.id, opt.value)}
                    disabled={isLocked || currentStatus === opt.value}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )
          ) : (
            <div style={ui.actionsRow} onClick={stopClick}>
              {canEdit && (
                <button
                  onClick={() => onRestore(issue.id)}
                  disabled={isLocked}
                >
                  복구
                </button>
              )}

              {canHardDelete && (
                <button
                  onClick={() => onHardDelete(issue.id)}
                  disabled={isLocked}
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
            mode="edit"
            form={form}
            setForm={setForm}
            onSave={onSaveEdit}
            onCancel={onCancelEdit}
            currentTab={tab}
            saving={savingIssue}
            statusOptions={statusOptions}
          />
        </div>
      )}
    </div>
  );
}