# 🚀 TagHere Analytics - Render.com 배포 완벽 가이드

## 📌 서비스 개요
- **서비스명**: TagHere Analytics
- **기술스택**: Next.js 16.1.0, MongoDB, SQLite, Recharts
- **인증**: 간단한 로그인 (ID/PW)
- **다크모드**: 완전 지원

---

## 🔐 기본 로그인 정보
```
아이디: taghere
비밀번호: 0614
```

---

## 📋 배포 사전 준비

### 필요한 것들:
1. GitHub 계정
2. Render.com 계정 (무료)
3. MongoDB Atlas 계정 (또는 기존 MongoDB 인스턴스)

---

## 📝 Step 1: GitHub 리포지토리 생성 및 코드 푸시

### 옵션 A: 새 리포지토리 생성
```bash
# GitHub에서 새 리포지토리 생성 후:
cd /Users/zeroclasslab_1/Desktop/Code/taghere-analytics

# 리모트 추가 (YOUR_USERNAME 변경 필수)
git remote add origin https://github.com/YOUR_USERNAME/taghere-analytics.git
git branch -M main
git push -u origin main
```

### 옵션 B: 기존 리포지토리가 있는 경우
```bash
git push origin main
```

**결과**: GitHub에 코드가 푸시됨

---

## 🎯 Step 2: Render.com에서 배포 설정

### 2.1 Render 접속 및 로그인
1. https://render.com 방문
2. "Sign up with GitHub" 클릭
3. GitHub 계정으로 인증

### 2.2 New Web Service 생성
1. Render 대시보드 > **"New"** > **"Web Service"**
2. **"Connect a repository"** 클릭
3. GitHub 계정 인증 (처음만)
4. **taghere-analytics** 리포지토리 선택

### 2.3 배포 설정 입력
다음 정보를 정확히 입력:

| 항목 | 값 |
|------|-----|
| **Name** | `taghere-analytics` |
| **Environment** | `Node` |
| **Region** | `Oregon` (프리 플랜) |
| **Plan** | `Free` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

---

## 🔧 Step 3: 환경 변수 설정 (필수!)

### 3.1 기본 환경 변수 추가
서비스 생성 후 **"Environment"** 탭에서:

```
NODE_ENV = production
SQLITE_DB_PATH = /data/cache.db
CACHE_AUTO_REFRESH = true
CACHE_INCREMENTAL_DAYS = 7
```

### 3.2 MongoDB 환경 변수 추가 (Secret 선택!)
**중요**: 다음은 반드시 **"Secret"** 옵션으로 설정하세요:

```
MONGODB_URI = mongodb+srv://[username]:[password]@[cluster].mongodb.net/[dbname]?retryWrites=true&w=majority
MONGODB_DB_NAME = taghere
MONGODB_CERT_PATH = /etc/ssl/certs/mongodb.pem
```

**MongoDB URI 확인 방법**:
1. MongoDB Atlas > Clusters > Connect
2. "Connection String" 복사
3. username, password, cluster 정보 입력

### 3.3 디스크 스토리지 설정 (선택사항)
Render은 프리 플랜에서 1GB 임시 스토리지 제공 (재배포 시 삭제)
- SQLite 캐시 저장 경로: `/data/cache.db`

---

## ✅ Step 4: 배포 실행

### 4.1 배포 시작
1. 모든 환경 변수 입력 완료 후
2. **"Create Web Service"** 버튼 클릭
3. 배포 시작 (약 5-15분 소요)

### 4.2 배포 모니터링
- Render 대시보드에서 실시간 로그 확인
- **상태**: 
  - 🔵 Building... (진행 중)
  - 🟢 Running (완료)
  - 🔴 Failed (실패 - 로그 확인)

### 4.3 배포 완료 확인
배포 완료 후 **무료 도메인** 제공:
```
https://taghere-analytics.onrender.com
```

---

## 🌐 Step 5: 서비스 접속

### 5.1 브라우저에서 접속
```
https://taghere-analytics.onrender.com
```

### 5.2 로그인
로그인 모달 표시됨:
- **아이디**: `taghere`
- **비밀번호**: `0614`

### 5.3 대시보드 사용
- 다크/라이트 모드 토글 (우상단)
- 날짜 범위 선택 및 프리셋 사용
- 교차판매 분석 데이터 확인
- 로그아웃 (우상단 로그아웃 버튼)

---

## 🎨 기능 설명

### 📊 대시보드
- KPI 카드: GMV, 결제액, 주문 수, 평균 주문액
- 수익 추세: Daily/Weekly/Monthly 집계
- 메뉴 순위: 판매량 기반 상위 메뉴
- 교차판매: 함께 구매되는 메뉴 분석

