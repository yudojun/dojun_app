import { useRef, useState } from "react";
import FieldLabel from "./FieldLabel";
import { ui } from "../styles/ui";
import {
  TYPE_OPTIONS,
  RESULT_VISIBILITY_OPTIONS,
} from "../hooks/useIssues";
import { uploadIssueImage } from "../services/storageService";

function toNumberOrEmpty(value) {
  if (value === "") return "";
  const num = Number(value);
  return Number.isNaN(num) ? "" : num;
}

function normalizeFormByType(prevForm, nextType) {
  const base = {
    ...prevForm,
    type: nextType,
  };

  if (nextType === "notice") {
    return {
      ...base,
      company: "",
      union: "",
      optionsText: "",
      multiple: false,
      maxSelections: 1,
      resultVisibility: "public",
    };
  }

  if (nextType === "vote") {
    return {
      ...base,
      content: "",
      imageUrl: "",
      multiple: false,
      maxSelections: 1,
      resultVisibility: base.resultVisibility || "after_close",
    };
  }

  if (nextType === "survey") {
    return {
      ...base,
      content: "",
      imageUrl: "",
      company: "",
      union: "",
      multiple: !!base.multiple,
      maxSelections:
        base.multiple && Number(base.maxSelections) > 1
          ? Number(base.maxSelections)
          : 1,
      resultVisibility: base.resultVisibility || "after_close",
    };
  }

  return base;
}

