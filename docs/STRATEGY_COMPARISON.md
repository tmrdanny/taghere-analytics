# 전략 비교: Pre-aggregation vs Real-time

## 현재 상황

**데이터 규모:**
- 총 문서: 7,630,661개 (763만개)
- 일일 평균: ~20,000건
- 최근 7일: 144,178건

**성능 문제:**
- 7일 조회: **30초** 소요 (너무 느림!)
- 원인: `$expr` 사용으로 인덱스 미활용

---

## 전략 A: Pre-aggregation (원래 계획) ✅ 권장

### 개요

**주 1회 배치 작업**으로 미리 집계해서 저장하고, 대시보드는 저장된 데이터만 조회

```
bills (763만) → [주 1회 배치] → metrics_daily_store → [대시보드 조회 <0.1초]
                  ⬆️ Write 필요
```

### 상세 흐름

**1단계: 배치 집계 (주 1회, 월요일 00:00)**

```javascript
// npm run aggregate
// 최근 7일치 재집계
bills (14만건) → 집계 → metrics_daily_store (14개 문서)
                      → metrics_daily_store_menu (1,000개 문서)
                      → metrics_hourly_store (336개 문서)
```

- **소요 시간**: 1-2분
- **필요 권한**: Write
- **실행 주기**: 주 1회 (cron)

**2단계: 대시보드 조회**

```javascript
// 사용자가 대시보드 열기
metrics_daily_store (14개) → 조회 → 화면 표시
```

- **소요 시간**: 0.05초
- **필요 권한**: Read-only
- **쿼리 대상**: 사전 집계된 metrics 컬렉션 (작은 데이터)

### 장점

✅ **초고속 조회**: <0.1초 (현재 30초 vs **300배 빠름**)
✅ **낮은 조회 비용**: 작은 컬렉션만 읽음
✅ **대시보드는 read-only**: 조회는 read 권한만 필요
✅ **긴 기간 조회 가능**: 90일, 1년도 빠름

### 단점

⚠️ **배치 작업에 write 필요**: metrics 컬렉션에 저장
⚠️ **데이터 지연**: 최대 1주일 (월요일 배치 실행)
⚠️ **스토리지 비용**: +8.2 GB ($3.72/월)
⚠️ **배치 관리 필요**: Cron 설정

### 비용

**고정 비용: $3.72/월**
- 스토리지: $2.05/월
- 백업: $1.64/월
- 배치 집계: $0.03/월

**조회 비용: 거의 무료** (~$0.001/월)

---

## 전략 B: Real-time (현재 적용) ❌ 너무 느림

### 개요

매번 bills 컬렉션에서 실시간 집계

```
bills (14만건) → [매 요청마다 실시간 집계 30초] → 화면 표시
                  ⬆️ Write 불필요
```

### 장점

✅ **Write 불필요**: Read-only 권한만 필요
✅ **실시간 데이터**: 항상 최신
✅ **배치 관리 불필요**
✅ **스토리지 비용 없음**

### 단점

❌ **매우 느림**: 30초 (사용자 이탈)
❌ **높은 읽기 비용**: 매번 14만건 스캔
❌ **캐시 의존**: 캐시 미스 시 30초 대기
❌ **긴 기간 불가능**: 90일은 몇 분 소요

### 비용

**조회 비용: $0.1-10/월** (사용량에 따라)
- 7일 조회: 144,178 documents × RPU

**문제: 속도가 너무 느려서 실용성 없음**

---

## 전략 C: Hybrid (최적) 🌟 최종 권장

### 개요

**Pre-aggregation + Read-only 조회**

```
[배치 서버 - Write 권한]
bills → 주 1회 집계 → metrics_daily_store

[대시보드 - Read-only 권한]
metrics_daily_store → 조회 → 화면
```

### 구현 방법

**1. 배치 서버 (별도 환경)**

```bash
# 배치 서버에만 write 인증서 설정
MONGODB_CERT_PATH=/path/to/read_write.pem

# Cron 설정 (월요일 00:00)
0 0 * * 1 cd /app && npm run aggregate
```

