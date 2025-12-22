# MongoDB Compass에서 이상한 주문 데이터 삭제하기

## 1️⃣ 문제점 확인
- **문제**: resultPrice가 "0"인 주문 20개 발견
- **영향**: Revenue Trends 그래프에 오류 발생
- **기간**: 2023년 3월 ~ 5월

## 2️⃣ MongoDB Compass에서 삭제하기

### 방법 1: 필터를 사용한 삭제 (권장)

**단계 1: Compass 열기 및 컬렉션 이동**
```
1. MongoDB Compass 실행
2. taghere 데이터베이스 선택
3. bills 컬렉션 클릭
```

**단계 2: 필터 입력**
```
Compass 상단의 Filter 입력란에 다음을 복사-붙여넣기:

{ "resultPrice": { "$in": ["0", ""] } }
```

**단계 3: 결과 확인**
```
- 이상한 주문들이 표시됨
- 총 개수 확인
```

**단계 4: 선택적 삭제**
```
1. 각 문서를 개별 선택하거나
2. 또는 다음 쿼리로 한번에 삭제:
   Compass 상단 메뉴 → Delete Documents
   필터 그대로 유지
   Delete 클릭
```

### 방법 2: Delete Documents 기능 사용

```
1. bills 컬렉션에서 Filter 입력:
   { "resultPrice": { "$in": ["0", ""] } }

2. Compass 상단 메뉴에서 "Delete Documents" 선택

3. 삭제할 문서 개수 확인

4. "Delete" 버튼 클릭 (DELETE 입력하여 확인)
```

## 3️⃣ 더 큰 이상값 찾기 (그래프의 극값)

그래프에서 보인 극값을 찾으려면:

```
필터: { "resultPrice": { "$regex": "^[0-9]{10,}$" } }
```

## ⚠️ 주의사항
- ✅ 삭제 전 반드시 필터 결과를 확인하세요
- ✅ 실수로 정상 데이터를 삭제하지 않도록 주의
- ✅ 백업이 있다면 더 안전합니다
