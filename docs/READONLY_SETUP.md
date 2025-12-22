# Read-Only 권한으로 대시보드 운영하기

## 개요

이 문서는 **write 권한 없이** read-only 인증서만으로 대시보드를 운영하는 방법을 설명합니다.

## 아키텍처 변경

### 기존 방식 (Pre-aggregation)
```
bills (7.6M) → [배치 집계 + $merge] → metrics_daily_store → [대시보드 조회]
                    ❌ Write 권한 필요
```

### 새로운 방식 (Real-time Aggregation)
```
bills (7.6M) → [실시간 집계] → 메모리 → [캐싱 5분] → 대시보드
                ✅ Read-only 가능
```

## 주요 변경사항

### 1. 실시간 집계 쿼리 사용

**파일:** [lib/queries/realtime-dashboard.ts](../lib/queries/realtime-dashboard.ts)

- `$merge` 연산자 제거 (write 불필요)
- bills 컬렉션에서 직접 집계
- 결과를 메모리에서 계산 후 반환
- 5분 캐싱으로 성능 보장

### 2. API 라우트 수정

**파일:** [app/api/dashboard/route.ts](../app/api/dashboard/route.ts)

```typescript
// 변경 전
import { getDashboardKPIs } from '@/lib/queries/dashboard';

// 변경 후
import { getRealtimeDashboardKPIs } from '@/lib/queries/realtime-dashboard';
```

### 3. 날짜 범위 제한

실시간 집계는 사전 집계보다 비용이 높으므로 날짜 범위를 제한합니다:

```env
# .env.local
MAX_DATE_RANGE_DAYS=90  # 기존 180일 → 90일
```

## 성능 최적화

### 1. 필수 인덱스 생성 (MongoDB Atlas Console)

Bills 컬렉션에 인덱스를 생성하면 쿼리 성능이 크게 향상됩니다.

#### Atlas Console에서 인덱스 생성하기