### 🔍 탐색 페이지
- 매장별 데이터 검색
- 날짜 범위 필터
- 상세 분석

### 🌓 다크모드
- 자동 시스템 감지
- 수동 토글 가능
- 모든 컴포넌트 호환

### 📅 날짜 프리셋
- 오늘
- 지난 7일
- 지난 30일
- 지난 90일
- 지난 180일
- 1년 전체
- 전체 데이터
- 커스텀 범위

---

## ⚠️ 주의사항

### 프리 플랜 제한
- **월 750시간** 무료 (충분함)
- **메모리**: 512MB (프리미엄: 2GB)
- **CPU**: 공유 (대시보드 사용에 충분)
- **자동 슬립**: 15분 요청 없으면 슬립 → 30초 후 재시작

### 성능
- 프리 플랜으로도 대시보드 성능 충분
- MongoDB 쿼리 캐싱 활성화됨
- Next.js 최적화 (Turbopack)

### 데이터 보안
- HTTPS 자동 적용
- MongoDB X.509 인증 지원
- 환경 변수는 Secret으로 암호화
- 로그인 토큰은 localStorage (HttpOnly 아님 - 1차 허들)

---

## 🔧 배포 후 문제 해결

### 빌드 실패
```
❌ Error: npm ERR! code ENOENT
```
**해결책**:
1. GitHub에 `package-lock.json` 확인
2. Render 로그에서 에러 메시지 확인
3. 환경 변수 재설정

### MongoDB 연결 안됨
```
❌ Error: connect ECONNREFUSED
```
**해결책**:
1. MONGODB_URI 확인 (username, password, cluster)
2. MongoDB Atlas 화이트리스트에 모든 IP 허용 (0.0.0.0/0)
3. 연결 문자열 형식 확인

### 페이지가 느림
```
⚠️ 5초 이상 로딩
```
**해결책**:
1. 프리 플랜 리소스 제한 이해
2. 첫 시작 시 자동 슬립 해제 (느림)
3. 데이터 캐시 확인

### 로그인 안됨
```
❌ 아이디/비밀번호 계속 실패
```
**해결책**:
1. 아이디 정확히 입력: `taghere`
2. 비밀번호 정확히 입력: `0614`
3. 브라우저 개발자 도구 > Console 확인
4. 시크릿 창에서 테스트

---

## 📊 배포 후 모니터링

### Render 대시보드
- **Logs**: 실시간 서버 로그
- **Metrics**: CPU, 메모리, 네트워크 사용량
- **Deploys**: 배포 이력 및 상태

### 알림 설정 (선택사항)
1. Render > Settings
2. "Notifications" > Slack/Email 설정
3. 배포 실패/성공 알림 수신

---

## 🚀 고급 설정 (선택사항)

### 커스텀 도메인 연결
1. GoDaddy, Namecheap 등에서 도메인 구입
2. Render > Settings > Custom Domain
3. DNS 레코드 설정

### 자동 배포
- GitHub 푸시 → Render 자동 배포
- 기본 활성화 (main 브랜치)

### 환경 설정 파일
`render.yaml` 이미 프로젝트에 포함됨 (자동 사용)

---

## 📞 지원 및 문제 해결

### 공식 문서
- Render Docs: https://render.com/docs
- Next.js Docs: https://nextjs.org/docs
- MongoDB: https://docs.mongodb.com

### 커뮤니티
- Render Community: https://community.render.com
- GitHub Issues: 프로젝트 리포지토리
- Stack Overflow: next.js, mongodb 태그

### 직접 지원
Render 대시보드 > Help > Contact Support

---

## ✨ 체크리스트

배포 전:
- [ ] GitHub에 코드 푸시됨
- [ ] render.yaml 파일 확인
- [ ] package.json 정확함

배포 중:
- [ ] Render 대시보드에 환경 변수 입력
- [ ] MongoDB 연결 문자열 확인
- [ ] 빌드 로그 모니터링

배포 후:
- [ ] 도메인 접속 가능
- [ ] 로그인 성공
- [ ] 대시보드 데이터 로드
- [ ] 다크모드 토글 작동
- [ ] 날짜 프리셋 변경 작동

---

## 🎉 배포 완료!

축하합니다! TagHere Analytics가 성공적으로 배포되었습니다.

**무료 도메인**: `https://taghere-analytics.onrender.com`

**로그인**: 
- ID: `taghere`
- PW: `0614`

**필요시 변경 가능**: 
- 로그인 정보는 `components/login-modal.tsx`에서 수정 가능
- 환경 변수는 Render 대시보드에서 언제든 변경 가능

---

**마지막 업데이트**: 2025-12-22
**버전**: 1.0.0
**라이센스**: MIT
