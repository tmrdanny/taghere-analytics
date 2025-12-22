# Quick Start Guide

## 로컬 개발 시작하기 (5분)

### 1. 환경 변수 설정
```bash
cp .env.example .env.local
```

`.env.local` 파일을 열어 다음 값들을 설정하세요:
```env
# MongoDB 연결
MONGODB_URI=mongodb+srv://your-cluster.mongodb.net/...
MONGODB_DB_NAME=taghere
MONGODB_CERT_PATH=/Users/zeroclasslab_1/Downloads/keys/mongodb/read_only.pem

# SQLite 캐시
SQLITE_DB_PATH=./data/cache.db
CACHE_REFRESH_TOKEN=your-random-secret-token-here

# 컬렉션
COLLECTION_ORDERS=bills
COLLECTION_PAYMENTS=bills
COLLECTION_MENUS=stores
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 캐시 초기화
```bash
npm run cache:init
```

### 4. 데이터 캐싱 (첫 실행)
```bash
npm run cache:refresh
```

첫 실행 시 MongoDB에서 전체 데이터를 집계하므로 1-2분 소요됩니다.

### 5. 개발 서버 실행
```bash
npm run dev
```

### 6. 브라우저에서 확인
```
http://localhost:3000
```

완료! 🎉

---

## 일상적인 작업

### 캐시 상태 확인
```bash
npm run cache:status
```

### 최신 데이터로 캐시 갱신
```bash
npm run cache:refresh
```

또는 API로:
```bash
curl -X POST http://localhost:3000/api/refresh-cache \
  -H "Content-Type: application/json" \
  -d '{"token":"your-secret-token","mode":"incremental","days":7}'
```

### 전체 데이터 재캐싱
```bash
curl -X POST http://localhost:3000/api/refresh-cache \
  -H "Content-Type: application/json" \
  -d '{"token":"your-secret-token","mode":"full"}'
```

### 프로덕션 빌드
```bash
npm run build
npm start
```

---

## Render 배포 (10분)

### 1. GitHub에 푸시
```bash
git add .
git commit -m "Add SQLite caching layer"
git push
```

### 2. Render Dashboard
1. https://dashboard.render.com 접속
2. "New +" → "Blueprint" 선택
3. GitHub repository 연결
4. `render.yaml` 자동 감지됨

### 3. 환경 변수 설정
Render Dashboard에서 다음 환경 변수를 추가:

```
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=taghere
MONGODB_CERT_PATH=/etc/secrets/mongodb-cert.pem
CACHE_REFRESH_TOKEN=your-strong-random-token
COLLECTION_ORDERS=bills
COLLECTION_PAYMENTS=bills
COLLECTION_MENUS=stores
```

### 4. Secret Files 설정
1. Service Settings → "Secret Files"
2. 새 Secret File 추가:
   - **Filename**: `/etc/secrets/mongodb-cert.pem`
   - **Contents**: X.509 인증서 파일 내용 붙여넣기

### 5. 배포
"Apply" 버튼 클릭 → 5-10분 대기

### 6. 초기 캐싱
배포 완료 후:
```bash
curl -X POST https://your-app.onrender.com/api/refresh-cache \
  -H "Content-Type: application/json" \
  -d '{"token":"your-secret-token","mode":"full"}'
```

### 7. 확인
```
https://your-app.onrender.com
```

완료! 🚀

---

## 주기적 갱신 설정 (Cron Job)

### Render Cron Jobs (권장)
1. Render Dashboard → Cron Jobs → "New Cron Job"
2. 설정:
   - **Name**: weekly-cache-refresh
   - **Schedule**: `0 1 * * 1` (매주 월요일 오전 1시)
   - **Command**:
     ```bash
     curl -X POST https://your-app.onrender.com/api/refresh-cache \
       -H "Content-Type: application/json" \
       -d '{"token":"your-secret-token","mode":"incremental","days":7}'
     ```

---

## 빠른 문제 해결

### 문제: "Cannot connect to MongoDB"
**해결**:
1. `.env.local`에서 `MONGODB_URI` 확인
2. `MONGODB_CERT_PATH` 경로가 정확한지 확인
3. 인증서 파일이 존재하는지 확인: `ls -la /path/to/cert.pem`

### 문제: "SQLite database is locked"
**해결**:
```bash
# 개발 서버 중지
# data/cache.db-wal, data/cache.db-shm 파일 삭제
rm data/cache.db-wal data/cache.db-shm
# 개발 서버 재시작
npm run dev
```

### 문제: 빌드 실패
**해결**:
```bash
# 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# 빌드 재시도
npm run build
```

### 문제: 캐시 데이터가 없음
**해결**:
```bash
# 캐시 상태 확인
npm run cache:status

# 데이터가 없으면 다시 캐싱
npm run cache:refresh
```

---

## 유용한 명령어 모음

```bash
# 개발
npm run dev              # 개발 서버
npm run build            # 프로덕션 빌드
npm start                # 프로덕션 서버

# 캐시 관리
npm run cache:init       # 캐시 초기화
npm run cache:refresh    # 캐시 갱신
npm run cache:status     # 캐시 상태

# MongoDB 탐색
npm run explore          # 스키마 탐색
npm run aggregate run    # 수동 집계 실행

# 기타
npm run lint             # ESLint 실행
```

---

## API 엔드포인트

### GET /api/dashboard
대시보드 데이터 조회

**쿼리 파라미터**:
- `preset`: today, last7days, last30days, thisMonth, lastMonth
- `startDate`: ISO 날짜 (YYYY-MM-DD)
- `endDate`: ISO 날짜 (YYYY-MM-DD)
- `storeIds`: 쉼표로 구분된 스토어 ID
- `limit`: 상위 N개 (기본: 10)

**예시**:
```bash
# 지난 7일
curl http://localhost:3000/api/dashboard?preset=last7days

# 특정 날짜 범위
curl "http://localhost:3000/api/dashboard?startDate=2025-12-01&endDate=2025-12-21"

# 특정 스토어 필터링
curl "http://localhost:3000/api/dashboard?preset=last30days&storeIds=store1,store2"
```

### POST /api/refresh-cache
캐시 수동 갱신 (토큰 인증 필요)

**Body**:
```json
{
  "token": "your-secret-token",
  "mode": "incremental",
  "days": 7
}
```

**예시**:
```bash
# 증분 갱신 (최근 7일)
curl -X POST http://localhost:3000/api/refresh-cache \
  -H "Content-Type: application/json" \
  -d '{"token":"your-token","mode":"incremental","days":7}'

# 전체 갱신
curl -X POST http://localhost:3000/api/refresh-cache \
  -H "Content-Type: application/json" \
  -d '{"token":"your-token","mode":"full"}'
```

---

## 참고 문서

- **구현 요약**: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- **배포 가이드**: [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md)
- **설정 예시**: [.env.example](.env.example)
- **MongoDB 탐색**: `npm run explore`

---

## 지원

문제가 발생하면:
1. [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)의 "트러블슈팅" 섹션 확인
2. Render 로그 확인 (Dashboard → Logs)
3. 로컬에서 `npm run cache:status` 실행하여 캐시 상태 확인