1. [MongoDB Atlas](https://cloud.mongodb.com) 로그인
2. **Database** → 클러스터 선택 → **Browse Collections**
3. `taghere` 데이터베이스 → `bills` 컬렉션 선택
4. **Indexes** 탭 클릭
5. **Create Index** 버튼 클릭

#### 생성할 인덱스

**인덱스 1: 날짜 기반 조회**
```json
{
  "date": 1
}
```
Options:
- Name: `date_1`
- Background: `true`

**인덱스 2: 가맹점별 날짜 조회**
```json
{
  "storeOID": 1,
  "date": 1
}
```
Options:
- Name: `storeOID_1_date_1`
- Background: `true`

**인덱스 3: 가맹점별 조회**
```json
{
  "storeOID": 1
}
```
Options:
- Name: `storeOID_1`
- Background: `true`

### 2. 캐싱 전략

```typescript
// 5분 캐싱 (환경변수로 조정 가능)
CACHE_TTL_SECONDS=300
```

- 같은 날짜 범위 요청 시 캐시에서 즉시 반환
- MongoDB 쿼리 횟수 대폭 감소
- 최대 5분 지연 허용 (실시간성 vs 성능 트레이드오프)

### 3. 쿼리 최적화

**날짜 필터링:**
```javascript
// date 필드가 문자열이므로 $substr로 날짜 부분 추출
{
  $expr: {
    $and: [
      { $gte: [{ $substr: ['$date', 0, 10] }, startDateStr] },
      { $lte: [{ $substr: ['$date', 0, 10] }, endDateStr] }
    ]
  }
}
```

**가맹점 조인:**
```javascript
{
  $lookup: {
    from: 'stores',
    localField: 'storeOID',
    foreignField: '_id',
    as: 'storeInfo'
  }
}
```

## 성능 벤치마크 (예상)

### 인덱스 없을 때
- 7일 조회: ~10초
- 30일 조회: ~30초
- 90일 조회: ~60초

### 인덱스 있을 때
- 7일 조회: ~1-2초 (캐시 없음), ~50ms (캐시 있음)
- 30일 조회: ~3-5초 (캐시 없음), ~50ms (캐시 있음)
- 90일 조회: ~8-10초 (캐시 없음), ~50ms (캐시 있음)

## 운영 가이드

### 1. 대시보드 실행

```bash
# 개발 모드
npm run dev

# 프로덕션 빌드
npm run build
npm start
```

### 2. 환경 변수 확인

```env
# Read-only 인증서
MONGODB_CERT_PATH=/path/to/read_only.pem

# 컬렉션 이름
COLLECTION_ORDERS=bills
COLLECTION_MENUS=stores

# 성능 설정
MAX_DATE_RANGE_DAYS=90
CACHE_TTL_SECONDS=300
```

### 3. 모니터링

#### MongoDB Atlas 성능 모니터링

1. Atlas Console → **Metrics** 탭
2. 확인 항목:
   - Query Execution Time
   - Index Usage
   - Read Operations
   - Network Traffic

#### 애플리케이션 로그

```bash
# 서버 로그 확인
tail -f logs/app.log

# 캐시 히트율 확인
grep "cached: true" logs/app.log | wc -l
grep "cached: false" logs/app.log | wc -l
```

## 장단점 비교

### Read-only 실시간 집계 방식

**장점:**
- ✅ Write 권한 불필요 (보안 향상)
- ✅ 별도 집계 컬렉션 불필요 (스토리지 절약)
- ✅ 항상 최신 데이터 (실시간성)
- ✅ 유지보수 간단 (배치 잡 불필요)

**단점:**
- ⚠️ 첫 요청 시 느림 (인덱스 필수)
- ⚠️ MongoDB 읽기 부하 증가
- ⚠️ 날짜 범위 제한 필요

### Pre-aggregation 방식 (비교)

**장점:**
- ✅ 조회 속도 매우 빠름
- ✅ 긴 날짜 범위 가능
- ✅ MongoDB 읽기 부하 낮음

**단점:**
- ❌ Write 권한 필요
- ❌ 스토리지 추가 필요
- ❌ 배치 잡 관리 필요
- ❌ 데이터 지연 (배치 주기만큼)

## 비용 분석

### MongoDB Atlas 비용

**Read Operations (read-only 방식):**
- 7일 조회: ~1,000 reads (캐시 미스 시)
- 캐시 히트율 80% 가정: 200 reads/요청
- 일일 100 요청: 20,000 reads/day

**Storage (pre-aggregation 방식):**
- metrics 컬렉션: ~100MB (추가 스토리지)
- Write operations: ~10,000/day

**결론:**
- 소규모 (일일 요청 < 1,000): Read-only 방식 유리
- 대규모 (일일 요청 > 10,000): Pre-aggregation 방식 유리

## 문제 해결

### 쿼리가 너무 느림

**원인:** 인덱스 미생성

**해결:**
1. MongoDB Atlas Console에서 인덱스 생성 확인
2. Explain Plan으로 인덱스 사용 확인:
   ```javascript
   db.bills.explain("executionStats").aggregate([...])
   ```

### 캐시가 작동하지 않음

**원인:** 날짜 파라미터가 매번 다름

**해결:**
- 프리셋 사용 권장 (today, last7days, last30days)
- 커스텀 날짜는 startOfDay/endOfDay로 정규화

### 메모리 부족

**원인:** 대용량 결과셋

**해결:**
1. `MAX_DATE_RANGE_DAYS` 축소
2. `limit` 파라미터 축소
3. 서버 메모리 증설

## 다음 단계

### 1. 인덱스 생성 (필수)
- [ ] MongoDB Atlas Console에서 bills 컬렉션 인덱스 생성

### 2. 성능 테스트
- [ ] 7일/30일/90일 범위 조회 속도 확인
- [ ] 캐시 히트율 모니터링

### 3. 프로덕션 배포
- [ ] 환경 변수 설정 확인
- [ ] 빌드 및 배포
- [ ] Atlas 성능 지표 모니터링

## 참고 문서

- [MongoDB Aggregation Pipeline](https://www.mongodb.com/docs/manual/core/aggregation-pipeline/)
- [MongoDB Indexes](https://www.mongodb.com/docs/manual/indexes/)
- [X.509 Authentication](./X509_AUTHENTICATION.md)
- [Schema Detection](./SCHEMA_DETECTION_KR.md)
