# DOJUN_APP 프로젝트 구조

Last updated: 2026-03-09  
Author: Dojun

이 프로젝트는 **조합원 참여형 의사결정 플랫폼**을 목표로 하는 시스템이다.

핵심 기능

- 조합원 공지 및 쟁점 공유
- 조합원 투표 시스템
- 투표 결과 실시간 시각화
- 관리자 페이지 운영 관리

전체 시스템은 다음 3개 축으로 구성된다.

- Mobile App (Kivy / KivyMD)
- Admin Web (React / Vite)
- Backend Data (Firebase Firestore)

---

# 1. 전체 시스템 아키텍처

데이터 흐름 구조

Mobile App  
↓  
Firebase Firestore  
↑  
Admin Web

Firebase는 **데이터 허브 역할**을 하며  
모바일 앱과 관리자 웹이 같은 데이터를 공유한다.

---

# 2. 전체 폴더 구조


dojun_app/
│
├ mobile/ # Kivy 기반 모바일 앱
│ ├ main.py
│ ├ dojun.kv
│ ├ api_client.py
│ ├ firestore_client.py
│ ├ assets/
│ ├ fonts/
│ └ data/
│
├ unionapp-admin/ # 관리자 웹페이지 (React)
│ ├ src/
│ ├ public/
│ ├ dist/
│ ├ package.json
│ └ vite.config.js
│
├ server/ # Python 관리자 서버
│ ├ main.py
│ └ requirements.txt
│
├ tests/
│
├ assets/
├ fonts/
├ data/
│
├ buildozer.spec
├ dockerfile
│
├ api_client.py
├ firestore_client.py
│
├ firebase_key.json
├ local_version.json
├ remote_version.json
│
├ .env
├ .gitignore
│
└ venv/


---

# 3. 모바일 앱 구조

모바일 앱은 **Kivy / KivyMD 기반 Android 앱**이다.

핵심 파일


mobile/
├ main.py
├ dojun.kv
├ api_client.py
└ firestore_client.py


주요 기능

- 공지 목록 표시
- 투표 카드 UI
- 투표 참여
- 투표 결과 그래프
- 앱 버전 체크

---

# 4. 관리자 페이지 (React)

관리자 페이지는 **React + Vite 기반 웹 앱**이다.

관리자 기능

- 관리자 로그인
- 공지 생성
- 투표 생성
- 투표 상태 관리
- 투표 결과 확인
- 재집계 기능

---

# 5. 관리자 페이지 구조


unionapp-admin/
└ src/
├ App.jsx
├ firebase.js
├ components/
│ ├ FieldLabel.jsx
│ ├ SectionCard.jsx
│ ├ StatRow.jsx
│ ├ IssueForm.jsx
│ ├ IssueCard.jsx
│ ├ IssueListPanel.jsx
│ ├ VoteDashboard.jsx
│ ├ Toast.jsx
│ └ ConfirmDialog.jsx
├ hooks/
│ ├ useAdminAuth.js
│ ├ useIssues.js
│ ├ useVoteStats.js
│ └ useConfirm.js
├ services/
│ ├ adminService.js
│ ├ issueService.js
│ └ voteService.js
└ styles/
└ ui.js


---

# 6. Firebase 데이터 구조

Firestore Collections


admins/{uid}

issues_public/{issueId}

issues_private/{issueId}

votes/{issueId}/ballots/{uid}

vote_stats/{issueId}

meta/version


설명

admins  
관리자 권한 확인

issues_public  
조합원 공개 쟁점

issues_private  
관리자 내부 쟁점

votes  
조합원 개별 투표

vote_stats  
투표 집계 데이터

meta  
앱 버전 관리

---

# 7. 투표 시스템 구조

투표 데이터 흐름


조합원 투표
↓
votes/{issueId}/ballots/{uid}
↓
집계
↓
vote_stats/{issueId}
↓
앱 그래프 표시


모바일 앱은 **vote_stats만 읽어 결과 그래프를 표시한다.**

---

# 8. 보안 규칙

Firestore Rules

조합원

- 공개 이슈 읽기 가능
- 자신의 투표만 수정 가능
- 투표 결과 읽기 가능

관리자

- 모든 데이터 관리 가능

---

# 9. 개발 환경

개발 환경

OS  
Ubuntu (WSL2)

Editor  
VSCode

Language  
Python

Framework  
Kivy / KivyMD

Backend  
Firebase Firestore

Admin  
React + Vite

---

# 10. 빌드 환경

Android APK 빌드

- Buildozer
- Docker
- WSL2

---

# 11. 향후 개발 계획

예정 기능

- 관리자 투표 재집계 기능
- Cloud Function 기반 자동 집계
- 푸시 알림 시스템
- 앱 자동 업데이트
- 조합원 인증 시스템 강화

---

# 12. 보안 주의사항

다음 파일은 외부 공개 금지


firebase_key.json
.env
venv/
node_modules/
dist/
.buildozer/


---

# 13. 프로젝트 목표

이 프로젝트의 목적

**조합원 참여형 의사결정 플랫폼 구축**

핵심 가치

- 투명성
- 참여
- 실시간 정보 공유
- 조합원 중심 의사결정

---