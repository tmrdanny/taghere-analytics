# MongoDB X.509 인증 가이드

MongoDB Atlas에서 X.509 인증서를 사용하여 보안 연결을 설정하는 방법입니다.

## 설정 방법

### 1. 환경 변수 설정

`.env.local` 파일에 다음과 같이 설정하세요:

```env
# X.509 인증 URI
MONGODB_URI=mongodb+srv://cluster0.hdxz7.mongodb.net/?authSource=%24external&authMechanism=MONGODB-X509&retryWrites=true&w=majority&appName=Cluster0

# 데이터베이스 이름
MONGODB_DB_NAME=taghere

# X.509 인증서 경로 (절대 경로)
MONGODB_CERT_PATH=/Users/zeroclasslab_1/Downloads/keys/mongodb/read_only.pem
```

### 2. URI 구성 요소 설명

- `authSource=%24external`: 외부 인증 소스 사용 (%24 = $ 인코딩)
- `authMechanism=MONGODB-X509`: X.509 인증 메커니즘 지정
- `retryWrites=true`: 쓰기 재시도 활성화
- `w=majority`: 쓰기 확인 수준

### 3. 인증서 파일 요구사항

- **형식**: PEM 형식 (.pem)
- **위치**: 절대 경로로 지정 권장
- **권한**: 읽기 권한 필요
- **내용**: 클라이언트 인증서 + 개인 키 포함

### 4. 작동 확인

빌드 시 다음 메시지가 표시되면 정상 작동:

```
[MongoDB] Using X.509 certificate authentication
```

개발 서버 실행:

```bash
npm run dev
```

## MongoDB Atlas에서 X.509 인증서 발급

### 1. Atlas 콘솔 접속
1. [MongoDB Atlas](https://cloud.mongodb.com) 로그인
2. 프로젝트 선택

### 2. X.509 인증서 생성
1. Security → Database Access
2. "Add New Database User" 클릭
3. Authentication Method: "Certificate" 선택
4. 인증서 다운로드 (.pem 파일)

### 3. 사용자 권한 설정
- Read Only (대시보드용 권장)
- Read/Write (배치 집계용)
- Atlas Admin (관리용, 주의)

### 4. IP 허용 목록 설정
1. Security → Network Access
2. "Add IP Address" 클릭
3. 개발 환경 IP 추가 또는 "Allow Access from Anywhere" (개발용만)

## 보안 권장 사항

### 프로덕션 환경

1. **읽기 전용 인증서 사용**
   ```env
   # 대시보드는 읽기 전용 인증서 사용
   MONGODB_CERT_PATH=/path/to/read_only.pem
   ```

2. **별도 집계용 인증서**
   ```env
   # 배치 집계는 쓰기 권한 인증서
   MONGODB_BATCH_CERT_PATH=/path/to/read_write.pem
   ```

3. **인증서 권한 최소화**
   ```bash
   chmod 400 /path/to/certificate.pem
   chown app_user:app_group /path/to/certificate.pem
   ```

4. **환경별 인증서 분리**
   - 개발: dev.pem
   - 스테이징: staging.pem
   - 프로덕션: production.pem

### 인증서 관리

1. **버전 관리에서 제외**
   ```gitignore
   # .gitignore
   *.pem
   *.key
   *.crt
   /keys/
   ```

2. **안전한 저장**
   - AWS Secrets Manager
   - Google Secret Manager
   - HashiCorp Vault
   - 1Password / LastPass (팀용)

3. **만료 관리**
   - 인증서 만료일 모니터링
   - 자동 갱신 스크립트 구성
   - 만료 30일 전 알림 설정

## 문제 해결

### "certificate verify failed"

**원인**: 인증서 파일 형식 또는 권한 문제

**해결**:
```bash
# 인증서 형식 확인
openssl x509 -in /path/to/cert.pem -text -noout

# 권한 확인
ls -l /path/to/cert.pem

# 권한 수정
chmod 400 /path/to/cert.pem
```

### "ENOENT: no such file or directory"

**원인**: 인증서 경로 오류

**해결**:
```bash
# 절대 경로 사용
MONGODB_CERT_PATH=/Users/username/path/to/cert.pem

# 상대 경로는 프로젝트 루트 기준
MONGODB_CERT_PATH=./keys/mongodb/cert.pem
```

### "Authentication failed"

**원인**:
1. 인증서가 MongoDB Atlas에 등록되지 않음
2. URI에 authMechanism이 누락됨
3. 사용자 권한 부족

**해결**:
1. Atlas 콘솔에서 인증서 사용자 확인
2. URI에 `authMechanism=MONGODB-X509` 포함 확인
3. 사용자 권한 재확인

### "Connection timeout"

**원인**:
1. 네트워크 방화벽 차단
2. IP 허용 목록 미등록

**해결**:
1. 방화벽에서 27017 포트 허용
2. Atlas Network Access에 현재 IP 추가

## Docker 환경에서 사용

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 인증서 복사
COPY keys/mongodb/cert.pem /app/keys/mongodb/cert.pem
RUN chmod 400 /app/keys/mongodb/cert.pem

# 앱 파일 복사
COPY . .

RUN npm ci --only=production
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  dashboard:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=${MONGODB_URI}
      - MONGODB_DB_NAME=${MONGODB_DB_NAME}
      - MONGODB_CERT_PATH=/app/keys/mongodb/cert.pem
    volumes:
      - ./keys/mongodb:/app/keys/mongodb:ro
```

### Secret 사용 (권장)

```yaml
version: '3.8'

services:
  dashboard:
    build: .
    ports:
      - "3000:3000"
    secrets:
      - mongodb_cert
    environment:
      - MONGODB_URI=${MONGODB_URI}
      - MONGODB_DB_NAME=${MONGODB_DB_NAME}
      - MONGODB_CERT_PATH=/run/secrets/mongodb_cert

secrets:
  mongodb_cert:
    file: ./keys/mongodb/cert.pem
```

## Kubernetes 환경

### Secret 생성

```bash
kubectl create secret generic mongodb-cert \
  --from-file=cert.pem=/path/to/cert.pem \
  --namespace=production
```

### Deployment 설정

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dashboard
spec:
  template:
    spec:
      containers:
      - name: dashboard
        image: your-registry/dashboard:latest
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-config
              key: uri
        - name: MONGODB_DB_NAME
          value: "taghere"
        - name: MONGODB_CERT_PATH
          value: "/etc/mongodb/cert.pem"
        volumeMounts:
        - name: mongodb-cert
          mountPath: /etc/mongodb
          readOnly: true
      volumes:
      - name: mongodb-cert
        secret:
          secretName: mongodb-cert
          defaultMode: 0400
```

## 참고 자료

- [MongoDB X.509 Authentication](https://www.mongodb.com/docs/manual/core/security-x.509/)
- [MongoDB Atlas Security](https://www.mongodb.com/docs/atlas/security/)
- [Node.js MongoDB Driver - X.509](https://www.mongodb.com/docs/drivers/node/current/fundamentals/authentication/mechanisms/#x-509)
