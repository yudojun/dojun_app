README.md
# DOJUN_APP

조합원 참여형 의사결정 플랫폼

DOJUN_APP은 노동조합 조합원을 위한 **공지 및 투표 시스템**이다.  
모바일 앱을 통해 조합원들은 쟁점 사항을 확인하고 투표에 참여할 수 있으며  
관리자 페이지를 통해 투표를 생성하고 결과를 관리할 수 있다.

---

# 주요 기능

## 1. 공지 및 쟁점 공유
- 조합원에게 주요 쟁점을 공지
- 모바일 앱에서 카드 형태로 표시

## 2. 조합원 투표
- 쟁점에 대한 찬성 / 반대 / 보류 투표
- 1인 1표 구조

## 3. 투표 결과 시각화
- 실시간 그래프 표시
- 집계 데이터 기반 빠른 결과 표시

## 4. 관리자 시스템
관리자는 다음 작업을 수행할 수 있다.

- 공지 생성
- 투표 생성
- 투표 상태 관리
- 투표 결과 확인

---

# 시스템 구조


Mobile App (Kivy)
↓
Firebase Firestore
↑
Admin Web (React)


Firebase가 **데이터 허브 역할**을 한다.

---

# 기술 스택

## Mobile App
- Python
- Kivy
- KivyMD

## Admin Page
- React
- Vite
- Firebase SDK

## Backend
- Firebase Firestore
- Firebase Authentication

## Build
- Buildozer (Android APK)
- Docker

---

# 프로젝트 폴더 구조


dojun_app/

mobile/ # 모바일 앱 (Kivy)
admin/ # 관리자 웹페이지 (React)
backend/ # 서버 코드
firebase/ # Firebase 설정
build/ # 빌드 환경
docs/ # 프로젝트 문서
tests/ # 테스트 코드


자세한 구조는 다음 문서를 참고한다.


docs/PROJECT_STRUCTURE.md
docs/PROJECT_ARCHITECTURE.md


---

# Firebase 데이터 구조


admins/{uid}

issues_public/{issueId}

issues_private/{issueId}

votes/{issueId}/ballots/{uid}

vote_stats/{issueId}

meta/version


---

# 개발 환경

추천 개발 환경


OS: Ubuntu (WSL2)
Editor: VS Code
Python: 3.12+
Node: 18+


---

# 설치 방법

## 1. 저장소 클론


git clone <repository>
cd dojun_app


---

## 2. Python 가상환경 생성


python -m venv venv
source venv/bin/activate


---

## 3. Python 패키지 설치


pip install -r backend/server/requirements.txt


---

## 4. Firebase 설정

Firebase Admin Key 파일을 다음 위치에 둔다.


firebase/firebase_key.json


주의  
이 파일은 **절대 Git에 업로드하지 않는다.**

---

# 모바일 앱 실행


python -m mobile.main


---

# Android APK 빌드


buildozer android debug


APK는 다음 위치에 생성된다.


bin/


---

# 관리자 페이지 실행


cd admin/unionapp-admin
npm install
npm run dev


---

# 보안 주의사항

다음 파일은 절대 GitHub에 업로드하지 않는다.


firebase_key.json
.env
venv/


`.gitignore`가 이를 자동으로 제외하도록 설정되어 있다.

---

# 향후 개발 계획

- Cloud Function 기반 자동 집계
- 푸시 알림 시스템
- 관리자 통계 대시보드
- 조합원 인증 강화

---

# 프로젝트 목적

이 프로젝트의 목표는 **조합원 중심의 의사결정 플랫폼 구축**이다.

핵심 가치

- 투명성
- 참여
- 신뢰
- 정보 공유

---

# Author

Dojun