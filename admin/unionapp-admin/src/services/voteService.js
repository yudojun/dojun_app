import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const COL_VOTES = "votes";
const COL_VOTE_STATS = "vote_stats";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];

  const result = [];
  const seen = new Set();

  for (const item of value) {
    const text = String(item ?? "").trim();
    if (!text) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }

  return result;
}

function normalizeOptionCounts(rawOptionCounts) {
  if (
    !rawOptionCounts ||
    typeof rawOptionCounts !== "object" ||
    Array.isArray(rawOptionCounts)
  ) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(rawOptionCounts).map(([key, value]) => [key, toNumber(value)])
  );
}

function makeEmptyOptionCounts(options = []) {
  const counts = {};
  for (const option of normalizeStringArray(options)) {
    counts[option] = 0;
  }
  return counts;
}

function pickCount(optionCounts, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(optionCounts, key)) {
      return toNumber(optionCounts[key]);
    }
  }
  return 0;
}

function buildLegacyCounts(optionCounts, totalResponses) {
  const yes = pickCount(optionCounts, ["찬성", "yes", "YES"]);
  const no = pickCount(optionCounts, ["반대", "no", "NO"]);
  const hold = pickCount(optionCounts, [
    "보류",
    "기권",
    "무응답",
    "hold",
    "HOLD",
  ]);

  return {
    yes,
    no,
    hold,
    total: toNumber(totalResponses),
  };
}

function normalizeVoteStats(issueId, raw = {}) {
  const hasNewShape =
    raw &&
    typeof raw === "object" &&
    raw.optionCounts &&
    typeof raw.optionCounts === "object" &&
    !Array.isArray(raw.optionCounts);

  const optionCounts = hasNewShape
    ? normalizeOptionCounts(raw.optionCounts)
    : {
        찬성: toNumber(raw.yes),
        반대: toNumber(raw.no),
        보류: toNumber(raw.hold),
      };

  const derivedTotalResponses =
    raw.totalResponses != null
      ? toNumber(raw.totalResponses)
      : raw.total != null
      ? toNumber(raw.total)
      : Object.values(optionCounts).reduce((sum, count) => sum + toNumber(count), 0);

  const legacy = buildLegacyCounts(optionCounts, derivedTotalResponses);

  return {
    issueId,
    totalResponses: derivedTotalResponses,
    optionCounts,
    participationRate: raw.participationRate ?? null,
    lastAggregatedAt: raw.lastAggregatedAt ?? null,
    updatedBy: raw.updatedBy ?? null,

    // 구형 UI 호환
    yes: raw.yes != null ? toNumber(raw.yes) : legacy.yes,
    no: raw.no != null ? toNumber(raw.no) : legacy.no,
    hold: raw.hold != null ? toNumber(raw.hold) : legacy.hold,
    total: raw.total != null ? toNumber(raw.total) : legacy.total,
  };
}

/**
 * vote_stats 실시간 구독
 * - 신형(optionCounts/totalResponses) + 구형(yes/no/hold/total) 동시 지원
 */
export function subscribeVoteStats(issueId, onData, onError) {
  if (!issueId) {
    onData(
      normalizeVoteStats("", {
        totalResponses: 0,
        optionCounts: {},
        participationRate: null,
        lastAggregatedAt: null,
        updatedBy: null,
        yes: 0,
        no: 0,
        hold: 0,
        total: 0,
      })
    );
    return () => {};
  }

  const ref = doc(db, COL_VOTE_STATS, issueId);

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(
          normalizeVoteStats(issueId, {
            totalResponses: 0,
            optionCounts: {},
            participationRate: null,
            lastAggregatedAt: null,
            updatedBy: null,
            yes: 0,
            no: 0,
            hold: 0,
            total: 0,
          })
        );
        return;
      }

      const raw = snap.data() || {};
      onData(normalizeVoteStats(issueId, raw));
    },
    onError
  );
}

/**
 * 투표 생성 직후 vote_stats 초기 문서 생성
 */
export async function initVoteStats(issueId, options = []) {
  if (!issueId) {
    throw new Error("initVoteStats: issueId가 없습니다.");
  }

  const normalizedOptions = normalizeStringArray(options);
  const optionCounts = makeEmptyOptionCounts(normalizedOptions);
  const legacy = buildLegacyCounts(optionCounts, 0);

  const payload = {
    issueId,
    totalResponses: 0,
    optionCounts,
    participationRate: null,
    lastAggregatedAt: null,
    updatedBy: "system",

    // 구형 호환
    yes: legacy.yes,
    no: legacy.no,
    hold: legacy.hold,
    total: legacy.total,
  };

  await setDoc(doc(db, COL_VOTE_STATS, issueId), payload, { merge: true });
  return payload;
}

/**
 * ballots 전체를 다시 읽어서 vote_stats 재집계
 * - selectedOptions 기준
 * - 신형 + 구형 필드 동시 저장
 */
export async function recountVoteStats(issueId) {
  if (!issueId) {
    throw new Error("recountVoteStats: issueId가 없습니다.");
  }

  const voteRef = doc(db, COL_VOTES, issueId);
  const voteSnap = await getDoc(voteRef);

  let configuredOptions = [];
  if (voteSnap.exists()) {
    const voteData = voteSnap.data() || {};
    configuredOptions = normalizeStringArray(voteData.options);
  }

  const optionCounts = makeEmptyOptionCounts(configuredOptions);

  const ballotsRef = collection(db, COL_VOTES, issueId, "ballots");
  const ballotsSnap = await getDocs(ballotsRef);

  let totalResponses = 0;

  ballotsSnap.forEach((ballotDoc) => {
    const ballot = ballotDoc.data() || {};
    const selectedOptions = normalizeStringArray(ballot.selectedOptions);

    if (selectedOptions.length === 0) return;

    // ballot 1개 = 응답 1개
    totalResponses += 1;

    // 한 ballot 안 중복 제거
    const uniqueSelected = [...new Set(selectedOptions)];

    for (const option of uniqueSelected) {
      if (!(option in optionCounts)) {
        optionCounts[option] = 0;
      }
      optionCounts[option] += 1;
    }
  });

  const legacy = buildLegacyCounts(optionCounts, totalResponses);

  const payload = {
    issueId,
    totalResponses,
    optionCounts,
    participationRate: null,
    lastAggregatedAt: serverTimestamp(),
    updatedBy: "system",

    // 구형 UI 호환
    yes: legacy.yes,
    no: legacy.no,
    hold: legacy.hold,
    total: legacy.total,
  };

  await setDoc(doc(db, COL_VOTE_STATS, issueId), payload, { merge: true });
  return payload;
}