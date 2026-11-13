# 국내 시장 스캔 운영 검증

실제 KIS 인증정보를 사용한 운영 검증은 아직 완료되지 않았습니다. 모의 응답 테스트는 요청 구성과 오류 처리를 확인하며, 실제 KIS 응답 필드·계정 권한·운영망 접근 성공을 보장하지 않습니다.

## 조회 및 판정

백엔드에 기존 환경변수 `APP_STOCK_KIS_BASE_URL`, `APP_STOCK_KIS_APP_KEY`, `APP_STOCK_KIS_APP_SECRET`을 설정한 후, 새 버전을 실행합니다. 키와 토큰을 브라우저나 이 스크립트에 전달하지 않습니다. 환경변수 이름은 `backend/src/main/resources/application.properties`를 기준으로 확인합니다.

거래일 장중, 정상 데이터가 있는 시각에 다음 읽기 전용 검증을 실행합니다. 주문 API는 호출하지 않습니다.

```bash
BACKEND_URL=https://your-backend.example python3 scripts/check_domestic_scan.py
```

양 시장이 `success`, 각각 1건 이상, 파싱 제외 0건이고 최근 응답인 경우에만 종료 코드 0입니다. `empty`는 정상 응답의 0건이며 운영 검증 통과로 취급하지 않습니다. 휴장·장외에 비었다면 데이터가 있는 시간에 다시 확인합니다. 이 검사는 응답 수신 및 파싱을 확인하며 종목 가격의 실제 기준 시각까지 검증하지는 않습니다.

`GET /api/stocks/movers/scan?region=domestic&limit=30`은 다음 정보를 반환합니다.

| 필드 | 의미 |
|---|---|
| `movers` | 검증을 통과한 종목, 등락률 순 정렬 및 limit 적용 |
| `markets` | KOSPI·KOSDAQ별 진단 결과. all 요청에는 US도 포함 |
| `checkedAt` | 서버에서 이 스캔 요청 처리를 끝낸 UTC 시각 |
| `markets[].count` | 해당 시장에서 반환한 유효 종목 수. 전체 병합 limit 적용 전 |
| `markets[].rejectedCount` | 필수 필드 검증으로 제외한 행 수 |

| status | 의미 |
|---|---|
| `success` | 정상 응답, 유효 종목 있음 |
| `empty` | 정상 응답, 원본 종목 배열 0건 |
| `partial` | 유효 종목과 필수 필드 오류 행이 함께 있음 |
| `error` | 인증/HTTP/통신/응답 구조 오류, 제공사 거절, 또는 전 행 파싱 실패 |
| `not_configured` | 해당 제공사 설정 없음 |

KIS는 `rt_cd=0`, 배열형 `output`, 종목코드·종목명·현재가·등락률·누적거래량을 검사합니다. 오류 코드는 `HTTP_<상태코드>`, `TRANSPORT_ERROR`, `INVALID_RESPONSE`, `PROVIDER_REJECTED`, `INVALID_ROWS`, `NOT_CONFIGURED`입니다. 제공사 원문 메시지는 노출하지 않습니다.

일부 시장이 실패해도 다른 시장의 정상 종목과 기존 후보 검증은 유지합니다. 일반 추천 및 스페셜 추천 화면은 시장별 경고를 표시합니다. 프런트의 요청 실패·타임아웃·응답 형식 오류도 경고로 전달합니다. 기존 `/api/stocks/movers` 배열 응답은 호환성을 위해 유지합니다.

## 배포 후 확인

1. 위 스모크 검사를 실행하고 KOSPI·KOSDAQ 모두 PASS인지 확인합니다.
2. 일반 추천과 스페셜 추천에서 정상 종목이 표시되는지 확인합니다.
3. 테스트 환경에서 키 누락·제공사 거절·한 시장 실패를 재현하고 화면 경고를 확인합니다.
4. 서버 로그의 `stock_mover_scan` 이벤트를 관찰합니다. `error`, `partial`, `not_configured`는 장애/설정 점검 대상입니다. `empty`는 장중 지속 여부를 확인합니다. 경고 로그는 인증정보, URL, 응답 본문, 예외 메시지를 포함하지 않습니다.

스캔은 사용자가 추천을 요청할 때 실행됩니다. 별도의 주기 실행이나 외부 알림은 추가하지 않았습니다. 배포 전 자동 검증은 `mvn test`(backend), `node --test test/scan.test.js` 및 `npm run build`(frontend)입니다.
