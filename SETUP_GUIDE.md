# 빠른 시작 가이드

## 1단계: 환경 설정 (5분)

### MongoDB 연결 정보 설정

`.env.local` 파일을 생성하고 MongoDB Atlas 연결 정보를 입력하세요:

```bash
cp .env.example .env.local
```

```env
MONGODB_URI=mongodb+srv://your_username:your_password@cluster.mongodb.net/database
MONGODB_DB_NAME=taghere
```

### 패키지 설치

```bash
npm install
```

## 2단계: 스키마 탐색 (10분)

현재 MongoDB의 실제 컬렉션 구조를 확인합니다.

```bash
npm run dev
```

브라우저에서 http://localhost:3000/explore 접속:

1. "Load Collections" 클릭
2. 주문 관련 컬렉션 선택 (예: `orders`, `sales`, `transactions`)
3. 다음 필드가 있는지 확인:
   - `storeId` (매장 ID)
   - `createdAt` (주문 일시)
   - `totalAmount` (주문 금액)
   - `items` (메뉴 라인아이템 배열)
   - `status` (주문 상태)

4. 결제 관련 컬렉션 선택 (예: `payments`)
5. 다음 필드가 있는지 확인:
   - `storeId` (매장 ID)
   - `amount` (결제 금액)
   - `status` (결제 상태: success/failed)
   - `paidAt` (결제 일시)

## 3단계: 소스 컬렉션 설정 (2분)

### 방법 1: 환경 변수 사용 (권장)

`.env.local`에 실제 컬렉션명 추가:

```env
COLLECTION_ORDERS=your_orders_collection_name
COLLECTION_PAYMENTS=your_payments_collection_name
COLLECTION_MENUS=your_menus_collection_name
```

### 방법 2: 코드 수정

`scripts/run-aggregation.ts` 파일의 17-21줄 수정:

```typescript
const SOURCE_COLLECTIONS = {
  orders: 'your_orders_collection',      // 실제 주문 컬렉션명
  payments: 'your_payments_collection',  // 실제 결제 컬렉션명
  menus: 'your_menus_collection',       // 실제 메뉴 컬렉션명
};
```

## 4단계: 집계 파이프라인 조정 (선택, 5-10분)

만약 실제 스키마가 기본 가정과 다르다면 `lib/aggregation/pipeline.ts`를 수정하세요.

### 예: 필드명이 다른 경우

기본 가정:
- `createdAt` → 주문 생성 일시
- `totalAmount` → 주문 금액
- `items` → 메뉴 배열

실제 스키마가 다르다면 수정:

```typescript
// 예: orderDate 대신 createdAt 사용
{
  $match: {
    orderDate: {  // createdAt 대신 orderDate
      $gte: startDate,
      $lt: endDate,
    },
  },
},
```

## 5단계: 인덱스 생성 (1분)

메트릭 컬렉션의 성능을 위한 인덱스 생성:

```bash
npm run setup-indexes
```

성공 메시지:
```
[Indexes] Creating metrics collection indexes...
[Indexes] Indexes created successfully
```

## 6단계: 배치 집계 실행 (시간: 데이터양에 따라 다름)

```bash
npm run aggregate
```

실행 중 로그:
```
=== Batch Aggregation Started ===
Date range: 2024-12-13T15:00:00.000Z to 2024-12-20T14:59:59.999Z
Incremental days: 7

[Aggregation] Daily Store Metrics: ...
[Aggregation] Processed 150 daily store metrics
[Aggregation] Daily Store-Menu Metrics: ...
[Aggregation] Processed 823 daily store-menu metrics
[Aggregation] Hourly Store Metrics: ...
[Aggregation] Processed 2401 hourly store metrics

=== Aggregation Completed Successfully ===
Total records processed: 3374
```

## 7단계: 대시보드 실행 (1분)

```bash
npm run dev
```

http://localhost:3000 접속하여 대시보드 확인!

## 문제 발생 시 체크리스트

### 연결 오류
- [ ] MongoDB URI가 정확한가?
- [ ] IP 주소가 MongoDB Atlas 허용 목록에 있는가?
- [ ] 네트워크 방화벽이 MongoDB 포트(27017)를 차단하지 않는가?

### 데이터 없음
- [ ] 배치 집계를 실행했는가? (`npm run aggregate`)
- [ ] 소스 컬렉션명이 정확한가?
- [ ] 선택한 날짜 범위에 데이터가 있는가?
- [ ] MongoDB Compass로 `metrics_daily_store` 컬렉션에 데이터가 있는지 확인했는가?

### 느린 쿼리
- [ ] 인덱스를 생성했는가? (`npm run setup-indexes`)
- [ ] 날짜 범위가 너무 넓지 않은가? (최대 180일)
- [ ] 캐시가 작동하는가? (두 번째 요청은 "Cached" 배지 표시)

## 정기 배치 설정 (프로덕션)

### Cron (Linux/Mac)

```bash
crontab -e
```

매주 월요일 오전 0시 실행:
```
0 0 * * 1 cd /path/to/taghere-analytics && npm run aggregate >> /var/log/aggregation.log 2>&1
```

### 수동 실행 (필요시)

```bash
# 로컬에서
npm run aggregate

# 서버에서
ssh user@server "cd /path/to/project && npm run aggregate"
```

## 다음 단계

- [ ] 프로덕션 MongoDB 읽기 전용 계정 생성
- [ ] `MONGODB_READONLY_URI` 환경 변수 설정
- [ ] Vercel/Cloud Run 등에 배포
- [ ] 배치 스케줄링 설정 (Cron/GitHub Actions)
- [ ] 모니터링 설정 (Sentry, DataDog 등)

## 지원

문제가 지속되면 다음 정보와 함께 이슈를 등록하세요:

1. 에러 메시지 전문
2. MongoDB 버전
3. Node.js 버전 (`node -v`)
4. 실행 환경 (로컬/Vercel/Docker 등)
