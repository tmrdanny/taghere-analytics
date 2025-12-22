# Render 배포 가이드

## 1. 사전 준비

### 필요한 파일
- ✅ `render.yaml` - Render 배포 설정 파일
- ✅ MongoDB X.509 인증서: `/Users/zeroclasslab_1/Downloads/keys/mongodb/read_only.pem`
- ✅ `.env.local` - 로컬 환경 변수 (참고용)

## 2. Render 배포 단계

### Step 1: GitHub Repository 연결
1. Render 대시보드 접속: https://dashboard.render.com
2. "New +" → "Blueprint" 선택
3. GitHub repository 연결
4. `render.yaml` 파일이 자동 감지됨

### Step 2: 환경 변수 설정
Render Dashboard에서 다음 환경 변수를 설정하세요:

#### 필수 환경 변수
```bash
# MongoDB 연결
MONGODB_URI=mongodb+srv://<cluster>.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority&appName=<AppName>
MONGODB_DB_NAME=taghere

# 캐시 설정
CACHE_REFRESH_TOKEN=<랜덤한-시크릿-토큰-생성>
CACHE_TTL_SECONDS=300

# 컬렉션 이름
COLLECTION_ORDERS=bills
COLLECTION_PAYMENTS=bills
COLLECTION_MENUS=stores

# 날짜 범위 제한 (일)
MAX_DATE_RANGE_DAYS=90

# 배치 집계 설정
BATCH_INCREMENTAL_DAYS=7
```

#### 환경 변수는 render.yaml에 이미 설정됨
- `NODE_ENV=production`
- `SQLITE_DB_PATH=/data/cache.db`
- `CACHE_AUTO_REFRESH=true`
- `CACHE_INCREMENTAL_DAYS=7`

### Step 3: Secret Files 설정 (X.509 인증서)
1. Render Dashboard → Service Settings → "Secret Files"
2. 새 Secret File 추가:
   - **Filename**: `/etc/secrets/mongodb-cert.pem`
   - **Contents**: `/Users/zeroclasslab_1/Downloads/keys/mongodb/read_only.pem` 파일 내용 복사/붙여넣기

3. 환경 변수에 추가:
   ```bash
   MONGODB_CERT_PATH=/etc/secrets/mongodb-cert.pem
   ```

### Step 4: Persistent Disk 확인
`render.yaml`에 이미 설정되어 있음:
```yaml
disk:
  name: analytics-data
  mountPath: /data
  sizeGB: 1
```

Render가 자동으로 1GB persistent disk를 `/data`에 마운트합니다.

### Step 5: 배포 시작
1. "Apply" 버튼 클릭
2. Render가 자동으로 빌드 및 배포 시작
3. 배포 완료까지 약 5-10분 소요

## 3. 배포 후 초기 설정

### Step 1: 캐시 초기화
배포가 완료되면 첫 캐시를 생성해야 합니다.

**방법 1: API 호출 (권장)**
```bash
curl -X POST https://your-app.onrender.com/api/refresh-cache \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<CACHE_REFRESH_TOKEN>",
    "mode": "full"
  }'
```

**방법 2: Render Shell 접속**
```bash
# Render Dashboard → Shell 탭
npm run cache:init
npm run cache:refresh
```

### Step 2: 캐시 상태 확인
```bash
npm run cache:status
```

출력 예시:
```
=== SQLite Cache Status ===

Cache DB Path: /data/cache.db
File Size: 15.2 MB

Daily Store Metrics:
  Records: 1,250
  Date Range: 2023-01-01 to 2025-12-21

Daily Store Menu Metrics:
  Records: 8,500
  Date Range: 2023-01-01 to 2025-12-21

Hourly Store Metrics:
  Records: 30,000
  Date Range: 2023-01-01 to 2025-12-21

✅ Cache is healthy and ready to serve queries
```

## 4. 주기적 캐시 갱신 설정 (선택 사항)

### 방법 1: Render Cron Jobs
1. Render Dashboard → "Cron Jobs" 탭
2. 새 Cron Job 추가:
   - **Name**: refresh-analytics-cache
   - **Schedule**: `0 1 * * 1` (매주 월요일 오전 1시)
   - **Command**:
     ```bash
     curl -X POST https://your-app.onrender.com/api/refresh-cache \
       -H "Content-Type: application/json" \
       -d '{"token":"<CACHE_REFRESH_TOKEN>","mode":"incremental","days":7}'
     ```

