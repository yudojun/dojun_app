import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

const COL_VOTE_STATS = "vote_stats";

export function subscribeVoteStats(issueId, onData, onError) {
  const ref = doc(db, COL_VOTE_STATS, issueId);

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData({ yes: 0, no: 0, hold: 0, total: 0 });
        return;
      }

      const d = snap.data() || {};
      onData({
        yes: Number(d.yes || 0),
        no: Number(d.no || 0),
        hold: Number(d.hold || 0),
        total: Number(d.total || 0),
      });
    },
    onError
  );
}