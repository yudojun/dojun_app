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
  return (
    <div style={ui.panel}>
      <h3>
        쟁점 목록 ({showTrash ? "휴지통" : tabTitle}) / {visibleIssues.length}건
      </h3>

      {isCreating && createTargetTab === tab && !showTrash && (
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
            {showTrash ? "휴지통에 문서가 없습니다." : "현재 문서가 없습니다."}
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
              onSoftDelete={onSoftDelete}
              onRestore={onRestore}
              onHardDelete={onHardDelete}
              onChangeStatus={onChangeStatus}
              onSelectIssue={onSelectIssue}
              savingIssue={savingIssue}
              statusOptions={statusOptions}
              formatStatus={formatStatus}
              statusBadgeStyle={statusBadgeStyle}
            />
          ))}
        </div>
      )}
    </div>
  );
}