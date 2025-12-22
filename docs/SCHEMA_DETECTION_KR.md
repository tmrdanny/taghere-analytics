# MongoDB 스키마 자동 감지 및 필드 매핑

## 요약

MongoDB 스키마를 자동으로 감지하고 집계 파이프라인을 실제 필드명에 맞춰 조정했습니다.

## 감지된 스키마

### Bills 컬렉션 (주문 데이터)

총 문서 수: **7,630,368개**

| 예상 필드명 | 실제 MongoDB 필드 | 타입 | 예시 값 |
|-----------|------------------|------|---------|
| storeId | `storeOID` | ObjectId | ObjectId("63a02535...") |
| createdAt | `date` | string | "2023-03-24 17:36:13" |
| totalAmount | `resultPrice` | string | "3500" |
| items | `items` | string (JSON) | '[{"label":"아이스 아메리카노","price":"3500","count":1}]' |

**주요 특징:**
- 날짜가 문자열로 저장됨: `"YYYY-MM-DD HH:mm:ss"` 형식
- 가격이 문자열로 저장됨 (숫자가 아님)
- 주문 항목이 JSON 문자열로 저장됨 (배열이 아님)

### Stores 컬렉션 (가맹점 정보)

총 문서 수: **2,101개**

| 예상 필드명 | 실제 MongoDB 필드 | 타입 | 예시 값 |
|-----------|------------------|------|---------|
| storeId | `_id` | ObjectId | ObjectId("636d45f0...") |
| storeName | `label` | string | "얼스어스" |
| name | `name` | string | "earth-us" |

## 자동 적용된 변경사항

### ✅ 완료된 작업

1. **스키마 탐색 스크립트 생성** ([scripts/explore-schema.ts](../scripts/explore-schema.ts))
   - 실제 MongoDB 컬렉션 구조 분석
   - 필드명, 타입, 샘플 값 자동 감지

2. **필드 매핑 설정 파일 생성** ([lib/config/field-mappings.ts](../lib/config/field-mappings.ts))
   - 표준 필드명 → 실제 필드명 매핑

3. **집계 파이프라인 자동 수정** ([lib/aggregation/pipeline.ts](../lib/aggregation/pipeline.ts))
   - `storeOID` 사용 (기존 `storeId` 대신)
   - `date` 문자열 처리 (기존 `createdAt` Date 대신)
   - `resultPrice` 문자열 → 숫자 변환
   - stores 컬렉션 lookup으로 `label` 가져오기

### 📝 주요 수정 내용

**날짜 필터링:**
```javascript
// 문자열 날짜 처리
{
  $addFields: {
    dateOnly: { $substr: ['$date', 0, 10] }  // "2023-03-24" 추출
  }
}
```

**가격 변환:**
```javascript
// 문자열 → 숫자 변환
gmv: { $sum: { $toDouble: '$resultPrice' } }
```

**가맹점명 가져오기:**
```javascript
// stores 컬렉션과 조인
{
  $lookup: {
    from: 'stores',
    localField: 'storeOID',
    foreignField: '_id',
    as: 'storeInfo'
  }
}
```

## 다음 단계 (필수)

### ⚠️ 중요: 권한 문제 해결 필요

현재 사용 중인 `read_only.pem` 인증서는 **읽기 전용**이라 집계를 실행할 수 없습니다.

집계를 실행하려면:

### 옵션 1: 쓰기 권한 인증서 사용 (권장)

1. MongoDB Atlas에서 읽기/쓰기 권한이 있는 X.509 인증서 발급
2. `.env.local` 업데이트:
   ```env
   MONGODB_CERT_PATH=/path/to/read_write.pem
   ```

### 옵션 2: 인덱스 수동 생성 + 쓰기 권한 자격증명

1. MongoDB Atlas 콘솔에서 인덱스 수동 생성
2. 집계 실행 시 쓰기 권한이 있는 자격증명 사용

## 실행 방법

### 1. 스키마 확인 (언제든 실행 가능)
```bash
npm run explore
```

### 2. 인덱스 생성 (쓰기 권한 필요)
```bash
npm run setup-indexes
```

### 3. 집계 실행 (쓰기 권한 필요)
```bash
npm run aggregate
```

## 환경 변수 설정

`.env.local` 파일에 다음 내용이 설정되어 있습니다:

```env
# 컬렉션 이름
COLLECTION_ORDERS=bills      # 주문/결제 데이터
COLLECTION_PAYMENTS=bills    # 주문 데이터와 동일
COLLECTION_MENUS=stores      # 가맹점 정보
```

## 문제 해결

### "not authorized to execute command { aggregate }"

**원인:** 읽기 전용 인증서 사용 중

**해결:** 쓰기 권한이 있는 인증서나 자격증명 사용

### 집계 후 대시보드에 데이터가 안 보임

**확인 사항:**
1. 집계가 성공적으로 완료되었는지 확인
2. 날짜 범위가 실제 데이터 범위와 맞는지 확인
3. MongoDB에서 metrics 컬렉션 확인:
   ```javascript
   db.metrics_daily_store.find().limit(5)
   ```

## 데이터 현황

- **주문 데이터:** 7,630,368건
- **가맹점 수:** 2,101개
- **데이터 기간:** 2023-03-24부터 (최신 날짜 확인 필요)

## 참고 문서

- [상세 가이드 (영문)](./SCHEMA_DETECTION.md)
- [X.509 인증 가이드](./X509_AUTHENTICATION.md)
- [필드 매핑 설정](../lib/config/field-mappings.ts)
- [집계 파이프라인](../lib/aggregation/pipeline.ts)