**2. 대시보드 (프로덕션)**

```bash
# 대시보드는 read-only 인증서
MONGODB_CERT_PATH=/path/to/read_only.pem

# lib/queries/dashboard.ts 사용 (원래 코드)
# metrics 컬렉션에서 조회
```

### 장점

✅ **초고속**: <0.1초
✅ **대시보드 보안**: Read-only만 사용
✅ **배치 분리**: Write 권한을 배치 서버로 격리
✅ **낮은 비용**: $3.72/월 (고정)

### 단점

⚠️ **배치 서버 필요**: 별도 환경 또는 cron 설정
⚠️ **데이터 지연**: 최대 1주일

---

## 비교표

| 항목 | Pre-aggregation | Real-time | Hybrid |
|------|----------------|-----------|--------|
| **조회 속도** | 0.05초 ✅ | 30초 ❌ | 0.05초 ✅ |
| **대시보드 권한** | Read-only ✅ | Read-only ✅ | Read-only ✅ |
| **배치 권한** | Write 필요 ⚠️ | 불필요 ✅ | Write 필요 (분리) ⚠️ |
| **월 비용** | $3.72 | $0.1-10 (느림) | $3.72 |
| **데이터 신선도** | 최대 1주 지연 | 실시간 | 최대 1주 지연 |
| **긴 기간 조회** | 빠름 ✅ | 매우 느림 ❌ | 빠름 ✅ |
| **관리 복잡도** | 중간 | 낮음 | 중간 |

---

## 권장 솔루션

### 🌟 Hybrid 전략 (최종 권장)

**이유:**
1. **속도 문제 해결**: 30초 → 0.05초 (600배 개선)
2. **보안 유지**: 대시보드는 read-only
3. **실용성**: 사용자가 기다릴 수 없음

### 구현 단계

**1단계: 배치 환경 준비**

옵션 A: 로컬 Cron (간단)
```bash
# crontab -e
0 0 * * 1 cd /path/to/project && MONGODB_CERT_PATH=/path/to/write.pem npm run aggregate
```

옵션 B: 별도 서버 (권장)
```bash
# 배치 전용 서버에서
# .env.batch 파일
MONGODB_CERT_PATH=/path/to/read_write.pem
```

옵션 C: GitHub Actions (무료)
```yaml
# .github/workflows/weekly-aggregate.yml
name: Weekly Aggregation
on:
  schedule:
    - cron: '0 0 * * 1' # 월요일 00:00 UTC
```

**2단계: 대시보드 코드 변경**

```typescript
// app/api/dashboard/route.ts
// Real-time → Pre-aggregated로 변경
import { getDashboardKPIs } from '@/lib/queries/dashboard';
// (원래 코드로 복원)
```

**3단계: 환경 분리**

```
대시보드 프로덕션: read_only.pem
배치 서버: read_write.pem (격리된 환경)
```

---

## 결론

### 현재 문제

- Real-time 조회: **30초** 소요 → 사용 불가능

### 해결책

1. **즉시**: Pre-aggregation 전환 (속도 600배 개선)
2. **보안**: 배치 환경 분리 (대시보드는 read-only 유지)
3. **비용**: $3.72/월 (속도 고려 시 매우 합리적)

### 다음 단계

1. Write 인증서 발급 (배치용)
2. 배치 환경 선택 (Cron / GitHub Actions / 별도 서버)
3. 초기 집계 실행 (`npm run aggregate`)
4. 대시보드 코드 원래대로 복원
5. Cron 설정

---

## FAQ

**Q: 배치를 더 자주 실행하면?**
A: 가능합니다. 매일 실행도 OK (비용 동일)

**Q: 실시간 데이터가 필요하면?**
A: 배치 주기를 줄이거나 (예: 매일), 중요 지표만 실시간 쿼리

**Q: Write 인증서가 위험하면?**
A: 배치 서버를 격리하고, IP whitelist 설정, 만료 관리

**Q: 비용이 부담되면?**
A: 현재 방식(30초)은 실용성이 없음. 속도가 필수라면 $3.72는 합리적