function getOptionsCount(optionsText = "") {
  return optionsText
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean).length;
}

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

  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const optionCount = getOptionsCount(form.optionsText);
  const titleValid = form.title?.trim().length > 0;
  const noticeValid = !isNotice || form.content?.trim().length > 0;
  const voteValid = !isVote || optionCount >= 2;
  const surveyValid = !isSurvey || optionCount >= 2;

  const dateValid =
    !form.startAt ||
    !form.endAt ||
    new Date(form.startAt).getTime() <= new Date(form.endAt).getTime();

  const maxSelectionValid =
    !isSurvey ||
    !form.multiple ||
    (Number(form.maxSelections) >= 2 &&
      Number(form.maxSelections) <= optionCount);

  const canSave =
    titleValid &&
    noticeValid &&
    voteValid &&
    surveyValid &&
    dateValid &&
    maxSelectionValid &&
    !saving &&
    !uploadingImage;

  const handleTypeChange = (e) => {
    const nextType = e.target.value;
    setForm((prev) => normalizeFormByType(prev, nextType));
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      alert("이미지 파일만 업로드할 수 있어.");
      e.target.value = "";
      return;
    }

    try {
      setUploadingImage(true);
      const url = await uploadIssueImage(file, isCreate ? "temp" : "edit");

      setForm((prev) => ({
        ...prev,
        imageUrl: url,
      }));
    } catch (err) {
      console.error("IMAGE UPLOAD ERROR:", err);
      alert("이미지 업로드에 실패했어.");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = () => {
    setForm((prev) => ({
      ...prev,
      imageUrl: "",
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
              onChange={handleTypeChange}
              style={ui.input}
              disabled={saving || uploadingImage}
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
              onChange={(e) =>
                setForm((p) => ({ ...p, category: e.target.value }))
              }
              placeholder="general"
              style={ui.input}
              disabled={saving || uploadingImage}
            />
          </div>

          <div style={ui.minCell}>
            <FieldLabel>순서</FieldLabel>
            <input
              type="number"
              value={form.order ?? ""}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  order: toNumberOrEmpty(e.target.value),
                }))
              }
              style={ui.input}
              disabled={saving || uploadingImage}
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
            disabled={saving || uploadingImage}
          />
        </div>

        <div style={ui.minCell}>
          <FieldLabel>요약</FieldLabel>
          <input
            value={form.summary}
            onChange={(e) =>
              setForm((p) => ({ ...p, summary: e.target.value }))
            }
            placeholder="요약"
            style={ui.input}
            disabled={saving || uploadingImage}
          />
        </div>

        {isNotice && (
          <>
            <div style={ui.minCell}>
              <FieldLabel>본문(content)</FieldLabel>
              <textarea
                rows={6}
                value={form.content}
                onChange={(e) =>
                  setForm((p) => ({ ...p, content: e.target.value }))
                }
                placeholder="공지 본문"
                style={ui.textarea}
                disabled={saving || uploadingImage}
              />
            </div>

            <div style={ui.minCell}>
              <FieldLabel>공지 이미지 업로드</FieldLabel>

              <div style={{ display: "grid", gap: 8 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={saving || uploadingImage}
                  style={ui.input}
                />

                {uploadingImage && (
                  <div style={{ color: "#2563eb", fontSize: 13 }}>
                    이미지 업로드 중...
                  </div>
                )}

                {form.imageUrl && (
                  <>
                    <div style={{ display: "grid", gap: 8 }}>
                      <img
                        src={form.imageUrl}
                        alt="공지 이미지 미리보기"
                        style={{
                          maxWidth: "100%",
                          maxHeight: 240,
                          objectFit: "cover",
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                        }}
                      />

                      <input
                        value={form.imageUrl}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, imageUrl: e.target.value }))
                        }
                        placeholder="https://..."
                        style={ui.input}
                        disabled={saving || uploadingImage}
                      />

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          disabled={saving || uploadingImage}
                        >
                          이미지 제거
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {!form.imageUrl && !uploadingImage && (
                  <div style={{ color: "#64748b", fontSize: 13 }}>
                    이미지를 선택하면 자동으로 업로드되고 URL이 저장돼.
                  </div>
                )}
              </div>
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
                  onChange={(e) =>
                    setForm((p) => ({ ...p, company: e.target.value }))
                  }
                  placeholder="회사안"
                  style={ui.textarea}
                  disabled={saving || uploadingImage}
                />
              </div>
              <div style={ui.minCell}>
                <FieldLabel>조합안</FieldLabel>
                <textarea
                  rows={4}
                  value={form.union}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, union: e.target.value }))
                  }
                  placeholder="조합안"
                  style={ui.textarea}
                  disabled={saving || uploadingImage}
                />
              </div>
            </div>

            <div style={ui.minCell}>
              <FieldLabel>투표 옵션 (한 줄에 하나씩)</FieldLabel>
              <textarea
                rows={4}
                value={form.optionsText}
                onChange={(e) =>
                  setForm((p) => ({ ...p, optionsText: e.target.value }))
                }
                placeholder={"찬성\n반대\n보류"}
                style={ui.textarea}
                disabled={saving || uploadingImage}
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
                onChange={(e) =>
                  setForm((p) => ({ ...p, optionsText: e.target.value }))
                }
                placeholder={"노동법\n산안법\n단체교섭\n정세교육"}
                style={ui.textarea}
                disabled={saving || uploadingImage}
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
                      maxSelections:
                        e.target.value === "true"
                          ? Math.max(Number(p.maxSelections) || 2, 2)
                          : 1,
                    }))
                  }
                  style={ui.input}
                  disabled={saving || uploadingImage}
                >
                  <option value="false">단일 선택</option>
                  <option value="true">복수 선택</option>
                </select>
              </div>

              <div style={ui.minCell}>
                <FieldLabel>최대 선택 수</FieldLabel>
                <input
                  type="number"
                  min={form.multiple ? 2 : 1}
                  max={optionCount || undefined}
                  value={form.maxSelections ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      maxSelections: toNumberOrEmpty(e.target.value),
                    }))
                  }
                  style={ui.input}
                  disabled={saving || uploadingImage || !form.multiple}
                />
              </div>

              <div style={ui.minCell}>
                <FieldLabel>결과 공개</FieldLabel>
                <select
                  value={form.resultVisibility}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      resultVisibility: e.target.value,
                    }))
                  }
                  style={ui.input}
                  disabled={saving || uploadingImage}
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
              disabled={saving || uploadingImage}
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
              disabled={saving || uploadingImage}
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
              onChange={(e) =>
                setForm((p) => ({ ...p, status: e.target.value }))
              }
              style={ui.input}
              disabled={saving || uploadingImage}
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
              disabled={saving || uploadingImage}
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
              type="datetime-local"
              value={form.startAt || ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, startAt: e.target.value }))
              }
              style={ui.input}
              disabled={saving || uploadingImage}
            />
          </div>

          <div style={ui.minCell}>
            <FieldLabel>종료일시</FieldLabel>
            <input
              type="datetime-local"
              value={form.endAt || ""}
              min={form.startAt || undefined}
              onChange={(e) => setForm((p) => ({ ...p, endAt: e.target.value }))}
              style={ui.input}
              disabled={saving || uploadingImage}
            />
          </div>
        </div>

        {!titleValid && (
          <div style={{ ...ui.minCell, color: "#b91c1c", fontSize: 13 }}>
            제목은 필수야.
          </div>
        )}

        {isNotice && !noticeValid && (
          <div style={{ ...ui.minCell, color: "#b91c1c", fontSize: 13 }}>
            공지는 본문이 필요해.
          </div>
        )}

        {isVote && !voteValid && (
          <div style={{ ...ui.minCell, color: "#b91c1c", fontSize: 13 }}>
            투표 옵션은 최소 2개 이상 필요해.
          </div>
        )}

        {isSurvey && !surveyValid && (
          <div style={{ ...ui.minCell, color: "#b91c1c", fontSize: 13 }}>
            설문 옵션은 최소 2개 이상 필요해.
          </div>
        )}

        {!dateValid && (
          <div style={{ ...ui.minCell, color: "#b91c1c", fontSize: 13 }}>
            종료일시는 시작일시보다 빠를 수 없어.
          </div>
        )}

        {isSurvey && form.multiple && !maxSelectionValid && (
          <div style={{ ...ui.minCell, color: "#b91c1c", fontSize: 13 }}>
            복수 선택일 때 최대 선택 수는 2 이상이고 옵션 수를 넘을 수 없어.
          </div>
        )}
      </div>

      <div style={ui.formActions}>
        <button onClick={handleSave} disabled={!canSave}>
          {saving ? "저장 중..." : uploadingImage ? "이미지 업로드 중..." : isCreate ? "추가 저장" : "저장"}
        </button>
        <button onClick={onCancel} disabled={saving || uploadingImage}>
          취소
        </button>
      </div>
    </div>
  );
}