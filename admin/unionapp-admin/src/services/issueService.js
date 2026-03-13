import {
  addDoc,
  collection,
  deleteDoc,
  doc,
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
    maxSelections: payload.maxSelections ?? null,
    order: payload.order ?? 1,
    active: payload.active ?? true,
    createdBy: payload.createdBy ?? actorUid,
    updatedBy: actorUid,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
}

function buildVoteMeta(issueId, payload, actorUid) {
  return {
    issueId,
    type: payload.type, // vote | survey
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

export async function createIssue(tab, payload, actorUid) {
  const col = getIssueCollection(tab);

  const issueRef = await addDoc(
    collection(db, col),
    buildIssuePayload(payload, actorUid)
  );

  if (tab === "public" && (payload.type === "vote" || payload.type === "survey")) {
    await setDoc(
      doc(db, COL_VOTES, issueRef.id),
      buildVoteMeta(issueRef.id, payload, actorUid)
    );
  }

  return issueRef;
}

export async function updateIssue(tab, issueId, payload, actorUid) {
  const col = getIssueCollection(tab);

  const issuePatch = {
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
    maxSelections: payload.maxSelections ?? null,
    order: payload.order ?? 1,
    active: payload.active ?? true,
    updatedBy: actorUid,
    updated_at: serverTimestamp(),
  };

  await updateDoc(doc(db, col, issueId), issuePatch);

  if (tab === "public" && (payload.type === "vote" || payload.type === "survey")) {
    await setDoc(
      doc(db, COL_VOTES, issueId),
      {
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
        updatedBy: actorUid,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

export async function archiveIssue(tab, issueId, actorUid) {
  const col = getIssueCollection(tab);

  await updateDoc(doc(db, col, issueId), {
    active: false,
    status: "archived",
    updatedBy: actorUid,
    archived_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  if (tab === "public") {
    await setDoc(
      doc(db, COL_VOTES, issueId),
      {
        status: "archived",
        updatedBy: actorUid,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

export async function restoreIssue(tab, issueId, actorUid) {
  const col = getIssueCollection(tab);

  await updateDoc(doc(db, col, issueId), {
    active: true,
    updatedBy: actorUid,
    updated_at: serverTimestamp(),
  });
}

export async function hardDeleteIssue(tab, issueId) {
  const col = getIssueCollection(tab);
  return deleteDoc(doc(db, col, issueId));
}

export async function changeIssueStatus(tab, issueId, nextStatus, actorUid) {
  const col = getIssueCollection(tab);

  const patch = {
    status: nextStatus,
    updatedBy: actorUid,
    updated_at: serverTimestamp(),
  };

  if (nextStatus === "archived") {
    patch.active = false;
    patch.archived_at = serverTimestamp();
  } else {
    patch.active = true;
  }

  await updateDoc(doc(db, col, issueId), patch);

  if (tab === "public") {
    await setDoc(
      doc(db, COL_VOTES, issueId),
      {
        status: nextStatus,
        updatedBy: actorUid,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

export async function reorderIssues(tab, issues) {
  const col = getIssueCollection(tab);
  const batch = writeBatch(db);

  issues.forEach((it, index) => {
    batch.update(doc(db, col, it.id), {
      order: index + 1,
      updated_at: serverTimestamp(),
    });
  });

  return batch.commit();
}