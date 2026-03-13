import {
  addDoc,
  collection,
  deleteDoc,
  doc,
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
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
    await deleteDoc(voteRef);
    return;
  }

  const voteSnap = await getDoc(voteRef);

  if (!voteSnap.exists()) {
    await setDoc(voteRef, buildVoteMeta(issueId, payload, actorUid));
    return;
  }

  await updateDoc(voteRef, buildVoteMetaPatch(payload, actorUid));
}

export async function createIssue(tab, payload, actorUid) {
  const col = getIssueCollection(tab);

  const issueRef = await addDoc(
    collection(db, col),
    buildIssuePayload(payload, actorUid)
  );

  await syncVoteDocForPublicIssue(tab, issueRef.id, payload, actorUid);

  return issueRef;
}

export async function updateIssue(tab, issueId, payload, actorUid) {
  const issueRef = getIssueRef(tab, issueId);

  await updateDoc(issueRef, buildIssuePatch(payload, actorUid));
  await syncVoteDocForPublicIssue(tab, issueId, payload, actorUid);
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

export async function reorderIssues(tab, issues) {
  const col = getIssueCollection(tab);
  const batch = writeBatch(db);

  issues.forEach((it, index) => {
    batch.update(doc(db, col, it.id), {
      order: index + 1,
      updatedAt: serverTimestamp(),
    });
  });

  return batch.commit();
}