import { ui } from "../styles/ui";

function previewValue(value, fallback = "(없음)") {
  const text = String(value || "").trim();
  return text || fallback;
}

export default function IssueDetailPanel({
  issue,
  tab,
  onArchive,
  onRestore,
  onHardDelete,
  onChangeStatus,
  formatStatus,
  statusBadgeStyle,
  formatType,
  typeBadgeStyle,
  canEdit,
  canHardDelete,
  showTrash,
}) {
  if (!issue) {
    return <div style={ui.sectionCard}>선택된 안건이 없습니다.</div>;
  }

  const currentStatus = issue.status || "draft";

  return (
    <div style={ui.sectionCard}>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.35 }}>
          {issue.title || "(제목 없음)"}
        </div>

        <div style={typeBadgeStyle(issue.type || "notice")}>
          {formatType(issue.type || "notice")}
        </div>

        <div style={statusBadgeStyle(currentStatus)}>
          {formatStatus(currentStatus)}
        </div>
      </div>

      <div style={{ marginTop: 8, ...ui.mutedText }}>
        id: {issue.displayId || issue.id}
      </div>

      <div style={{ marginTop: 14, lineHeight: 1.7 }}>
        <b>요약</b>: {previewValue(issue.summary)}
      </div>

      <div style={{ marginTop: 12, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
        <b>본문</b>: {previewValue(issue.content)}
      </div>

      {issue.type === "vote" || issue.type === "survey" ? (
        <>
          <div style={{ marginTop: 12 }}>
            <b>선택지 수</b>: {Array.isArray(issue.options) ? issue.options.length : 0}
          </div>
          <div style={{ marginTop: 8 }}>
            <b>복수 선택</b>: {issue.multiple ? "허용" : "단일"}
          </div>
          <div style={{ marginTop: 8 }}>
            <b>최대 선택</b>: {issue.maxSelections ?? 1}
          </div>
          <div style={{ marginTop: 8 }}>
            <b>결과 공개</b>: {issue.resultVisibility || "after_close"}
          </div>
        </>
      ) : (
        <div style={{ marginTop: 12 }}>
          <b>이미지</b>: {issue.imageUrl ? "있음" : "없음"}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <b>구분</b>: {tab === "private" ? "내부 안건" : "공개 안건"}
      </div>

      <div style={{ marginTop: 8 }}>
        <b>활성</b>: {issue.active === false ? "비활성" : "활성"}
      </div>

      <div style={{ marginTop: 8, ...ui.mutedText }}>
        순서: {issue.order ?? "(없음)"}
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
        {!showTrash ? (
          <>
            {canEdit && (
              <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onArchive(issue.id);
                }}
                style={ui.button}
                >
                보관
                </button>
            )}

            {canEdit && (
              <select
                value={currentStatus}
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
            )}
          </>
        ) : (
          <>
            {canEdit && (
              <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onRestore(issue.id);
                }}
                style={ui.button}
                >
                복구
                </button>
            )}

            {canHardDelete && (
              <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onHardDelete(issue.id);
                }}
                style={ui.button}
                >
                영구 삭제
                </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}