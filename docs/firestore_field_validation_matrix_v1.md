# Firestore 필드 검증 기준표 v1

## 1. admins/{uid}
- role: 필수, "super_admin" | "editor" | "viewer"
- active: 필수, boolean
- displayName: 필수, string
- createdAt: 필수, timestamp
- updatedAt: 필수, timestamp

## 2. issues_public/{issueId}
- type: 필수, "notice" | "vote" | "survey"
- title: 필수, string
- summary: 필수, string
- category: 필수, string
- scope: 필수, string
- status: 필수, "draft" | "review" | "open" | "closed" | "archived"
- startAt: 선택, timestamp | null
- endAt: 선택, timestamp | null
- resultVisibility: 필수, "public" | "after_close" | "admin_only"
- isPinned: 필수, boolean
- createdAt: 필수, timestamp
- updatedAt: 필수, timestamp
- createdBy: 필수, string
- updatedBy: 필수, string
- active: 필수, boolean

## 3. issues_private/{issueId}
- internalMemo: 필수, string
- reviewComment: 필수, string
- ownerUid: 필수, string
- lastReviewedBy: 선택, string | null
- lastReviewedAt: 선택, timestamp | null
- visibilityNote: 선택, string | null
- createdAt: 필수, timestamp
- updatedAt: 필수, timestamp

## 4. votes/{issueId}
- issueId: 필수, 문서 ID와 동일
- type: 필수, "vote" | "survey"
- question: 필수, string
- description: 필수, string
- options: 필수, array<string>, 최소 1개
- multiple: 필수, boolean
- anonymous: 필수, boolean
- allowEdit: 필수, boolean
- maxSelections: 선택, int | null
- startAt: 필수, timestamp
- endAt: 필수, timestamp
- status: 필수, "draft" | "review" | "open" | "closed" | "archived"
- createdAt: 필수, timestamp
- updatedAt: 필수, timestamp
- createdBy: 필수, string
- updatedBy: 필수, string

### 추가 규칙
- startAt < endAt
- multiple == false 이면 maxSelections는 null 또는 1
- 공지(notice)는 votes 문서를 만들지 않음

## 5. votes/{issueId}/ballots/{uid}
- uid: 필수, 문서 ID와 동일
- issueId: 필수, 상위 issueId와 동일
- type: 필수, "vote" | "survey"
- selectedOptions: 필수, array<string>, 최소 1개
- submittedAt: 필수, timestamp
- updatedAt: 필수, timestamp
- departmentId: 선택, string | null
- memberId: 선택, string | null

### 추가 규칙
- 본인 uid만 작성 가능
- issue.status == "open" 일 때만 생성 가능
- selectedOptions 길이는 maxSelections 이하
- multiple == false 이면 selectedOptions 길이는 1
- 수정/삭제 금지

## 6. vote_stats/{issueId}
- issueId: 필수, string
- totalResponses: 필수, number
- optionCounts: 필수, map<string, number>
- participationRate: 선택, number | null
- lastAggregatedAt: 필수, timestamp
- updatedBy: 필수, "system"

### 추가 규칙
- 클라이언트 read 가능
- 클라이언트 write 금지
- 서버 집계만 허용

## 7. admin_logs/{logId}
- uid: 필수, 현재 관리자 uid와 동일
- action: 필수, "create" | "update" | "delete" | "restore" | "open" | "close" | "archive" | "recount" | "grant_admin" | "revoke_admin"
- targetType: 필수, "issue" | "vote" | "stats" | "admin"
- targetId: 필수, string
- before: 선택, map | null
- after: 선택, map | null
- createdAt: 필수, timestamp

### 추가 규칙
- 생성만 가능
- 수정/삭제 금지

## 8. meta/version
- latestVersion: 필수, string
- minimumVersion: 필수, string
- updateRequired: 필수, boolean
- message: 필수, string
- updatedAt: 필수, timestamp