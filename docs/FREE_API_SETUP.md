₩# 무료 기준 API 키 설정 가이드

이 프로젝트는 무료 플랜만 사용하도록 설계합니다. (AI 매수 판단 기능은 무료로 운영할 수 없어 제거했습니다.)

중요: 이 문서에는 실제 API 키를 입력하지 마세요. 이 파일은 저장소에 포함될 수 있는 문서입니다. 실제 키는 `.gitignore`에 포함된 `backend/application-local.properties` 또는 배포 서비스의 환경변수에만 넣어야 합니다.

## 1. 한국투자증권 KIS Open API

용도: 국내 주식/ETF 시세 확인

1. 한국투자증권 계좌를 준비합니다.
2. KIS Developers에 접속합니다: https://apiportal.koreainvestment.com
3. Open API 서비스를 신청합니다.
4. 앱을 생성하고 `App Key`, `App Secret`을 발급받습니다.
5. 로컬 `backend/application-local.properties`에 넣습니다.

```properties
app.stock.kis.app-key=발급받은_APP_KEY
app.stock.kis.app-secret=발급받은_APP_SECRET
app.stock.kis.base-url=https://openapi.koreainvestment.com:9443
```

참고: 운영 URL은 `https://openapi.koreainvestment.com:9443` 입니다.

## 2. Naver Search API

용도: 국내 종목 뉴스 확인

1. NAVER Developers에 접속합니다: https://developers.naver.com
2. Application을 등록합니다.
3. 사용 API에서 `검색`을 추가합니다.
4. `Client ID`, `Client Secret`을 확인합니다.
5. 로컬 설정에 넣습니다.

```properties
app.stock.naver.client-id=발급받은_CLIENT_ID
app.stock.naver.client-secret=발급받은_CLIENT_SECRET
```

참고: 네이버 검색 API는 일 처리 한도가 있습니다. 공식 안내 기준 검색 API는 25,000회/일입니다.

## 3. Finnhub

용도: 해외 주식 시세/뉴스 확인

1. Finnhub에 접속합니다: https://finnhub.io
2. 회원가입 후 Dashboard에서 API Key를 확인합니다.
3. 로컬 설정에 넣습니다.

```properties
app.stock.finnhub.api-key=발급받은_FINNHUB_KEY
```

무료 플랜으로 시작할 수 있으며, 호출 제한이 있으니 개발 중에는 새로고침을 과하게 반복하지 마세요.

## 4. Polygon / Massive

용도: 해외 주식 시세/뉴스 보조 확인

1. Polygon 또는 Massive에 접속합니다: https://polygon.io 또는 https://massive.com
2. 무료 계정으로 가입합니다.
3. API Key를 발급받습니다.
4. 로컬 설정에 넣습니다.

```properties
app.stock.polygon.api-key=발급받은_POLYGON_KEY
```

무료 플랜은 호출 수와 데이터 범위 제한이 있습니다. 이 프로젝트에서는 무료 플랜에서 가능한 범위로만 사용합니다.

## 5. Giphy API

용도: 인스타 밈 추천 메뉴의 실시간 트렌딩 GIF(밈 이름·설명·썸네일) 조회

> 참고: 원래 밈 이름은 Tenor API로 받아올 계획이었지만, Tenor API는 2026-06-30부로 서비스가 완전히 종료되어 더 이상 사용할 수 없습니다. 대신 Giphy의 Trending API 하나로 밈 목록(제목+썸네일)을 한 번에 가져옵니다.

1. https://developers.giphy.com 에 접속해 계정을 만듭니다.
2. `Create an App`으로 새 앱을 만듭니다 (개인/테스트 용도는 `API` 타입의 Beta 키로 충분).
3. 발급된 API 키를 확인합니다.
4. 로컬 설정에 넣습니다.

```properties
app.giphy.api-key=발급받은_GIPHY_KEY
```

참고: Beta 키는 시간당 42회, 일 1,000회 호출 제한이 있습니다. 트렌딩 밈 목록은 요청마다 1회만 호출하므로 여유가 있지만, 너무 자주 새로고침하지 마세요.

## 6. 배포 현황 (Vercel + Fly.io)

이 프로젝트는 프론트엔드와 백엔드를 각각 다른 서비스에 배포합니다.

- **프론트엔드**: Vercel (`suwon-lees-projects/stupid-app`). GitHub 저장소 연동으로 `main` push 시 자동 배포됩니다. 루트 `vercel.json`이 `cd frontend && npm run build` → `frontend/dist`를 빌드/배포 대상으로 지정합니다.
- **백엔드**: Fly.io (`backend-little-cloud-7780`, `https://backend-little-cloud-7780.fly.dev`). `.github/workflows/deploy.yml`이 `main` push 시 `flyctl deploy`를 실행합니다. GitHub Secrets에 `FLY_API_TOKEN`이 설정되어 있어야 합니다.

필요 작업:

1. 백엔드 배포 환경변수(Fly.io secrets)에 API 키를 넣습니다.

   ```bash
   fly secrets set \
     APP_STOCK_KIS_APP_KEY=<값> \
     APP_STOCK_KIS_APP_SECRET=<값> \
     APP_STOCK_POLYGON_API_KEY=<값> \
     APP_STOCK_FINNHUB_API_KEY=<값> \
     APP_STOCK_NAVER_CLIENT_ID=<값> \
     APP_STOCK_NAVER_CLIENT_SECRET=<값> \
     APP_GIPHY_API_KEY=<값> \
     -a backend-little-cloud-7780
   ```

2. Vercel 프론트엔드 환경변수(`VITE_API_BASE_URL`)에 백엔드 주소를 넣습니다. 이미 Vercel 프로젝트(Production/Preview/Development)에 설정되어 있습니다.

   ```text
   VITE_API_BASE_URL=https://backend-little-cloud-7780.fly.dev/api
   ```

프론트엔드 Vercel에는 KIS, Naver, Finnhub, Polygon, Giphy 키를 넣지 마세요. 이 키들은 반드시 백엔드(Fly.io) 환경변수에만 넣어야 합니다.
