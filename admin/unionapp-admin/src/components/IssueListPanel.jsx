import IssueForm from "./IssueForm";
import IssueCard from "./IssueCard";
import SectionCard from "./SectionCard";
import { ui } from "../styles/ui";


export default function IssueListPanel({
  tab,
  tabTitle,
  showTrash,
  visibleIssues,
  selectedIssueId,
  editingId,
  isCreating,
  createTargetTab,
  form,
  setForm,
  onSaveNewIssue,
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
  canCreateOrEdit,
  canHardDelete,
  onMoveIssueUp,
  onMoveIssueDown,
  mobileCompact = false,
}) {
  const isCreateFormOpen =
    !mobileCompact &&
    !showTrash &&
    canCreateOrEdit &&
    isCreating &&
    createTargetTab === tab;
  const activeEditingId = isCreateFormOpen ? null : editingId;
  const isInteractionLocked = savingIssue;

  const canShowEmptyTrash = showTrash && visibleIssues.length === 0;
  const canShowEmptyActive = !showTrash && visibleIssues.length === 0;

  return (
    <div style={ui.panel}>
      <h3>
        안건 목록 ({showTrash ? "보관함" : tabTitle}) / {visibleIssues.length}건
      </h3>

      {isCreateFormOpen && (
        <div style={{ marginBottom: 12 }}>
          <IssueForm
            tab={tab}
            form={form}
            setForm={setForm}
            onSaveNewIssue={onSaveNewIssue}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            editingId={null}
            savingIssue={savingIssue}
            canCreateOrEdit={canCreateOrEdit}
          />
        </div>
      )}

      {canShowEmptyTrash || canShowEmptyActive ? (
        <SectionCard>
          <div style={{ color: "#777" }}>
            {showTrash ? "보관된 안건이 없습니다." : "현재 안건이 없습니다."}
          </div>
        </SectionCard>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {visibleIssues.map((issue, index) => {
            const issueKey = issue.docId || issue.id;
            const isEditing =
              !mobileCompact && activeEditingId === issueKey && !showTrash;
            const isSelected = selectedIssueId === issueKey;

            return (
              <div key={issueKey} style={{ display: "grid", gap: 6 }}>
                {!showTrash && !isEditing && (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <button
                      type="button"
                      disabled={
                        savingIssue ||
                        isInteractionLocked ||
                        index === 0
                      }
                      onClick={() => onMoveIssueUp?.(issueKey)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 10,
                        border: "1px solid #d1d5db",
                        background:
                          savingIssue || isInteractionLocked || index === 0
                            ? "#f3f4f6"
                            : "#ffffff",
                        color: "#111827",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor:
                          savingIssue || isInteractionLocked || index === 0
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          savingIssue || isInteractionLocked || index === 0 ? 0.55 : 1,
                      }}
                    >
                      ▲ 위로
                    </button>

                    <button
                      type="button"
                      disabled={
                        savingIssue ||
                        isInteractionLocked ||
                        index === visibleIssues.length - 1
                      }
                      onClick={() => onMoveIssueDown?.(issueKey)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 10,
                        border: "1px solid #d1d5db",
                        background:
                          savingIssue ||
                          isInteractionLocked ||
                          index === visibleIssues.length - 1
                            ? "#f3f4f6"
                            : "#ffffff",
                        color: "#111827",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor:
                          savingIssue ||
                          isInteractionLocked ||
                          index === visibleIssues.length - 1
                            ? "not-allowed"
                            : "pointer",
                        opacity:
                          savingIssue ||
                          isInteractionLocked ||
                          index === visibleIssues.length - 1
                            ? 0.55
                            : 1,
                      }}
                    >
                      ▼ 아래로
                    </button>
                  </div>
                )}

                <IssueCard
                  issue={issue}
                  isEditing={isEditing}
                  isSelected={isSelected}
                  showTrash={showTrash}
                  tab={tab}
                  form={form}
                  setForm={setForm}
                  onSaveEdit={onSaveEdit}
                  onCancelEdit={onCancelEdit}
                  onStartEdit={onStartEdit}
                  onArchive={onArchive}
                  onRestore={onRestore}
                  onHardDelete={onHardDelete}
                  onChangeStatus={onChangeStatus}
                  onSelectIssue={onSelectIssue}
                  savingIssue={savingIssue}
                  statusOptions={statusOptions}
                  formatStatus={formatStatus}
                  statusBadgeStyle={statusBadgeStyle}
                  formatType={formatType}
                  typeBadgeStyle={typeBadgeStyle}
                  canEdit={canCreateOrEdit && !isInteractionLocked}
                  canHardDelete={canHardDelete && !isInteractionLocked}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}