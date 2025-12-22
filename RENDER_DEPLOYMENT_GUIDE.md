# Render.com 배포 가이드

## 1단계: Render.com 계정 생성 및 로그인
1. https://render.com 에 접속
2. GitHub 계정으로 가입/로그인

## 2단계: GitHub 리포지토리 연결
1. Render 대시보드에서 "New" > "Web Service" 클릭
2. "Connect Repository" 클릭
3. GitHub 계정 인증
4. taghere-analytics 리포지토리 선택

## 3단계: 배포 설정
- **Name**: `taghere-analytics`
- **Environment**: `Node`
- **Region**: `Oregon` (무료)
- **Plan**: `Free`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

## 4단계: 환경 변수 설정
Render 대시보드 > Environment에서 다음을 추가:

### 필수 환경 변수
```
NODE_ENV=production
SQLITE_DB_PATH=/data/cache.db
CACHE_AUTO_REFRESH=true
CACHE_INCREMENTAL_DAYS=7
```

### MongoDB 환경 변수 (Secret으로 설정)
- `MONGODB_URI`: MongoDB Atlas 연결 문자열
- `MONGODB_DB_NAME`: 데이터베이스 이름
- `MONGODB_CERT_PATH`: 인증서 경로

## 5단계: 배포 실행
1. "Create Web Service" 버튼 클릭
2. Render이 자동으로 배포 시작 (5-15분 소요)
3. 배포 완료 후 제공되는 무료 도메인 사용

## 로그인 정보
- **아이디**: taghere
- **비밀번호**: 0614

## 주의사항
- SQLite 디스크 마운트 필요 (이미 render.yaml에 설정됨)
- MongoDB X.509 인증서는 Render의 Secret Files로 업로드 필요
- 프리 플랜은 매월 750시간 무료 사용 가능

## Render에서 제공하는 도메인 형식
`https://taghere-analytics.onrender.com`

## 배포 후 첫 로그인
브라우저에서 위 도메인으로 접속 후 로그인 모달에서:
- ID: taghere
- PW: 0614
입력
