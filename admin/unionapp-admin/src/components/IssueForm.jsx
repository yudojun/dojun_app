import FieldLabel from "./FieldLabel";
import { ui } from "../styles/ui";

export default function IssueForm({
  mode,
  form,
  setForm,
  onSave,
  onCancel,
  currentTab,
  saving,
  statusOptions,
}) {
  const isCreate = mode === "create";

  return (
    <div style={ui.formWrap}>
      <div style={ui.formTitle}>
        {isCreate ? "새 쟁점 추가" : "쟁점 편집"}
      </div>

      <div style={ui.formGrid}>
        <div style={ui.minCell}>
          <FieldLabel>제목</FieldLabel>
          <input
            placeholder="쟁점 제목을 입력"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            style={ui.input}
          />
        </div>

        <div style={ui.minCell}>
          <FieldLabel>요약</FieldLabel>
          <input
            placeholder="쟁점 요약을 입력"
            value={form.summary}
            onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
            style={ui.input}
          />
        </div>

        <div style={ui.twoColGrid}>
          <div style={ui.minCell}>
            <FieldLabel>회사안</FieldLabel>
            <textarea
              placeholder="회사측 입장을 입력"
              value={form.company}
              onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
              rows={4}
              style={ui.textarea}
            />
          </div>

          <div style={ui.minCell}>
            <FieldLabel>조합안</FieldLabel>
            <textarea
              placeholder="조합측 입장을 입력"
              value={form.union}
              onChange={(e) => setForm((p) => ({ ...p, union: e.target.value }))}
              rows={4}
              style={ui.textarea}
            />
          </div>
        </div>

        <div style={ui.threeColGrid}>
          <div style={ui.minCell}>
            <FieldLabel>범위</FieldLabel>
            <select
              value={form.scope}
              onChange={(e) => setForm((p) => ({ ...p, scope: e.target.value }))}
              style={ui.input}
            >
              <option value="전체">전체</option>
              <option value="회사안">회사안</option>
              <option value="조합안">조합안</option>
              {currentTab === "private" && <option value="비공개">비공개</option>}
            </select>
          </div>

          <div style={ui.minCell}>
            <FieldLabel>상태</FieldLabel>
            <select
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
              style={ui.input}
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div style={ui.minCell}>
            <FieldLabel>순서</FieldLabel>
            <input
              type="number"
              value={form.order}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  order: Number(e.target.value),
                }))
              }
              style={ui.input}
            />
          </div>
        </div>
      </div>

      <div style={ui.formActions}>
        <button onClick={onSave} disabled={saving}>
          {saving ? "저장 중..." : isCreate ? "추가 저장" : "저장"}
        </button>
        <button onClick={onCancel} disabled={saving}>
          취소
        </button>
      </div>
    </div>
  );
}