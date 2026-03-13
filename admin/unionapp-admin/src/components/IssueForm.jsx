import FieldLabel from "./FieldLabel";
import { ui } from "../styles/ui";
import {
  TYPE_OPTIONS,
  RESULT_VISIBILITY_OPTIONS,
} from "../hooks/useIssues";

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
  const isNotice = form.type === "notice";
  const isVote = form.type === "vote";
  const isSurvey = form.type === "survey";

  return (
    <div style={ui.formWrap}>
      <div style={ui.formTitle}>
        {isCreate ? "새 안건 추가" : "안건 편집"}
      </div>

      <div style={ui.formGrid}>
        <div style={ui.threeColGrid}>
          <div style={ui.minCell}>
            <FieldLabel>타입</FieldLabel>
            <select
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              style={ui.input}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div style={ui.minCell}>
            <FieldLabel>카테고리</FieldLabel>
            <input
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              placeholder="general"
              style={ui.input}
            />
          </div>

          <div style={ui.minCell}>
            <FieldLabel>순서</FieldLabel>
            <input
              type="number"
              value={form.order}
              onChange={(e) => setForm((p) => ({ ...p, order: Number(e.target.value) }))}
              style={ui.input}
            />
          </div>
        </div>

        <div style={ui.minCell}>
          <FieldLabel>제목</FieldLabel>
          <input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="안건 제목"
            style={ui.input}
          />
        </div>

        <div style={ui.minCell}>
          <FieldLabel>요약</FieldLabel>
          <input
            value={form.summary}
            onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
            placeholder="요약"
            style={ui.input}
          />
        </div>

        {isNotice && (
          <>
            <div style={ui.minCell}>
              <FieldLabel>본문(content)</FieldLabel>
              <textarea
                rows={6}
                value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                placeholder="공지 본문"
                style={ui.textarea}
              />
            </div>

            <div style={ui.minCell}>
              <FieldLabel>이미지 URL</FieldLabel>
              <input
                value={form.imageUrl}
                onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                placeholder="https://..."
                style={ui.input}
              />
            </div>
          </>
        )}

        {isVote && (
          <>
            <div style={ui.twoColGrid}>
              <div style={ui.minCell}>
                <FieldLabel>회사안</FieldLabel>
                <textarea
                  rows={4}
                  value={form.company}
                  onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                  placeholder="회사안"
                  style={ui.textarea}
                />
              </div>
              <div style={ui.minCell}>
                <FieldLabel>조합안</FieldLabel>
                <textarea
                  rows={4}
                  value={form.union}
                  onChange={(e) => setForm((p) => ({ ...p, union: e.target.value }))}
                  placeholder="조합안"
                  style={ui.textarea}
                />
              </div>
            </div>

            <div style={ui.minCell}>
              <FieldLabel>투표 옵션 (한 줄에 하나씩)</FieldLabel>
              <textarea
                rows={4}
                value={form.optionsText}
                onChange={(e) => setForm((p) => ({ ...p, optionsText: e.target.value }))}
                placeholder={"찬성\n반대\n보류"}
                style={ui.textarea}
              />
            </div>
          </>
        )}

        {isSurvey && (
          <>
            <div style={ui.minCell}>
              <FieldLabel>설문 옵션 (한 줄에 하나씩)</FieldLabel>
              <textarea
                rows={5}
                value={form.optionsText}
                onChange={(e) => setForm((p) => ({ ...p, optionsText: e.target.value }))}
                placeholder={"노동법\n산안법\n단체교섭\n정세교육"}
                style={ui.textarea}
              />
            </div>

            <div style={ui.threeColGrid}>
              <div style={ui.minCell}>
                <FieldLabel>복수 선택</FieldLabel>
                <select
                  value={form.multiple ? "true" : "false"}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      multiple: e.target.value === "true",
                    }))
                  }
                  style={ui.input}
                >
                  <option value="false">단일 선택</option>
                  <option value="true">복수 선택</option>
                </select>
              </div>

              <div style={ui.minCell}>
                <FieldLabel>최대 선택 수</FieldLabel>
                <input
                  type="number"
                  value={form.maxSelections}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, maxSelections: Number(e.target.value) }))
                  }
                  style={ui.input}
                />
              </div>

              <div style={ui.minCell}>
                <FieldLabel>결과 공개</FieldLabel>
                <select
                  value={form.resultVisibility}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, resultVisibility: e.target.value }))
                  }
                  style={ui.input}
                >
                  {RESULT_VISIBILITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {!isNotice && !isSurvey && (
          <div style={ui.minCell}>
            <FieldLabel>결과 공개</FieldLabel>
            <select
              value={form.resultVisibility}
              onChange={(e) =>
                setForm((p) => ({ ...p, resultVisibility: e.target.value }))
              }
              style={ui.input}
            >
              {RESULT_VISIBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

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
            <FieldLabel>상단 고정</FieldLabel>
            <select
              value={form.isPinned ? "true" : "false"}
              onChange={(e) =>
                setForm((p) => ({ ...p, isPinned: e.target.value === "true" }))
              }
              style={ui.input}
            >
              <option value="false">일반</option>
              <option value="true">고정</option>
            </select>
          </div>
        </div>

        <div style={ui.twoColGrid}>
          <div style={ui.minCell}>
            <FieldLabel>시작일시</FieldLabel>
            <input
              value={form.startAt}
              onChange={(e) => setForm((p) => ({ ...p, startAt: e.target.value }))}
              placeholder="2026-03-15T09:00"
              style={ui.input}
            />
          </div>

          <div style={ui.minCell}>
            <FieldLabel>종료일시</FieldLabel>
            <input
              value={form.endAt}
              onChange={(e) => setForm((p) => ({ ...p, endAt: e.target.value }))}
              placeholder="2026-03-20T18:00"
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