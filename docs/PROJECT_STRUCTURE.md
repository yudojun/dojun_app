DOJUN_APP 프로젝트 구조

Last updated: 2026-03-08
Author: Dojun

현재 프로젝트는 모바일 앱 + 관리자 페이지 + Firebase 기반 투표 시스템으로 구성되어 있다.

핵심 목적은 다음과 같다.

조합원 공지 및 쟁점 공유

조합원 투표 기능

투표 결과 실시간 시각화

관리자 페이지를 통한 운영 관리

1. 전체 폴더 구조
dojun_app/
│
├ mobile/                     # Kivy 기반 모바일 앱
│   ├ main.py
│   ├ dojun.kv
│   ├ api_client.py
│   ├ firestore_client.py
│   ├ assets/
│   ├ fonts/
│   └ data/
│
├ unionapp-admin/             # 관리자 웹페이지 (React)
│   ├ src/
│   ├ public/
│   ├ dist/
│   ├ package.json
│   └ vite.config.js
│
├ server/                     # Python 관리자 서버
│   ├ main.py
│   └ requirements.txt
│
├ tests/                      # 테스트 코드
│
├ assets/                     # 앱 공용 리소스
├ fonts/                      # 폰트 파일
├ data/                       # 앱 내부 데이터
│
├ buildozer.spec              # Android APK 빌드 설정
├ dockerfile                  # Docker 빌드 환경
│
├ api_client.py               # Firebase REST API 클라이언트
├ firestore_client.py         # Firestore 접근 모듈
│
├ firebase_key.json           # Firebase 관리자 인증키 (공개 금지)
├ local_version.json          # 로컬 앱 버전
├ remote_version.json         # Firebase 앱 버전
│
├ .env                        # 환경 변수
├ .gitignore
│
└ venv/                       # Python 가상환경
2. 모바일 앱 구조

모바일 앱은 Kivy / KivyMD 기반 Android 앱이다.

핵심 파일

mobile/
 ├ main.py          # 앱 메인 로직
 ├ dojun.kv         # UI 레이아웃
 ├ api_client.py    # Firebase REST API 호출
 └ firestore_client.py

주요 기능

공지 목록 표시

투표 카드 UI

투표 참여

투표 결과 그래프

앱 버전 체크

3. 관리자 페이지

관리자 페이지는 React + Vite 기반 웹 앱이다.

unionapp-admin/
 ├ src/
 │   ├ App.jsx
 │   ├ firebase.js
 │   └ index.css
 │
 ├ public/
 ├ dist/
 ├ package.json
 └ vite.config.js

관리자 페이지 주요 기능

공지 등록

투표 생성

투표 상태 관리

투표 결과 확인

4. Firebase 데이터 구조

현재 Firestore 구조

admins/{uid}

issues_public/{issueId}

issues_private/{issueId}

votes/{issueId}/ballots/{uid}

vote_stats/{issueId}

meta/version

설명

admins

관리자 권한 체크

issues_public

조합원에게 보여지는 투표/공지

issues_private

관리자 내부 정보

votes

조합원 개별 투표 데이터

vote_stats

투표 집계 데이터

meta

앱 버전 관리

5. 투표 시스템 구조

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

앱은 vote_stats만 읽어 그래프를 표시한다.

6. 보안 규칙

Firestore Rules 구조

조합원

공개 이슈 읽기 가능

자신의 투표만 수정 가능

투표 결과 읽기 가능

관리자

모든 데이터 관리 가능

7. 개발 환경

개발 환경

OS: Ubuntu (WSL2)
Editor: VSCode
Language: Python
Framework: Kivy / KivyMD
Backend: Firebase Firestore
Admin: React + Vite
8. 빌드 환경

Android APK 빌드

Buildozer
Docker
WSL2
9. 향후 개발 계획

다음 개발 예정 기능

관리자 투표 재집계 기능

Cloud Function 기반 자동 집계

푸시 알림 시스템

앱 자동 업데이트

조합원 인증 시스템 강화

10. 주의사항

다음 파일은 외부 공개 금지

firebase_key.json
.env
venv/
node_modules/
dist/
.buildozer/
11. 프로젝트 목적

이 프로젝트는

조합원 참여형 의사결정 플랫폼 구축

을 목표로 한다.

핵심 가치

투명성

참여

실시간 정보 공유

조합원 중심 의사결정

도준, 이 문서는 프로젝트 기록용 1.0 버전이다.