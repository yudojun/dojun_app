import { useEffect, useState } from "react";
import { resetVoteStats as resetVoteStatsService, subscribeVoteStats } from "../services/voteService";

export default function useVoteStats({ enabled, selectedIssueId }) {
  const [stats, setStats] = useState({ yes: 0, no: 0, hold: 0, total: 0 });
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !selectedIssueId) {
      setStats({ yes: 0, no: 0, hold: 0, total: 0 });
      setStatsLoading(false);
      return;
    }

    setStatsLoading(true);

    const unsub = subscribeVoteStats(
      selectedIssueId,
      (nextStats) => {
        setStats(nextStats);
        setStatsLoading(false);
      },
      (err) => {
        console.log("VOTE_STATS READ ERROR:", err.code, err.message);
        setStats({ yes: 0, no: 0, hold: 0, total: 0 });
        setStatsLoading(false);
      }
    );

    return () => unsub();
  }, [enabled, selectedIssueId]);

  async function resetVoteStats(issueId) {
    return resetVoteStatsService(issueId);
  }

  return {
    stats,
    statsLoading,
    resetVoteStats,
    setStats,
  };
}