# ✅ Read-Only 권한으로 대시보드 실행하기

## 변경 완료

**Write 권한 없이** read-only 인증서만으로 대시보드를 실행할 수 있도록 수정했습니다.

## 핵심 변경사항

### 1. 실시간 집계 방식으로 전환

- **기존:** bills → [$merge로 저장] → metrics 컬렉션 → 조회 (❌ Write 필요)
- **변경:** bills → [실시간 집계] → 메모리 → 캐싱 → 조회 (✅ Read-only 가능)

### 2. 수정된 파일

1. **[lib/queries/realtime-dashboard.ts](lib/queries/realtime-dashboard.ts)** - 새로 생성
   - bills 컬렉션에서 직접 실시간 집계
   - `$merge` 없음 (write 불필요)
   - 결과를 메모리에서 계산 후 즉시 반환

2. **[app/api/dashboard/route.ts](app/api/dashboard/route.ts)** - 수정
   - `getRealtimeDashboardKPIs` 사용
   - 5분 캐싱으로 성능 보장

## 실행 방법

### 1. 인덱스 생성 (필수 - 성능을 위해)

MongoDB Atlas Console에서 수동으로 생성:

1. [MongoDB Atlas](https://cloud.mongodb.com) 로그인
2. Database → Browse Collections → `taghere` → `bills`
3. **Indexes** 탭 → **Create Index**

**생성할 인덱스:**

```json
// 인덱스 1
{ "date": 1 }

// 인덱스 2
{ "storeOID": 1, "date": 1 }

// 인덱스 3
{ "storeOID": 1 }
```

각 인덱스 생성 시 **Background: true** 옵션 선택

### 2. 대시보드 실행

```bash
# 개발 모드
npm run dev

# 프로덕션
npm run build
npm start
```

### 3. 브라우저에서 확인

```
http://localhost:3000
```

## 성능 예상

### 인덱스 생성 전
- 첫 로딩: 10-30초 ⚠️
- 캐시 이후: 50ms ✅

### 인덱스 생성 후
- 첫 로딩: 1-3초 ✅
- 캐시 이후: 50ms ✅

## 장점

✅ **보안:** Write 권한 불필요
✅ **실시간:** 항상 최신 데이터
✅ **간단함:** 배치 잡 관리 불필요
✅ **스토리지:** 별도 metrics 컬렉션 불필요

## 주의사항

⚠️ **인덱스는 필수입니다** - 인덱스 없으면 매우 느림
⚠️ **날짜 범위 제한:** 최대 90일 (기본값)
⚠️ **첫 요청은 느림:** 캐시 워밍업 필요

## 환경 변수

```env
# .env.local에 이미 설정되어 있음

# Read-only 인증서 (변경 없음)
MONGODB_CERT_PATH=/Users/zeroclasslab_1/Downloads/keys/mongodb/read_only.pem

# 컬렉션 이름 (변경 없음)
COLLECTION_ORDERS=bills
COLLECTION_MENUS=stores

# 성능 설정 (권장값)
MAX_DATE_RANGE_DAYS=90      # 최대 90일 조회
CACHE_TTL_SECONDS=300       # 5분 캐싱
```

## 다음 단계

1. ✅ 코드 수정 완료
2. ⏳ **MongoDB Atlas에서 인덱스 생성** (필수)
3. ⏳ `npm run dev` 실행
4. ⏳ http://localhost:3000 접속하여 테스트

## 상세 문서

자세한 내용은 [docs/READONLY_SETUP.md](docs/READONLY_SETUP.md)를 참고하세요.