### 방법 2: 외부 Cron 서비스 (예: cron-job.org)
1. https://cron-job.org 접속
2. 새 Cron Job 생성:
   - **URL**: `https://your-app.onrender.com/api/refresh-cache`
   - **Method**: POST
   - **Headers**: `Content-Type: application/json`
   - **Body**:
     ```json
     {
       "token": "<CACHE_REFRESH_TOKEN>",
       "mode": "incremental",
       "days": 7
     }
     ```
   - **Schedule**: 매주 월요일 오전 1시

## 5. 모니터링 및 유지보수

### 로그 확인
Render Dashboard → Logs 탭에서 실시간 로그 확인

### 캐시 통계 API
```bash
curl https://your-app.onrender.com/api/cache-stats
```

### 디스크 사용량 확인
Render Dashboard → Metrics 탭에서 디스크 사용량 확인

### 비용 예상
- **Render Free Tier**: 무료
- **Persistent Disk (1GB)**: 무료 (Free tier 포함)
- **MongoDB 읽기**: ~$0.1/월 (주 1회 집계)
- **총 예상 비용**: **~$0.1/월** 💰

## 6. 트러블슈팅

### 문제 1: "Cannot find module 'better-sqlite3'"
**해결**: Render가 네이티브 모듈을 제대로 빌드했는지 확인
```bash
# render.yaml에서 buildCommand 확인
buildCommand: npm install && npm run build
```

### 문제 2: "ENOENT: no such file or directory '/data'"
**해결**: Persistent Disk가 제대로 마운트되었는지 확인
- Render Dashboard → Storage → analytics-data 확인

### 문제 3: 첫 조회 시 30초 이상 소요
**정상**: 첫 조회 시 MongoDB에서 전체 데이터 집계
- 해결: 배포 후 `/api/refresh-cache`를 수동으로 호출하여 사전 캐싱

### 문제 4: X.509 인증서 오류
**해결**: Secret Files 경로 확인
```bash
# 환경 변수 확인
MONGODB_CERT_PATH=/etc/secrets/mongodb-cert.pem
```

## 7. 성능 체크리스트

배포 후 다음을 확인하세요:

- [ ] 캐시 초기화 완료 (`npm run cache:status`)
- [ ] SQLite 파일이 `/data/cache.db`에 생성됨
- [ ] 대시보드 첫 로딩: ~2-5초 (캐시 있을 때)
- [ ] 대시보드 이후 로딩: ~0.1초 이하
- [ ] MongoDB 읽기 횟수: 주 1회 이하 (증분 업데이트)

## 8. 보안 체크리스트

- [ ] `CACHE_REFRESH_TOKEN`을 강력한 랜덤 값으로 설정
- [ ] MongoDB URI에 read-only 인증 사용
- [ ] Secret Files에 X.509 인증서 안전하게 저장
- [ ] `.env.local` 파일을 Git에 커밋하지 않음 (.gitignore에 포함)

## 9. 배포 완료 후 테스트

### 1. 대시보드 접속
```
https://your-app.onrender.com
```

### 2. API 테스트
```bash
# 지난 7일 데이터
curl https://your-app.onrender.com/api/dashboard?preset=last7days

# 특정 날짜 범위
curl "https://your-app.onrender.com/api/dashboard?startDate=2025-12-01&endDate=2025-12-21"

# 특정 스토어
curl "https://your-app.onrender.com/api/dashboard?preset=last7days&storeIds=store1,store2"
```

### 3. 캐시 상태 확인
```bash
curl https://your-app.onrender.com/api/cache-stats
```

## 10. 다음 단계

배포가 완료되면:
1. ✅ 대시보드 UI 테스트
2. ✅ 다양한 날짜 범위로 성능 테스트
3. ✅ 캐시 갱신 스케줄 설정
4. ✅ 모니터링 대시보드 확인
5. ✅ 사용자에게 URL 공유

---

**참고 문서**:
- Render Blueprints: https://render.com/docs/infrastructure-as-code
- Render Persistent Disks: https://render.com/docs/disks
- Render Secret Files: https://render.com/docs/secret-files
