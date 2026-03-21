const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

function buildPushTitle(data) {
  const rawTitle = (data.title || "").trim();
  const isPinned = data.isPinned === true;

  if (data.type === "vote") {
    return isPinned ? `[중요 투표] ${rawTitle}` : `[투표] ${rawTitle}`;
  }

  if (data.type === "survey") {
    return isPinned ? `[중요 설문] ${rawTitle}` : `[설문] ${rawTitle}`;
  }

  return isPinned ? `[중요 공지] ${rawTitle}` : `[공지] ${rawTitle}`;
}

function buildPushBody(data) {
  const summary = (data.summary || "").trim();
  if (summary) return summary;

  if (data.type === "vote") return "새 투표가 시작되었습니다.";
  if (data.type === "survey") return "새 설문이 등록되었습니다.";
  return "새 공지가 등록되었습니다.";
}

exports.sendIssueOpenPush = onDocumentWritten(
  {
    document: "issues_public/{issueId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    const issueId = event.params.issueId;

    if (!after) return;

    const beforeStatus = before?.status ?? null;
    const afterStatus = after?.status ?? null;

    if (afterStatus !== "open") return;
    if (beforeStatus === "open") return;
    if (after.pushSentAt) return;

    const type = String(after.type || "notice");
    if (!["notice", "vote", "survey"].includes(type)) return;

    const title = buildPushTitle(after);
    const body = buildPushBody(after);

    await admin.messaging().send({
      topic: "all_members",
      data: {
        type,
        issueId,
        title,
        body,
        scope: String(after.scope || "전체"),
        status: String(after.status || "open"),
      },
      android: {
        priority: "high",
        notification: {
          channelId: "unionapp_default",
          clickAction: "OPEN_ISSUE_DETAIL",
        },
      },
    });

    await db.collection("issues_public").doc(issueId).update({
      pushSentAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);