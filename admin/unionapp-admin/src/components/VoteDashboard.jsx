import SectionCard from "./SectionCard";
import StatRow from "./StatRow";
import { ui } from "../styles/ui";

function pct(part, total) {
  if (!total || total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export default function VoteDashboard({
  selectedIssueId,
  selectedIssue,
  stats,
  statsLoading,
  memberCount,
  onResetVoteStats,
  formatStatus,
  statusBadgeStyle,
}) {
  const participation =
    !memberCount || memberCount <= 0
      ? 0
      : Math.round((Number(stats.total || 0) / memberCount) * 1000) / 10;

  const yesPct = pct(stats.yes, stats.total);
  const noPct = pct(stats.no, stats.total);
  const holdPct = pct(stats.hold, stats.total);

  return (
    <div style={ui.panel}>
      <h3>투표 대시보드</h3>

      {!selectedIssueId || !selectedIssue ? (
        <SectionCard>쟁점을 선택하면 투표 현황이 표시됩니다.</SectionCard>
      ) : (
        <SectionCard>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>
              {selectedIssue?.title || "선택된 쟁점"}
            </div>
            <div style={statusBadgeStyle(selectedIssue.status || "draft")}>
              {formatStatus(selectedIssue.status || "draft")}
            </div>
          </div>

          <div style={{ marginTop: 6, ...ui.mutedText }}>
            issueId: {selectedIssueId}
          </div>

          <div style={ui.voteInfoBox}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>참여</div>
            <div style={{ marginTop: 6, fontSize: 14, color: "#333" }}>
              총 참여: <b>{stats.total}</b> / 조합원: <b>{memberCount}</b>
            </div>
            <div style={{ marginTop: 4, color: "#333" }}>
              참여율: <b>{participation}%</b>
            </div>
            {statsLoading && <div style={{ marginTop: 8, color: "#777" }}>집계 로딩 중…</div>}
          </div>

          <div style={ui.chartWrap}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>투표 그래프</div>
            <div style={{ display: "grid", gap: 10 }}>
              <StatRow label="찬성" value={stats.yes} percent={yesPct} />
              <StatRow label="반대" value={stats.no} percent={noPct} />
              <StatRow label="보류" value={stats.hold} percent={holdPct} />
            </div>
          </div>

          <div style={{ marginTop: 16, ...ui.buttonRow }}>
            <button onClick={() => onResetVoteStats(selectedIssueId)}>
              (옵션) 집계 초기화
            </button>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: "#777", lineHeight: 1.5 }}>
            ※ “집계 초기화”는 vote_stats만 0으로 되돌립니다. <br />
            ballots(votes/{`{issueId}`}/ballots)까지 완전 삭제는 운영 안전상 Cloud
            Functions/서버에서 처리하는 걸 추천.
          </div>
        </SectionCard>
      )}
    </div>
  );
}