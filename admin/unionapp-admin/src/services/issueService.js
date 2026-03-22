import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export const COL_PUBLIC = "issues_public";
export const COL_PRIVATE = "issues_private";
export const COL_VOTES = "votes";

export function getIssueCollection(tab) {
  return tab === "public" ? COL_PUBLIC : COL_PRIVATE;
}

function getIssueRef(tab, issueId) {
  return doc(db, getIssueCollection(tab), issueId);
}

function getVoteRef(issueId) {
  return doc(db, COL_VOTES, issueId);
}

function isVoteLikeType(type) {
  return type === "vote" || type === "survey";
}

export function subscribeIssues(tab, onData, onError) {
  const col = getIssueCollection(tab);
  const q = query(collection(db, col), orderBy("order", "asc"));

  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          id: d.id,                     // ✅ 로직용: 항상 Firestore 문서 ID
          docId: d.id,                  // ✅ 필요하면 계속 사용
          displayId: data.id || d.id,   // ✅ 화면 표시용
        };
      });

      console.log(
        "subscribeIssues rows:",
        JSON.stringify(
          rows.map((it) => ({
            id: it.id,
            docId: it.docId,
            displayId: it.displayId,
            title: it.title,
          })),
          null,
          2
        )
      );

      onData(rows);
    },
    onError
  );
}

