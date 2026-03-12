const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

/**
 * ballot 값 정규화
 * 허용값:
 * - "yes"
 * - "no"
 * - "hold"
 *
 * 그 외 값은 무시
 */
function normalizeBallotValue(data) {
  if (!data) return null;

  const raw = String(data.choice ?? data.vote ?? data.value ?? "").trim().toLowerCase();

  if (raw === "yes") return "yes";
  if (raw === "no") return "no";
  if (raw === "hold") return "hold";

  return null;
}

/**
 * votes/{issueId}/ballots 하위 컬렉션 전체를 다시 읽어서
 * vote_stats/{issueId}를 안전하게 재작성한다.
 *
 * 이유:
 * Firestore 트리거는 at-least-once 전달이고 순서도 보장되지 않아서,
 * 증분 방식보다 전체 재계산이 더 안전하다.
 */
async function recomputeVoteStats(issueId) {
  const ballotsRef = db.collection("votes").doc(issueId).collection("ballots");
  const snap = await ballotsRef.get();

  let yes = 0;
  let no = 0;
  let hold = 0;

  snap.forEach((docSnap) => {
    const choice = normalizeBallotValue(docSnap.data());

    if (choice === "yes") yes += 1;
    else if (choice === "no") no += 1;
    else if (choice === "hold") hold += 1;
  });

  const total = yes + no + hold;

  await db.collection("vote_stats").doc(issueId).set(
    {
      yes,
      no,
      hold,
      total,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  logger.info("vote_stats updated", { issueId, yes, no, hold, total });
}

/**
 * 조합원 투표가 생성/수정/삭제될 때마다 자동 집계
 *
 * 경로:
 * votes/{issueId}/ballots/{uid}
 */
exports.onBallotWritten = onDocumentWritten(
  {
    document: "votes/{issueId}/ballots/{uid}",
    region: "asia-northeast3",
    memory: "256MiB",
    timeoutSeconds: 60
  },
  async (event) => {
    const { issueId, uid } = event.params;

    try {
      logger.info("ballot change detected", { issueId, uid });

      await recomputeVoteStats(issueId);
    } catch (error) {
      logger.error("failed to recompute vote_stats", {
        issueId,
        uid,
        message: error?.message,
        stack: error?.stack
      });
      throw error;
    }
  }
);