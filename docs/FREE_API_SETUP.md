₩# 무료 기준 API 키 설정 가이드

이 프로젝트는 무료 플랜을 우선 사용하도록 설계합니다. 단, Anthropic Claude API는 계정에 무료 크레딧이 있는 경우를 제외하면 사용량 과금입니다. 비용을 0원으로 유지하려면 `APP_ANTHROPIC_API_KEY`를 설정하지 않으면 됩니다.

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

## 5. Anthropic Claude API

용도: 추천 카드의 `AI 매수 판단` 버튼

Anthropic Claude API는 무료 플랜 전용 API가 아닙니다. 계정에 무료 크레딧이 있으면 먼저 사용될 수 있지만, 크레딧이 없거나 소진되면 과금됩니다.

비용을 0원으로 유지하려면 아래 키를 설정하지 마세요. 키가 없으면 앱은 AI 판단 영역에 설정 필요 메시지만 표시하고 API를 호출하지 않습니다.

```properties
app.anthropic.api-key=발급받은_ANTHROPIC_KEY
app.anthropic.model=claude-sonnet-5
```

API 키 생성 위치: https://console.anthropic.com/settings/keys

비용 방지 팁:

- Anthropic 키를 설정하지 않으면 Claude 비용은 0원입니다.
- 키를 설정하더라도 추천 카드에서 `AI 판단` 버튼을 누를 때만 호출됩니다.
- Anthropic 콘솔의 Billing에서 월 사용 한도를 낮게 설정하세요.
- 기본 모델은 `claude-sonnet-5`입니다. 더 저렴한 `claude-haiku-4-5` 또는 더 고성능인 `claude-opus-4-8`로 `app.anthropic.model` / `APP_ANTHROPIC_MODEL`을 바꿔 조정할 수 있습니다.

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
     APP_ANTHROPIC_API_KEY=<값> \
     -a backend-little-cloud-7780
   ```

2. Vercel 프론트엔드 환경변수(`VITE_API_BASE_URL`)에 백엔드 주소를 넣습니다. 이미 Vercel 프로젝트(Production/Preview/Development)에 설정되어 있습니다.

   ```text
   VITE_API_BASE_URL=https://backend-little-cloud-7780.fly.dev/api
   ```

프론트엔드 Vercel에는 `APP_ANTHROPIC_API_KEY`, KIS, Naver, Finnhub, Polygon 키를 넣지 마세요. 이 키들은 반드시 백엔드(Fly.io) 환경변수에만 넣어야 합니다.
