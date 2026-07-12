# MCP 연계 가이드

현재 이 로컬 Codex 환경에는 MCP 서버가 설정되어 있지 않습니다.

```bash
codex mcp list
# No MCP servers configured yet.
```

## MCP를 어디에 쓰면 좋은가

MCP는 브라우저 사용자가 직접 쓰는 API가 아니라, Codex/Claude Desktop 같은 AI 도구가 외부 기능을 도구처럼 호출하게 하는 연결 방식입니다.

이 프로젝트의 실제 사용자 화면은 계속 아래 REST API를 사용합니다.

- 프론트엔드: Vercel
- 백엔드: Spring Boot REST API
- 주식 데이터: KIS/Naver/Finnhub/Polygon
- AI 판단: 백엔드에서 Anthropic Claude Messages API 호출

MCP는 선택 기능입니다. 없어도 웹앱은 동작합니다.

## MCP로 연계할 만한 것

### 1. GitHub MCP

용도:

- 이 저장소의 이슈/PR/파일을 AI 도구에서 직접 조회
- 배포 전 변경사항 리뷰
- 릴리즈 노트 작성

설정 예시:

```bash
codex mcp add github -- npx -y @modelcontextprotocol/server-github
```

GitHub 토큰이 필요한 경우 `GITHUB_PERSONAL_ACCESS_TOKEN` 환경변수를 설정합니다.

### 2. OpenAI Docs MCP

용도:

- OpenAI API 최신 문서 검색
- 모델/Responses API/Structured Outputs 확인

설정 예시:

```bash
codex mcp add openaiDeveloperDocs --url https://developers.openai.com/mcp
```

### 3. KIS / 주식 API MCP

KIS는 LLM/자동화용 샘플과 MCP 관련 자료를 공개 저장소에서 제공하고 있습니다.

- https://github.com/koreainvestment/open-trading-api
- https://apiportal.koreainvestment.com

다만 이 웹앱에서는 KIS를 MCP로 직접 붙이기보다, 현재처럼 백엔드 `StockMarketService`에서 REST API로 호출하는 방식이 더 안전합니다. API 키가 백엔드에만 있고, 프론트와 AI 도구에 직접 노출되지 않기 때문입니다.

### 4. 이 프로젝트 전용 MCP 서버

나중에 AI 도구에서 이 앱의 주식 추천 기능을 직접 호출하고 싶다면, 별도 MCP 서버를 만들 수 있습니다.

권장 도구:

- `get_stock_quotes(symbols)`
- `get_stock_news(symbols)`
- `get_stock_provider_status()`
- `get_stock_ai_analysis(recommendation)`

권장 구조:

```text
mcp/
  stock-tools/
    package.json
    src/server.js
```

이 MCP 서버는 직접 KIS/Naver/Anthropic 키를 들고 있지 않고, 이미 떠 있는 백엔드 API만 호출하는 프록시로 만드는 것이 좋습니다.

```text
MCP tool -> Spring Boot backend -> KIS/Naver/Finnhub/Polygon/Anthropic
```

이렇게 하면 키 관리와 호출 정책이 백엔드 한 곳에 모입니다.

## 지금 당장 필요한가

아니요. Vercel에 최종 배포하는 웹앱에는 MCP가 필수 아닙니다.

지금 필요한 것은:

1. 백엔드를 실행 가능한 환경에 배포
2. 백엔드 환경변수에 API 키 설정
3. Vercel 프론트에 `VITE_API_URL` 설정

MCP는 이후에 “AI 개발 도구에서 내 앱 기능을 직접 호출하고 싶다”는 목적이 생길 때 추가하면 됩니다.
