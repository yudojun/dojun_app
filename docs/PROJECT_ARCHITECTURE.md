DOJUN_APP 시스템 아키텍처

Last updated: 2026-03-08
Author: Dojun

이 프로젝트는 모바일 앱 + 관리자 웹 + Firebase 백엔드 구조로 구성된
조합원 참여형 의사결정 플랫폼이다.

목표

조합원 공지 전달

조합원 투표 시스템

투표 결과 실시간 시각화

관리자 기반 운영

1. 전체 시스템 구조
조합원 모바일 앱 (Kivy)
        │
        │ REST / Firebase API
        ▼
Firebase Firestore
        │
        │ 관리자 접근
        ▼
관리자 웹페이지 (React)

즉 핵심 구조는 다음과 같다.

Mobile App
      ↓
Firebase Firestore
      ↑
Admin Web

Firebase가 데이터 중심 허브 역할을 한다.

2. 주요 구성 요소
2.1 모바일 앱

기술

Python

Kivy / KivyMD

역할

공지 목록 표시

투표 카드 UI

투표 참여

투표 결과 그래프

앱 버전 확인

데이터 흐름

앱 실행
   ↓
issues_public 읽기
   ↓
투표 카드 표시
   ↓
사용자 투표
   ↓
votes/{issueId}/ballots/{uid} 저장
2.2 Firebase Firestore

Firebase는 데이터 저장소 및 권한 관리 시스템이다.

주요 역할

투표 데이터 저장

투표 집계 관리

관리자 권한 관리

앱 데이터 제공

Firestore 구조

admins
issues_public
issues_private
votes
vote_stats
meta
2.3 관리자 웹페이지

기술

React

Vite

Firebase SDK

역할

공지 생성

투표 생성

투표 상태 관리

투표 결과 확인

재집계 기능

데이터 흐름

관리자 로그인
   ↓
공지 생성
   ↓
issues_public 생성
   ↓
투표 생성
   ↓
vote_stats 초기화
3. 투표 시스템 구조

투표 시스템은 4단계 구조로 설계되어 있다.

투표 생성
   ↓
조합원 투표
   ↓
데이터 저장
   ↓
결과 집계

실제 데이터 흐름

사용자 투표
     ↓
votes/{issueId}/ballots/{uid}
     ↓
집계
     ↓
vote_stats/{issueId}
     ↓
그래프 표시

앱은 vote_stats만 읽는다.

이 구조의 장점

빠른 그래프 표시

네트워크 비용 감소

대규모 사용자 대응

4. 권한 구조

Firestore Rules 기반 권한 관리

조합원

가능

공개 이슈 읽기

자신의 투표 작성

투표 결과 읽기

불가능

다른 사람 투표 수정

관리자 데이터 접근

관리자

가능

공지 생성

투표 생성

투표 상태 변경

결과 관리

관리자 권한 확인

admins/{uid}
5. 앱 버전 관리 구조

앱은 Firebase를 통해 버전 업데이트 체크를 수행한다.

앱 시작
   ↓
meta/version 읽기
   ↓
local_version.json 비교
   ↓
업데이트 필요 여부 확인

이 구조의 장점

앱 강제 업데이트 가능

버전 관리 간단

6. 투표 집계 전략

현재 전략

ballots 저장
   ↓
관리자 재집계
   ↓
vote_stats 갱신

향후 개선 계획

ballots 변경
   ↓
Cloud Function
   ↓
vote_stats 자동 업데이트

이 구조는

데이터 조작 방지

자동 집계

서버 안정성

을 제공한다.

7. 빌드 및 배포 구조

Android 앱 빌드

VSCode
  ↓
WSL2
  ↓
Buildozer
  ↓
APK 생성

Docker는 빌드 환경 통일을 위해 사용된다.

8. 향후 시스템 확장 계획

예정 기능

1. 자동 집계 시스템

Cloud Function 기반 vote_stats 자동 업데이트

2. 푸시 알림

공지 및 투표 알림

3. 조합원 인증 강화

UID 기반 투표 제한

4. 통계 대시보드

관리자용 투표 분석

9. 시스템 철학

이 시스템의 핵심 목표는 다음이다.

조합원 참여형 의사결정 플랫폼

핵심 가치

투명성

참여

신뢰

정보 공유

10. 프로젝트 상태

현재 개발 단계

모바일 앱 구조 완성
Firebase 연동 완료
투표 시스템 작동
관리자 페이지 구축

다음 단계

투표 집계 자동화
푸시 알림
관리자 기능 강화