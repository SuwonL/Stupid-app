package com.fridge.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fridge.dto.StockIndicatorsDto;
import com.fridge.dto.StockMarketStatusDto;
import com.fridge.dto.StockNewsDto;
import com.fridge.dto.StockProviderStatusDto;
import com.fridge.dto.StockQuoteDto;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class StockMarketService {

    private static final String KIS_SOURCE = "KIS Developers Open API";
    private static final String POLYGON_SOURCE = "Polygon.io Stocks API";
    private static final String FINNHUB_SOURCE = "Finnhub Stock API";
    private static final String NAVER_SOURCE = "Naver Search API";
    private static final List<String> MARKET_STATUS_SYMBOLS = List.of("^KS11", "^KQ11", "SPY", "QQQ");
    private static final int MA_PERIOD = 20;
    private static final double OVERHEATING_THRESHOLD_PERCENT = 15.0;

    private final RestTemplate restTemplate;

    @Value("${app.stock.kis.base-url:}")
    private String kisBaseUrl;
    @Value("${app.stock.kis.app-key:}")
    private String kisAppKey;
    @Value("${app.stock.kis.app-secret:}")
    private String kisAppSecret;
    @Value("${app.stock.polygon.api-key:}")
    private String polygonApiKey;
    @Value("${app.stock.finnhub.api-key:}")
    private String finnhubApiKey;
    @Value("${app.stock.naver.client-id:}")
    private String naverClientId;
    @Value("${app.stock.naver.client-secret:}")
    private String naverClientSecret;

    private String kisAccessToken;
    private long kisTokenExpiresAtMs;

    public List<StockQuoteDto> getQuotes(List<String> symbols) {
        return symbols.stream()
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .distinct()
                .limit(50)
                .map(this::getOfficialQuote)
                .toList();
    }

    public StockMarketStatusDto getMarketStatus(String baseTime) {
        return StockMarketStatusDto.builder()
                .baseTime("15".equals(baseTime) ? "15:00" : "08:00")
                .source("Official providers only")
                .quotes(getQuotes(MARKET_STATUS_SYMBOLS))
                .build();
    }

    public List<StockNewsDto> getNews(List<String> symbols) {
        return getNews(symbols, List.of());
    }

    /**
     * names는 symbols와 같은 순서·개수로 대응하는 종목명(선택, 없으면 빈 리스트).
     * 국내 종목의 네이버 뉴스 검색은 "005930.KS" 같은 티커 문자열이 아니라 "삼성전자" 같은
     * 실제 종목명으로 검색해야 한다 — 실제 기사 본문·제목엔 티커가 그대로 쓰이는 경우가 거의 없고,
     * (거래소 접미사까지 붙은) "005930.KS" 형태는 로이터/블룸버그식 표기를 그대로 인용하는
     * 국제 신디케이션 기사에만 드물게 등장한다. 그래서 티커로 검색하면 삼성전자·NAVER처럼
     * 그런 신디케이션 기사가 있는 대형주만 우연히 걸리고, 나머지 종목(중소형주·ETF)은 실제로는
     * 뉴스가 있어도 항상 0건으로 조회돼 추천 후보에서 빠지는 문제가 있었다.
     */
    public List<StockNewsDto> getNews(List<String> symbols, List<String> names) {
        Map<String, String> nameBySymbol = new java.util.LinkedHashMap<>();
        for (int i = 0; i < symbols.size(); i++) {
            String symbol = symbols.get(i) == null ? null : symbols.get(i).trim();
            if (symbol == null || symbol.isBlank()) continue;
            String name = (names != null && i < names.size()) ? names.get(i) : null;
            if (name != null) name = name.trim();
            if (name != null && !name.isBlank()) nameBySymbol.putIfAbsent(symbol, name);
        }
        // 주의: 예전에는 심볼 자체를 8개로, 합산 결과를 12건으로 잘랐다. 추천 후보가 8개보다 많으면
        // 뒤쪽 심볼은 애초에 뉴스 조회 시도조차 되지 않아 "뉴스 있음" 게이트를 항상 통과 못 했고,
        // 그 결과 추천 순위가 실제 시세와 무관하게 배열 앞쪽 종목으로 고정되는 원인이 됐다.
        // 심볼별 조회 개수는 이미 각 프로바이더 호출에서 3건으로 제한되므로, 여기서는 후보 전체(최대 50개)가
        // 빠짐없이 뉴스 조회를 시도하도록 심볼 제한만 다른 엔드포인트(getQuotes/getIndicators)와 맞춘다.
        //
        // 결과가 하나도 없어도 더 이상 예외를 던지지 않는다(과거엔 500 에러로 던져서, 시세는 멀쩡한데
        // 그날따라 뉴스 제공사가 전부 실패하면 추천 전체가 통째로 실패했다). 뉴스는 이제 프론트에서
        // 필수 게이트가 아니라 참고 점수로만 쓰이므로, 빈 리스트를 그대로 반환해도 추천 자체는
        // 시세만으로 계속 진행될 수 있다.
        return symbols.stream()
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .distinct()
                .limit(50)
                .flatMap(symbol -> getOfficialNewsForSymbol(symbol, nameBySymbol.get(symbol)).stream())
                .toList();
    }

    public StockProviderStatusDto getProviderStatus() {
        return StockProviderStatusDto.builder()
                .kisConfigured(hasKisConfig())
                .polygonConfigured(hasText(polygonApiKey))
                .finnhubConfigured(hasText(finnhubApiKey))
                .naverConfigured(hasText(naverClientId) && hasText(naverClientSecret))
                .policy("fail-closed: 공식 시세가 검증되지 않으면 추천을 생성하지 않음. 공식 뉴스는 참고 점수로만 반영되며 추천 여부를 막지 않음")
                .build();
    }

    /**
     * 실제 과거 시세(20거래일) 기반 기술 지표. 임의로 만든 값이 아니라 공식 API의 실제 종가·거래량으로 계산한다.
     * 과거 시세를 가져올 수 없으면 error를 채워 반환한다(가짜 값으로 대체하지 않음).
     */
    public List<StockIndicatorsDto> getIndicators(List<String> symbols) {
        return symbols.stream()
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .distinct()
                .limit(50)
                .map(this::getOfficialIndicators)
                .toList();
    }

    private StockIndicatorsDto getOfficialIndicators(String symbol) {
        boolean domestic = isDomesticSymbol(symbol);
        if (domestic) {
            if (!hasKisConfig()) return errorIndicators(symbol, "KIS 공식 API 키가 없어 국내 과거 시세를 조회할 수 없습니다.");
            return getKisIndicators(symbol);
        }
        if (!hasText(polygonApiKey)) {
            return errorIndicators(symbol, "Polygon 공식 API 키가 없어 해외 과거 시세를 조회할 수 없습니다.");
        }
        // 현재가는 getOfficialQuote로 조회한다(Polygon 실패 시 Finnhub로 자동 전환되는 기존 로직 재사용).
        // 과거 시세(이동평균·거래량 평균)는 Polygon 전용 — Finnhub 무료 티어는 과거 일봉을 제공하지 않는다.
        StockQuoteDto quote = getOfficialQuote(symbol);
        if (quote.getError() != null || quote.getPrice() == null) {
            return errorIndicators(symbol, "현재가 조회 실패로 지표를 계산할 수 없습니다.");
        }
        return getPolygonIndicators(symbol, quote);
    }

    private StockIndicatorsDto getKisIndicators(String symbol) {
        try {
            String code = symbol.replace(".KS", "").replace(".KQ", "");
            StockQuoteDto quote = getKisDomesticQuote(symbol);
            if (quote.getError() != null || quote.getPrice() == null) {
                return errorIndicators(symbol, "현재가 조회 실패로 지표를 계산할 수 없습니다.");
            }
            LocalDate end = LocalDate.now();
            LocalDate start = end.minusDays(45);
            String dateFrom = start.format(DateTimeFormatter.BASIC_ISO_DATE);
            String dateTo = end.format(DateTimeFormatter.BASIC_ISO_DATE);
            URI uri = URI.create(kisBaseUrl + "/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice"
                    + "?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=" + encode(code)
                    + "&FID_INPUT_DATE_1=" + dateFrom + "&FID_INPUT_DATE_2=" + dateTo
                    + "&FID_PERIOD_DIV_CODE=D&FID_ORG_ADJ_PRC=0");
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(getKisAccessToken());
            headers.set("appkey", kisAppKey);
            headers.set("appsecret", kisAppSecret);
            headers.set("tr_id", "FHKST03010100");
            JsonNode root = exchangeJson(uri, headers);
            List<JsonNode> days = toList(root.path("output2")).stream()
                    .sorted((a, b) -> b.path("stck_bsop_date").asText("").compareTo(a.path("stck_bsop_date").asText("")))
                    .limit(MA_PERIOD)
                    .toList();
            if (days.size() < 5) return errorIndicators(symbol, "과거 시세 데이터가 부족해 지표를 계산할 수 없습니다.");

            List<Double> closes = new ArrayList<>();
            List<Long> volumes = new ArrayList<>();
            for (JsonNode day : days) {
                Double close = parseDouble(day.path("stck_clpr").asText(null));
                Long volume = parseLong(day.path("acml_vol").asText(null));
                if (close != null) closes.add(close);
                if (volume != null) volumes.add(volume);
            }
            return buildIndicators(symbol, quote.getPrice(), quote.getVolume(), closes, volumes, KIS_SOURCE);
        } catch (Exception e) {
            return errorIndicators(symbol, "KIS 과거 시세 조회 실패: " + e.getMessage());
        }
    }

    private StockIndicatorsDto getPolygonIndicators(String symbol, StockQuoteDto quote) {
        try {
            LocalDate end = LocalDate.now();
            LocalDate start = end.minusDays(45);
            String from = start.format(DateTimeFormatter.ISO_LOCAL_DATE);
            String to = end.format(DateTimeFormatter.ISO_LOCAL_DATE);
            URI uri = URI.create("https://api.polygon.io/v2/aggs/ticker/" + encode(symbol)
                    + "/range/1/day/" + from + "/" + to
                    + "?adjusted=true&sort=desc&limit=" + MA_PERIOD + "&apiKey=" + encode(polygonApiKey));
            JsonNode root = exchangeJson(uri, new HttpHeaders());
            List<JsonNode> results = toList(root.path("results"));
            if (results.size() < 5) return errorIndicators(symbol, "과거 시세 데이터가 부족해 지표를 계산할 수 없습니다.");

            List<Double> closes = new ArrayList<>();
            List<Long> volumes = new ArrayList<>();
            for (JsonNode day : results) {
                Double close = readDouble(day.path("c"));
                Long volume = readLong(day.path("v"));
                if (close != null) closes.add(close);
                if (volume != null) volumes.add(volume);
            }
            return buildIndicators(symbol, quote.getPrice(), quote.getVolume(), closes, volumes, POLYGON_SOURCE);
        } catch (Exception e) {
            return errorIndicators(symbol, "Polygon 과거 시세 조회 실패: " + e.getMessage());
        }
    }

    private StockIndicatorsDto buildIndicators(String symbol, Double currentPrice, Long currentVolume,
                                                List<Double> closes, List<Long> volumes, String source) {
        Double ma = average(closes);
        Double avgVolume = averageLong(volumes);
        Double ma20DeviationPercent = (ma != null && ma != 0 && currentPrice != null)
                ? round((currentPrice - ma) / ma * 100) : null;
        Double volumeChangeRate = (avgVolume != null && avgVolume != 0 && currentVolume != null)
                ? round((currentVolume - avgVolume) / avgVolume * 100) : null;
        Boolean overheating = ma20DeviationPercent != null ? ma20DeviationPercent > OVERHEATING_THRESHOLD_PERCENT : null;
        return StockIndicatorsDto.builder()
                .symbol(symbol)
                .volumeChangeRate(volumeChangeRate)
                .ma20DeviationPercent(ma20DeviationPercent)
                .overheating(overheating)
                .source(source)
                .build();
    }

    private Double average(List<Double> values) {
        if (values == null || values.isEmpty()) return null;
        double sum = 0;
        for (Double v : values) sum += v;
        return sum / values.size();
    }

    private Double averageLong(List<Long> values) {
        if (values == null || values.isEmpty()) return null;
        long sum = 0;
        for (Long v : values) sum += v;
        return (double) sum / values.size();
    }

    private StockIndicatorsDto errorIndicators(String symbol, String message) {
        return StockIndicatorsDto.builder()
                .symbol(symbol)
                .source("Official providers only")
                .error(message)
                .build();
    }

    private StockQuoteDto getOfficialQuote(String symbol) {
        boolean domestic = isDomesticSymbol(symbol);
        if (domestic) {
            if (!hasKisConfig()) return errorQuote(symbol, "KIS 공식 API 키가 없어 국내 시세를 검증할 수 없습니다.");
            return getKisDomesticQuote(symbol);
        }
        if (hasText(polygonApiKey)) {
            StockQuoteDto quote = getPolygonQuote(symbol);
            if (quote.getError() == null) return quote;
        }
        if (hasText(finnhubApiKey)) {
            return getFinnhubQuote(symbol);
        }
        return errorQuote(symbol, "Polygon 또는 Finnhub 공식 API 키가 없어 해외 시세를 검증할 수 없습니다.");
    }

    private StockQuoteDto getKisDomesticQuote(String symbol) {
        try {
            String code = symbol.replace(".KS", "").replace(".KQ", "");
            URI uri = URI.create(kisBaseUrl + "/uapi/domestic-stock/v1/quotations/inquire-price"
                    + "?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=" + encode(code));
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(getKisAccessToken());
            headers.set("appkey", kisAppKey);
            headers.set("appsecret", kisAppSecret);
            headers.set("tr_id", "FHKST01010100");
            JsonNode root = exchangeJson(uri, headers);
            JsonNode output = root.path("output");
            if (output.isMissingNode() || output.path("stck_prpr").isMissingNode()) {
                return errorQuote(symbol, "KIS 국내 시세 응답을 해석할 수 없습니다.");
            }
            Double price = parseDouble(output.path("stck_prpr").asText());
            Double change = parseDouble(output.path("prdy_vrss").asText());
            Double changePercent = parseDouble(output.path("prdy_ctrt").asText());
            Double previousClose = price != null && change != null ? round(price - change) : null;
            Long volume = parseLong(output.path("acml_vol").asText());
            return StockQuoteDto.builder()
                    .symbol(symbol)
                    .name(symbol)
                    .price(price)
                    .previousClose(previousClose)
                    .change(change)
                    .changePercent(changePercent)
                    .volume(volume)
                    .currency("KRW")
                    .source(KIS_SOURCE)
                    .build();
        } catch (Exception e) {
            return errorQuote(symbol, "KIS 국내 시세 조회 실패: " + e.getMessage());
        }
    }

    private StockQuoteDto getPolygonQuote(String symbol) {
        try {
            URI uri = URI.create("https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/"
                    + encode(symbol) + "?apiKey=" + encode(polygonApiKey));
            JsonNode root = exchangeJson(uri, new HttpHeaders());
            JsonNode ticker = root.path("ticker");
            if (ticker.isMissingNode()) return errorQuote(symbol, "Polygon snapshot 응답을 해석할 수 없습니다.");
            Double price = firstNumber(ticker.path("lastTrade").path("p"), ticker.path("day").path("c"), ticker.path("min").path("c"));
            Double previousClose = readDouble(ticker.path("prevDay").path("c"));
            Double change = price != null && previousClose != null ? round(price - previousClose) : null;
            Double changePercent = change != null && previousClose != null && previousClose != 0 ? round((change / previousClose) * 100) : null;
            Long volume = readLong(ticker.path("day").path("v"));
            return StockQuoteDto.builder()
                    .symbol(symbol)
                    .name(symbol)
                    .price(price)
                    .previousClose(previousClose)
                    .change(change)
                    .changePercent(changePercent)
                    .volume(volume)
                    .currency("USD")
                    .source(POLYGON_SOURCE)
                    .build();
        } catch (Exception e) {
            return errorQuote(symbol, "Polygon 시세 조회 실패: " + e.getMessage());
        }
    }

    private StockQuoteDto getFinnhubQuote(String symbol) {
        try {
            URI uri = URI.create("https://finnhub.io/api/v1/quote?symbol=" + encode(symbol) + "&token=" + encode(finnhubApiKey));
            JsonNode root = exchangeJson(uri, new HttpHeaders());
            Double price = readDouble(root.path("c"));
            Double previousClose = readDouble(root.path("pc"));
            Double change = readDouble(root.path("d"));
            Double changePercent = readDouble(root.path("dp"));
            if (price == null || price == 0) return errorQuote(symbol, "Finnhub 시세 응답에 현재가가 없습니다.");
            return StockQuoteDto.builder()
                    .symbol(symbol)
                    .name(symbol)
                    .price(price)
                    .previousClose(previousClose)
                    .change(change)
                    .changePercent(changePercent)
                    .marketTime(root.path("t").isNumber() ? root.path("t").asLong() : null)
                    .currency("USD")
                    .source(FINNHUB_SOURCE)
                    .build();
        } catch (Exception e) {
            return errorQuote(symbol, "Finnhub 시세 조회 실패: " + e.getMessage());
        }
    }

    private List<StockNewsDto> getOfficialNewsForSymbol(String symbol, String name) {
        if (hasText(naverClientId) && isDomesticSymbol(symbol)) {
            List<StockNewsDto> naverNews = getNaverNews(symbol, name);
            if (!naverNews.isEmpty()) return naverNews;
        }
        if (hasText(polygonApiKey) && !isDomesticSymbol(symbol)) {
            List<StockNewsDto> polygonNews = getPolygonNews(symbol);
            if (!polygonNews.isEmpty()) return polygonNews;
        }
        if (hasText(finnhubApiKey) && !isDomesticSymbol(symbol)) {
            return getFinnhubNews(symbol);
        }
        return List.of();
    }

    private String stripDomesticSuffix(String symbol) {
        return symbol.replace(".KS", "").replace(".KQ", "");
    }

    // 종목명이 있으면 종목명으로 먼저 검색(실제 기사가 매칭되는 정상 경로), 결과가 없으면
    // 거래소 접미사를 뗀 순수 코드로 한 번 더 시도한다. 둘 다 없으면(과거 동작 유지) 원래 심볼로 검색.
    private List<StockNewsDto> getNaverNews(String symbol, String name) {
        String bareCode = stripDomesticSuffix(symbol);
        String primaryQuery = hasText(name) ? name : bareCode;
        List<StockNewsDto> primary = searchNaverNews(symbol, primaryQuery);
        if (!primary.isEmpty()) return primary;
        if (!primaryQuery.equals(bareCode)) {
            return searchNaverNews(symbol, bareCode);
        }
        return List.of();
    }

    private List<StockNewsDto> searchNaverNews(String symbol, String query) {
        try {
            URI uri = URI.create("https://openapi.naver.com/v1/search/news.json?display=3&sort=date&query=" + encode(query));
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Naver-Client-Id", naverClientId);
            headers.set("X-Naver-Client-Secret", naverClientSecret);
            JsonNode root = exchangeJson(uri, headers);
            return toList(root.path("items")).stream()
                    .map(item -> StockNewsDto.builder()
                            .symbol(symbol)
                            .title(stripHtml(item.path("title").asText()))
                            .link(item.path("link").asText())
                            .publishedAt(item.path("pubDate").asText())
                            .source(NAVER_SOURCE)
                            .build())
                    .toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    private List<StockNewsDto> getPolygonNews(String symbol) {
        try {
            URI uri = URI.create("https://api.polygon.io/v2/reference/news?ticker=" + encode(symbol)
                    + "&limit=3&apiKey=" + encode(polygonApiKey));
            JsonNode root = exchangeJson(uri, new HttpHeaders());
            return toList(root.path("results")).stream()
                    .map(item -> StockNewsDto.builder()
                            .symbol(symbol)
                            .title(item.path("title").asText())
                            .link(item.path("article_url").asText())
                            .publishedAt(item.path("published_utc").asText())
                            .source(POLYGON_SOURCE)
                            .build())
                    .toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    private List<StockNewsDto> getFinnhubNews(String symbol) {
        try {
            LocalDate to = LocalDate.now();
            LocalDate from = to.minusDays(7);
            URI uri = URI.create("https://finnhub.io/api/v1/company-news?symbol=" + encode(symbol)
                    + "&from=" + from + "&to=" + to + "&token=" + encode(finnhubApiKey));
            JsonNode root = exchangeJson(uri, new HttpHeaders());
            return toList(root).stream()
                    .limit(3)
                    .map(item -> StockNewsDto.builder()
                            .symbol(symbol)
                            .title(item.path("headline").asText())
                            .link(item.path("url").asText())
                            .publishedAt(item.path("datetime").asText())
                            .source(FINNHUB_SOURCE)
                            .build())
                    .toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    private String getKisAccessToken() {
        long now = System.currentTimeMillis();
        if (hasText(kisAccessToken) && now < kisTokenExpiresAtMs) return kisAccessToken;
        URI uri = URI.create(kisBaseUrl + "/oauth2/tokenP");
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        JsonNode root = restTemplate.postForObject(
                uri,
                new HttpEntity<>(Map.of(
                        "grant_type", "client_credentials",
                        "appkey", kisAppKey,
                        "appsecret", kisAppSecret
                ), headers),
                JsonNode.class
        );
        if (root == null || root.path("access_token").asText("").isBlank()) {
            throw new IllegalStateException("KIS access token 발급 실패");
        }
        kisAccessToken = root.path("access_token").asText();
        long expiresIn = root.path("expires_in").asLong(3600);
        kisTokenExpiresAtMs = now + Math.max(60, expiresIn - 60) * 1000;
        return kisAccessToken;
    }

    private JsonNode exchangeJson(URI uri, HttpHeaders headers) {
        ResponseEntity<JsonNode> response = restTemplate.exchange(uri, HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class);
        return response.getBody();
    }

    private boolean isDomesticSymbol(String symbol) {
        return symbol.endsWith(".KS") || symbol.endsWith(".KQ") || symbol.matches("\\d{6}");
    }

    private boolean hasKisConfig() {
        return hasText(kisBaseUrl) && hasText(kisAppKey) && hasText(kisAppSecret);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private List<JsonNode> toList(JsonNode node) {
        if (node == null || !node.isArray()) return List.of();
        return java.util.stream.StreamSupport.stream(node.spliterator(), false).toList();
    }

    private Double firstNumber(JsonNode... values) {
        for (JsonNode value : values) {
          Double parsed = readDouble(value);
          if (parsed != null && parsed != 0) return parsed;
        }
        return null;
    }

    private Double readDouble(JsonNode node) {
        return node != null && node.isNumber() ? node.asDouble() : null;
    }

    private Double parseDouble(String value) {
        try {
            if (value == null || value.isBlank()) return null;
            return Double.parseDouble(value.replace(",", ""));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Long parseLong(String value) {
        try {
            if (value == null || value.isBlank()) return null;
            return Long.parseLong(value.replace(",", ""));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Long readLong(JsonNode node) {
        return node != null && node.isNumber() ? node.asLong() : null;
    }

    private Double round(Double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private String stripHtml(String value) {
        return value == null ? "" : value.replaceAll("<[^>]*>", "");
    }

    private StockQuoteDto errorQuote(String symbol, String message) {
        return StockQuoteDto.builder()
                .symbol(symbol)
                .source("Official providers only")
                .error(message)
                .build();
    }
}
