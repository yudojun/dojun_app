import IssueForm from "./IssueForm";
import { ui } from "../styles/ui";

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
  onSoftDelete,
  onRestore,
  onHardDelete,
  onChangeStatus,
  onSelectIssue,
  savingIssue,
  statusOptions,
  formatStatus,
  statusBadgeStyle,
}) {
  const cardStyle = isSelected && !showTrash
    ? { ...ui.issueCard, ...ui.issueCardSelected }
    : ui.issueCard;

  return (
    <div
      style={cardStyle}
      onClick={() => {
        if (!showTrash) onSelectIssue(issue.id);
      }}
    >
      {!isEditing ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              {issue.title || "(제목 없음)"}
            </div>
            <div style={statusBadgeStyle(issue.status || "draft")}>
              {formatStatus(issue.status || "draft")}
            </div>
            <div style={{ marginLeft: "auto", ...ui.mutedText }}>
              id: {issue.id}
            </div>
          </div>

          <div style={ui.subText}>요약: {issue.summary || ""}</div>
          <div style={{ marginTop: 10 }}>
            <b>회사안</b>: {issue.company || ""}
          </div>
          <div style={{ marginTop: 6 }}>
            <b>조합안</b>: {issue.union || ""}
          </div>
          <div style={{ marginTop: 6 }}>
            <b>범위</b>: {issue.scope || "전체"}
          </div>
          <div style={{ marginTop: 6 }}>
            <b>상태</b>: {formatStatus(issue.status || "draft")}
          </div>
          <div style={{ marginTop: 8, ...ui.mutedText }}>
            순서: {issue.order ?? "(없음)"}
          </div>

          {!showTrash ? (
            <div style={ui.actionsRow}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEdit(issue);
                }}
              >
                편집
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSoftDelete(issue.id);
                }}
              >
                삭제
              </button>

              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChangeStatus(issue.id, opt.value);
                  }}
                  disabled={(issue.status || "draft") === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <div style={ui.actionsRow}>
              <button onClick={() => onRestore(issue.id)}>복구</button>
              <button onClick={() => onHardDelete(issue.id)}>영구 삭제</button>
            </div>
          )}
        </>
      ) : (
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
      )}
    </div>
  );
}