function buildIssuePayload(payload, actorUid) {
  return {
    type: payload.type,
    title: payload.title,
    summary: payload.summary,
    content: payload.content ?? "",
    category: payload.category ?? "general",
    scope: payload.scope,
    status: payload.status,
    startAt: payload.startAt ?? null,
    endAt: payload.endAt ?? null,
    resultVisibility: payload.resultVisibility ?? "after_close",
    isPinned: payload.isPinned ?? false,
    imageUrl: payload.imageUrl ?? "",
    company: payload.company ?? "",
    union: payload.union ?? "",
    options: payload.options ?? [],
    multiple: payload.multiple ?? false,
    maxSelections: payload.maxSelections ?? 1,
    order: payload.order ?? 1,
    active: payload.active ?? true,
    previousStatusBeforeArchive: null,
    createdBy: payload.createdBy ?? actorUid,
    updatedBy: actorUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function buildIssuePatch(payload, actorUid) {
  return {
    type: payload.type,
    title: payload.title,
    summary: payload.summary,
    content: payload.content ?? "",
    category: payload.category ?? "general",
    scope: payload.scope,
    status: payload.status,
    startAt: payload.startAt ?? null,
    endAt: payload.endAt ?? null,
    resultVisibility: payload.resultVisibility ?? "after_close",
    isPinned: payload.isPinned ?? false,
    imageUrl: payload.imageUrl ?? "",
    company: payload.company ?? "",
    union: payload.union ?? "",
    options: payload.options ?? [],
    multiple: payload.multiple ?? false,
    maxSelections: payload.maxSelections ?? 1,
    order: payload.order ?? 1,
    active: payload.active ?? true,
    updatedBy: actorUid,
    updatedAt: serverTimestamp(),
  };
}

function buildVoteMeta(issueId, payload, actorUid) {
  return {
    issueId,
    type: payload.type,
    question: payload.title,
    description: payload.summary ?? "",
    options: payload.options ?? [],
    multiple: payload.type === "survey" ? Boolean(payload.multiple) : false,
    anonymous: true,
    allowEdit: false,
    maxSelections:
      payload.type === "survey"
        ? payload.multiple
          ? Number(payload.maxSelections || 1)
          : 1
        : 1,
    startAt: payload.startAt ?? null,
    endAt: payload.endAt ?? null,
    status: payload.status,
    createdBy: payload.createdBy ?? actorUid,
    updatedBy: actorUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

function buildVoteMetaPatch(payload, actorUid) {
  return {
    type: payload.type,
    question: payload.title,
    description: payload.summary ?? "",
    options: payload.options ?? [],
    multiple: payload.type === "survey" ? Boolean(payload.multiple) : false,
    anonymous: true,
    allowEdit: false,
    maxSelections:
      payload.type === "survey"
        ? payload.multiple
          ? Number(payload.maxSelections || 1)
          : 1
        : 1,
    startAt: payload.startAt ?? null,
    endAt: payload.endAt ?? null,
    status: payload.status,
    updatedBy: actorUid,
    updatedAt: serverTimestamp(),
  };
}

async function syncVoteDocForPublicIssue(tab, issueId, payload, actorUid) {
  if (tab !== "public") return;

  const voteRef = getVoteRef(issueId);

  if (!isVoteLikeType(payload.type)) {
    const voteSnap = await getDoc(voteRef);
    console.log("SYNC VOTE: notice/sync skip check, vote exists =", voteSnap.exists());

    if (voteSnap.exists()) {
      console.log("SYNC VOTE: 기존 votes 문서 삭제 시도");
      await deleteDoc(voteRef);
      console.log("SYNC VOTE: 기존 votes 문서 삭제 성공");
    }
    return;
  }

  const voteSnap = await getDoc(voteRef);
  console.log("SYNC VOTE: vote-like type =", payload.type, "exists =", voteSnap.exists());

  if (!voteSnap.exists()) {
    console.log("SYNC VOTE: votes 문서 생성 시도");
    await setDoc(voteRef, buildVoteMeta(issueId, payload, actorUid));
    console.log("SYNC VOTE: votes 문서 생성 성공");
    return;
  }

  console.log("SYNC VOTE: votes 문서 업데이트 시도");
  await updateDoc(voteRef, buildVoteMetaPatch(payload, actorUid));
  console.log("SYNC VOTE: votes 문서 업데이트 성공");
}

export async function createIssue(tab, payload, actorUid) {
  const col = getIssueCollection(tab);
  const finalPayload = buildIssuePayload(payload, actorUid);

  console.log("CREATE ISSUE FINAL PAYLOAD:", finalPayload);
  Object.entries(finalPayload).forEach(([key, value]) => {
    console.log(
      "CREATE ISSUE FIELD:",
      key,
      value,
      value === null ? "null" : Array.isArray(value) ? "array" : typeof value
    );
  });

  const issueRef = await addDoc(collection(db, col), finalPayload);

  await syncVoteDocForPublicIssue(tab, issueRef.id, payload, actorUid);

  return issueRef;
}

export async function updateIssue(tab, issueId, payload, actorUid) {
  const issueRef = getIssueRef(tab, issueId);
  const issuePatch = buildIssuePatch(payload, actorUid);

  console.log("UPDATE ISSUE FINAL PATCH:", issuePatch);
  Object.entries(issuePatch).forEach(([key, value]) => {
    console.log(
      "UPDATE ISSUE FIELD:",
      key,
      value,
      value === null ? "null" : Array.isArray(value) ? "array" : typeof value
    );
  });

  console.log("STEP 1: issues_public update 시작");
  await updateDoc(issueRef, issuePatch);
  console.log("STEP 1: issues_public update 성공");

  console.log("STEP 2: syncVoteDocForPublicIssue 시작");
  await syncVoteDocForPublicIssue(tab, issueId, payload, actorUid);
  console.log("STEP 2: syncVoteDocForPublicIssue 성공");
}
export async function archiveIssue(tab, issueId, actorUid) {
  const issueRef = getIssueRef(tab, issueId);
  const snap = await getDoc(issueRef);

  if (!snap.exists()) {
    throw new Error("안건을 찾을 수 없어");
  }

  const issue = snap.data();
  const currentStatus = issue.status || "draft";
  const previousStatus =
    currentStatus === "archived" ? issue.previousStatusBeforeArchive || "draft" : currentStatus;

  await updateDoc(issueRef, {
    active: false,
    status: "archived",
    previousStatusBeforeArchive: previousStatus,
    updatedBy: actorUid,
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (tab === "public" && isVoteLikeType(issue.type)) {
    await updateDoc(getVoteRef(issueId), {
      status: "archived",
      updatedBy: actorUid,
      updatedAt: serverTimestamp(),
    });
  }
}

export async function restoreIssue(tab, issueId, actorUid) {
  const issueRef = getIssueRef(tab, issueId);
  const snap = await getDoc(issueRef);

  if (!snap.exists()) {
    throw new Error("안건을 찾을 수 없어");
  }

  const issue = snap.data();
  const restoredStatus = issue.previousStatusBeforeArchive || "draft";

  const restoredPayload = {
    ...issue,
    status: restoredStatus,
    active: true,
  };

  await updateDoc(issueRef, {
    active: true,
    status: restoredStatus,
    previousStatusBeforeArchive: null,
    archivedAt: null,
    updatedBy: actorUid,
    updatedAt: serverTimestamp(),
  });

  await syncVoteDocForPublicIssue(tab, issueId, restoredPayload, actorUid);
}

export async function hardDeleteIssue(tab, issueId) {
  const issueRef = getIssueRef(tab, issueId);

  if (tab === "public") {
    await deleteDoc(getVoteRef(issueId));
  }

  return deleteDoc(issueRef);
}

export async function changeIssueStatus(tab, issueId, nextStatus, actorUid) {
  const issueRef = getIssueRef(tab, issueId);
  const snap = await getDoc(issueRef);

  if (!snap.exists()) {
    throw new Error("안건을 찾을 수 없어");
  }

  const issue = snap.data();
  const currentStatus = issue.status || "draft";

  const patch = {
    status: nextStatus,
    updatedBy: actorUid,
    updatedAt: serverTimestamp(),
  };

  if (nextStatus === "archived") {
    patch.active = false;
    patch.previousStatusBeforeArchive =
      currentStatus === "archived"
        ? issue.previousStatusBeforeArchive || "draft"
        : currentStatus;
    patch.archivedAt = serverTimestamp();
  } else {
    patch.active = true;
    patch.previousStatusBeforeArchive = null;
    patch.archivedAt = null;
  }

  await updateDoc(issueRef, patch);

  const nextIssuePayload = {
    ...issue,
    ...patch,
    type: issue.type,
    title: issue.title,
    summary: issue.summary,
    options: issue.options ?? [],
    multiple: issue.multiple ?? false,
    maxSelections: issue.maxSelections ?? 1,
    startAt: issue.startAt ?? null,
    endAt: issue.endAt ?? null,
  };

  await syncVoteDocForPublicIssue(tab, issueId, nextIssuePayload, actorUid);
}

export async function reorderIssues(tab, issues, actorUid) {
  const col = getIssueCollection(tab);

  if (!actorUid) {
    throw new Error("순번 정리에 필요한 사용자 UID가 없습니다.");
  }

  // 1) 실제 Firestore에 존재하는 문서 ID 다시 조회
  const snap = await getDocs(query(collection(db, col), orderBy("order", "asc")));
  const existingIds = new Set(snap.docs.map((d) => d.id));

  // 2) 존재하는 문서만 남김
  const safeIssues = issues.filter((it) => existingIds.has(it.docId || it.id));
  const missingIssues = issues.filter((it) => !existingIds.has(it.docId || it.id));

  console.log(
    "reorderIssues existingIds:",
    JSON.stringify([...existingIds], null, 2)
  );

  console.log(
    "reorderIssues safeIssues:",
    JSON.stringify(
      safeIssues.map((it, index) => ({
        index,
        id: it.id,
        docId: it.docId,
        displayId: it.displayId,
        title: it.title,
      })),
      null,
      2
    )
  );

  console.warn(
    "reorderIssues missingIssues:",
    JSON.stringify(
      missingIssues.map((it, index) => ({
        index,
        id: it.id,
        docId: it.docId,
        displayId: it.displayId,
        title: it.title,
      })),
      null,
      2
    )
  );

  if (safeIssues.length === 0) {
    throw new Error("정리할 수 있는 유효 문서가 없습니다.");
  }

  // 3) 실제 존재하는 문서만 순번 재정렬
  const batch = writeBatch(db);

  safeIssues.forEach((it, index) => {
    const targetId = it.docId || it.id;

    batch.update(doc(db, col, targetId), {
      order: index + 1,
      updatedAt: serverTimestamp(),
      updatedBy: actorUid,
    });
  });

  return batch.commit();
}