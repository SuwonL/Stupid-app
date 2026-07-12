package com.fridge.service;

import com.fasterxml.jackson.databind.JsonNode;
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
                .limit(30)
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
        List<StockNewsDto> news = symbols.stream()
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .distinct()
                .limit(8)
                .flatMap(symbol -> getOfficialNewsForSymbol(symbol).stream())
                .limit(12)
                .toList();
        if (news.isEmpty()) {
            throw new IllegalStateException("정식 뉴스 API가 설정되지 않았거나 뉴스를 가져오지 못했습니다.");
        }
        return news;
    }

    public StockProviderStatusDto getProviderStatus() {
        return StockProviderStatusDto.builder()
                .kisConfigured(hasKisConfig())
                .polygonConfigured(hasText(polygonApiKey))
                .finnhubConfigured(hasText(finnhubApiKey))
                .naverConfigured(hasText(naverClientId) && hasText(naverClientSecret))
                .policy("fail-closed: 공식 시세/뉴스가 검증되지 않으면 추천을 생성하지 않음")
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

    private List<StockNewsDto> getOfficialNewsForSymbol(String symbol) {
        if (hasText(naverClientId) && isDomesticSymbol(symbol)) {
            List<StockNewsDto> naverNews = getNaverNews(symbol);
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

    private List<StockNewsDto> getNaverNews(String symbol) {
        try {
            URI uri = URI.create("https://openapi.naver.com/v1/search/news.json?display=3&sort=date&query=" + encode(symbol));
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
