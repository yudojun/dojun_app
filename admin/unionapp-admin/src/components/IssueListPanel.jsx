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
}) {
  return (
    <div style={ui.panel}>
      <h3>
        안건 목록 ({showTrash ? "보관함" : tabTitle}) / {visibleIssues.length}건
      </h3>

      {isCreating && createTargetTab === tab && !showTrash && canCreateOrEdit && (
        <div style={{ marginBottom: 12 }}>
          <IssueForm
            mode="create"
            form={form}
            setForm={setForm}
            onSave={onSaveNewIssue}
            onCancel={onCancelEdit}
            currentTab={tab}
            saving={savingIssue}
            statusOptions={statusOptions}
          />
        </div>
      )}

      {visibleIssues.length === 0 ? (
        <SectionCard>
          <div style={{ color: "#777" }}>
            {showTrash ? "보관된 안건이 없습니다." : "현재 안건이 없습니다."}
          </div>
        </SectionCard>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {visibleIssues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              isEditing={editingId === issue.id && !showTrash}
              isSelected={selectedIssueId === issue.id}
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
              canEdit={canCreateOrEdit}
              canHardDelete={canHardDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}