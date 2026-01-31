# AWS에 백엔드 배포하기

Spring Boot 백엔드(냉장고 메뉴 API)를 AWS에 올리는 방법입니다.  
**Elastic Beanstalk**(가장 간단)과 **App Runner**(Docker 이미지 사용) 두 가지를 안내합니다.

---

## 공통 준비

- [AWS 계정](https://aws.amazon.com) 가입
- AWS 콘솔 또는 **AWS CLI** 사용 가능
- YouTube API 키, CORS용 프론트 주소 준비

---

# 방법 1: Elastic Beanstalk (권장)

JAR 파일만 올리면 자동으로 Java 환경을 만들어 줍니다.  
무료 티어는 **12개월** 제한이 있으니 [AWS Free Tier](https://aws.amazon.com/free/) 를 확인하세요.

---

## 1-1. JAR 빌드 (로컬)

```bash
cd backend
./mvnw -DskipTests package
```

Windows:

```powershell
cd backend
.\mvnw.cmd -DskipTests package
```

생성된 파일: `backend/target/fridge-menu-api-0.0.1-SNAPSHOT.jar`

---

## 1-2. Elastic Beanstalk 환경 만들기 (콘솔)

### 1) Elastic Beanstalk 콘솔

1. [AWS 콘솔](https://console.aws.amazon.com) 로그인
2. 검색창에 **Elastic Beanstalk** 입력 → **Elastic Beanstalk** 이동
3. **Create application** 클릭

### 2) 애플리케이션 기본 정보

| 항목 | 값 |
|------|-----|
| **Application name** | `fridge-menu-api` (원하는 이름) |
| **Environment name** | 자동 생성 또는 `fridge-api-env` |

### 3) 플랫폼

| 항목 | 값 |
|------|-----|
| **Platform** | **Java** |
| **Platform branch** | **Corretto 17 running on 64bit Amazon Linux 2** (Java 17) |
| **Platform version** | 최신 권장 버전 |

### 4) 애플리케이션 코드

| 항목 | 값 |
|------|-----|
| **Upload your code** | 선택 |
| **Version label** | `v1` (아무 이름) |
| **Choose file** | `backend/target/fridge-menu-api-0.0.1-SNAPSHOT.jar` 선택 |

### 5) 생성

- **Next** → **Configure more options** (또는 **Next** 반복) → **Submit**  
- 환경이 만들어지고 배포가 진행됩니다 (5~10분 정도).  
- 완료되면 상단에 **URL**이 보입니다. 예: `https://xxx.us-east-1.elasticbeanstalk.com`

---

## 1-3. 환경 변수 설정 (API 키, CORS)

1. Elastic Beanstalk 콘솔에서 방금 만든 **환경** 클릭
2. 왼쪽 **Configuration** 클릭
3. **Software** 카드 → **Edit**
4. **Environment properties** 에 추가:

| Name | Value |
|------|--------|
| `APP_YOUTUBE_API_KEY` | (YouTube Data API v3 키) |
| `APP_CORS_ALLOWED_ORIGINS` | `https://본인-프론트.vercel.app` |

5. **Apply** 클릭 → 환경이 다시 배포됩니다.

---

## 1-4. 포트 확인 (필요 시)

Amazon Linux 2 Java SE 플랫폼은 기본적으로 **8080** 으로 프록시합니다.  
이 프로젝트는 `server.port=${PORT:8080}` 로 되어 있어 별도 설정 없이 동작합니다.  
문제가 있으면 환경 변수에 `PORT` = `8080` 을 넣어 보세요.

---

## 1-5. 동작 확인

브라우저 또는 curl:

```
https://본인-환경-주소.elasticbeanstalk.com/api/ingredients
```

JSON이 보이면 성공입니다.

---

## 1-6. 프론트엔드(Vercel) 연동

1. Vercel → **Settings** → **Environment Variables**
2. **Name**: `VITE_API_URL`  
   **Value**: `https://본인-환경-주소.elasticbeanstalk.com/api`
3. **Redeploy** 한 번 실행

---

# 방법 2: EB CLI로 배포

콘솔 대신 터미널로 배포하려면 EB CLI를 사용합니다.

---

## 2-1. EB CLI 설치

**Windows (PowerShell):**

```powershell
pip install awsebcli
```

또는 [공식 문서](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3-install.html) 참고.

**AWS CLI**도 필요합니다. [AWS CLI v2 설치](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) 후 `aws configure` 로 키 설정.

---

## 2-2. 프로젝트 초기화

```bash
cd backend
eb init
```

질문 예시:

| 질문 | 권장 |
|------|------|
| Region | 사용할 리전 (예: ap-northeast-2) |
| Application name | fridge-menu-api |
| Platform | Java |
| Platform version | Corretto 17 |
| SSH | 원하면 Yes |

---

## 2-3. 환경 생성 및 배포

```bash
eb create fridge-api-env
```

첫 생성 시 5~10분 걸릴 수 있습니다.

```bash
eb open
```

으로 브라우저에서 열고,  
`https://주소/api/ingredients` 로 확인합니다.

---

## 2-4. 환경 변수 설정 (CLI)

```bash
eb setenv APP_YOUTUBE_API_KEY=키값 APP_CORS_ALLOWED_ORIGINS=https://본인-프론트.vercel.app
```

---

## 2-5. 이후 배포 (코드 수정 후)

```bash
cd backend
./mvnw -DskipTests package
eb deploy
```

---

# 방법 3: App Runner (Docker 이미지)

Docker 이미지를 사용해 배포하려면 **ECR**에 이미지를 올린 뒤 **App Runner**로 서비스만들 수 있습니다.

---

## 3-1. ECR 저장소 생성

1. AWS 콘솔 → **ECR** (Elastic Container Registry)
2. **Create repository** → 이름 `fridge-menu-api` → **Create**

---

## 3-2. 이미지 빌드 및 푸시

AWS CLI 로그인 (리전은 ECR 저장소와 동일하게):

```bash
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin 본인-계정ID.dkr.ecr.ap-northeast-2.amazonaws.com
```

이미지 빌드 및 태그 (계정 ID와 리전은 본인 값으로):

```bash
cd backend
docker build -t fridge-menu-api .
docker tag fridge-menu-api:latest 본인-계정ID.dkr.ecr.ap-northeast-2.amazonaws.com/fridge-menu-api:latest
docker push 본인-계정ID.dkr.ecr.ap-northeast-2.amazonaws.com/fridge-menu-api:latest
```

---

## 3-3. App Runner 서비스 생성

1. 콘솔 → **App Runner** → **Create service**
2. **Source**: Container registry → **Amazon ECR** → 방금 푸시한 이미지 선택
3. **Service name**: fridge-menu-api
4. **Port**: 8080
5. **Environment variables** (또는 나중에 설정):
   - `APP_YOUTUBE_API_KEY`
   - `APP_CORS_ALLOWED_ORIGINS`
6. **Create & deploy** → 완료 후 서비스 URL 확인

---

## 요약

| 방법 | 장점 | 비고 |
|------|------|------|
| **Elastic Beanstalk (콘솔)** | JAR만 올리면 됨, 설정 간단 | 무료 티어 12개월 |
| **Elastic Beanstalk (EB CLI)** | 터미널로 배포·재배포 자동화 | EB CLI + AWS CLI 필요 |
| **App Runner** | Docker 이미지, 자동 스케일 | ECR + Docker 필요 |

가장 빠르게 쓰려면 **방법 1 (Elastic Beanstalk 콘솔)** 에서 JAR 업로드까지 진행하면 됩니다.
