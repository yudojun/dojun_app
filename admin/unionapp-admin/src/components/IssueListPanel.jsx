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
        <div style={{ display: "grid", gap: 12 }}>
          {visibleIssues.map((issue) => {
            const isEditing = !mobileCompact && activeEditingId === issue.id && !showTrash;
            const isSelected = selectedIssueId === issue.id;

            return (
              <IssueCard
                key={issue.id}
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
            );
          })}
        </div>
      )}
    </div>
  );
}