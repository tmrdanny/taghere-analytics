# TagHere Analytics Dashboard

MongoDB 기반 B2B 매장 분석 대시보드 - 운영 DB 조회 비용을 최소화한 고성능 분석 플랫폼

## 🎯 프로젝트 목표

- **MongoDB 조회 비용 거의 0**: 사전 집계(pre-aggregation) 전략으로 운영 DB 직접 조회 차단
- **반응형 SaaS급 UI**: 모바일/PC 지원, Stripe/Notion급의 미니멀한 대시보드
- **실시간 KPI**: 매장별 GMV, 결제액, 주문 수, 메뉴 판매량 등 핵심 지표 제공

## 📊 주요 기능

### 대시보드 KPI
- ✅ **총 GMV (Gross Merchandise Value)**: 전체 거래액
- ✅ **결제 성공액**: 실제 결제 완료 금액
- ✅ **주문 수**: 전체 주문 건수
- ✅ **객단가 (AOV)**: 평균 주문 금액
- ✅ **활성 매장 수**: 기간 내 주문이 있는 매장 수
- ✅ **결제 성공률**: 결제 성공/실패 비율

### 분석 기능
- 📈 **시계열 차트**: 일별 GMV/결제액 트렌드
- 🏪 **매장 랭킹**: GMV 기준 Top 매장
- 🍔 **메뉴 랭킹**: 판매량/매출 기준 인기 메뉴
- 🔍 **날짜 필터**: 오늘/7일/30일/이번달/지난달/커스텀

## 🏗️ 아키텍처

### 비용 최소화 전략

```
┌─────────────────┐
│  운영 MongoDB   │  ← 절대 직접 조회 금지!
│  (orders, ...)  │
└────────┬────────┘
         │
         │ 배치 집계 (주 1회)
         ↓
┌─────────────────┐
│ 사전 집계 컬렉션 │  ← 대시보드는 여기만 조회
│ (metrics_*)     │
└────────┬────────┘
         │
         │ 캐시 (5분 TTL)
         ↓
┌─────────────────┐
│  Dashboard API  │
└─────────────────┘
```

### 사전 집계 컬렉션

1. **metrics_daily_store**: 일별 매장 메트릭
   - storeId, date, gmv, paidAmount, orderCount, avgOrderValue, paymentSuccessRate

2. **metrics_daily_store_menu**: 일별 매장-메뉴 메트릭
   - storeId, menuId, date, quantity, revenue, orderCount

3. **metrics_hourly_store** (선택): 시간별 매장 메트릭 (히트맵용)
   - storeId, datetime, hour, dayOfWeek, gmv, orderCount

## 🚀 시작하기

### 1. 환경 설정

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
```

`.env.local` 파일에 MongoDB 연결 정보 입력:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>
MONGODB_DB_NAME=your_database_name

# 선택: 읽기 전용 연결
MONGODB_READONLY_URI=mongodb+srv://readonly_user:...

# 캐시 설정
CACHE_TTL_SECONDS=300

# 날짜 범위 제한
MAX_DATE_RANGE_DAYS=180

# 배치 집계 주기 (일 단위)
BATCH_INCREMENTAL_DAYS=7
```

### 2. 스키마 탐색

실제 컬렉션 구조를 파악하기 위해 안전한 스키마 탐색 도구 실행:

```bash
npm run dev
```

브라우저에서 http://localhost:3000/explore 접속

1. "Load Collections" 클릭
2. 주문/결제 관련 컬렉션 선택
3. 필드 구조 확인 (storeId, createdAt, totalAmount, items 등)

### 3. 소스 컬렉션 설정

`lib/aggregation/pipeline.ts`의 `SourceCollections` 또는 환경 변수로 실제 컬렉션명 지정:

```env
COLLECTION_ORDERS=orders
COLLECTION_PAYMENTS=payments
COLLECTION_MENUS=menus
```

### 4. 인덱스 생성

메트릭 컬렉션의 인덱스를 생성 (최초 1회):

```bash
npm run setup-indexes
```

### 5. 배치 집계 실행

메트릭 데이터 생성:

```bash
npm run aggregate
```

### 6. 대시보드 실행

```bash
npm run dev
```

http://localhost:3000 접속하여 대시보드 확인

## 📦 배치 집계 스케줄링

### Cron (Linux/Mac)

```bash
# 매주 월요일 오전 0시에 실행
0 0 * * 1 cd /path/to/project && npm run aggregate >> /var/log/aggregation.log 2>&1
```

### GitHub Actions

`.github/workflows/aggregate.yml`:

```yaml
name: Weekly Aggregation

on:
  schedule:
    - cron: '0 0 * * 1'  # 매주 월요일 00:00 UTC
  workflow_dispatch:      # 수동 실행 가능

jobs:
  aggregate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run aggregate
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          MONGODB_DB_NAME: ${{ secrets.MONGODB_DB_NAME }}
```

## 🔒 보안 & 성능 원칙

### 절대 규칙

1. ✅ **운영 컬렉션 직접 조회 금지**
   - 대시보드 API는 오직 `metrics_*` 컬렉션만 조회
   - 배치 집계만 운영 컬렉션 접근 허용

2. ✅ **인덱스 기반 쿼리**
   - 모든 쿼리는 인덱스 사용 필수
   - `explain()`으로 실행 계획 검증

3. ✅ **날짜 범위 제한**
   - 최대 180일로 제한 (환경 변수로 조정 가능)

4. ✅ **캐싱 필수**
   - 모든 대시보드 API 응답 캐시 (기본 5분)

5. ✅ **Projection 사용**
   - 필요한 필드만 조회

## 📁 프로젝트 구조

```
taghere-analytics/
├── app/
│   ├── page.tsx              # 메인 대시보드
│   ├── explore/page.tsx      # 스키마 탐색 UI
│   ├── api/
│   │   ├── dashboard/route.ts  # 대시보드 API
│   │   └── explore/route.ts    # 스키마 탐색 API
│   └── layout.tsx
├── lib/
│   ├── mongodb.ts            # MongoDB 연결
│   ├── cache.ts              # 인메모리 캐시
│   ├── schema-explorer.ts    # 안전한 스키마 탐색
│   ├── types/
│   │   └── metrics.ts        # 메트릭 타입 정의
│   ├── queries/
│   │   └── dashboard.ts      # 대시보드 쿼리 (metrics 전용)
│   └── aggregation/
│       └── pipeline.ts       # 배치 집계 파이프라인
├── scripts/
│   └── run-aggregation.ts    # 배치 실행 스크립트
├── components/ui/            # shadcn/ui 컴포넌트
└── README.md
```

## 🛠️ 주요 명령어

```bash
npm run dev          # 개발 서버 시작
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버 시작

npm run aggregate    # 배치 집계 실행 (증분)
npm run setup-indexes # 인덱스 생성 (최초 1회)
```

## 🔍 스키마 요구사항

### 주문 컬렉션 (orders)

```typescript
{
  _id: ObjectId,
  storeId: string,           // 필수
  storeName: string,         // 선택
  createdAt: Date,           // 필수
  totalAmount: number,       // 필수
  status: string,            // 필수 (cancelled 제외)
  items: [                   // 필수 (메뉴 라인아이템)
    {
      menuId: string,
      menuName: string,
      quantity: number,
      price: number
    }
  ]
}
```

### 결제 컬렉션 (payments)

```typescript
{
  _id: ObjectId,
  orderId: string,           // 선택
  storeId: string,           // 필수
  amount: number,            // 필수
  status: string,            // 필수 ('success' | 'failed')
  paidAt: Date               // 필수
}
```

## 🚢 배포

### Vercel

```bash
vercel
```

환경 변수 설정은 Vercel Dashboard에서 추가

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🆘 문제 해결

### "Failed to connect to MongoDB"

- `.env.local`의 `MONGODB_URI` 확인
- MongoDB Atlas의 IP 허용 목록 확인

### "No data in dashboard"

1. 배치 집계 실행 확인: `npm run aggregate`
2. 메트릭 컬렉션 존재 확인
3. 날짜 범위 확인

### "Slow queries"

1. 인덱스 생성 확인: `npm run setup-indexes`
2. 캐시 TTL 확인
3. 날짜 범위 축소
