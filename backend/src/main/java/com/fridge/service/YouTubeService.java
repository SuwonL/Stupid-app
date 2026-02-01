package com.fridge.service;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 유튜브 검색: 메뉴명으로 검색, 최근 1년, 조회수 순 1개.
 * API 키 없으면 null 반환. (application.properties: app.youtube.api-key=...)
 * Google Cloud에서 YouTube Data API v3 사용 설정 필요.
 */
@Service
@RequiredArgsConstructor
public class YouTubeService {

    private static final Logger log = LoggerFactory.getLogger(YouTubeService.class);
    private static volatile boolean loggedNoKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.youtube.api-key:}")
    private String apiKey;

    private static final String SEARCH_URL = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=viewCount&maxResults=1&q={q}&publishedAfter={publishedAfter}&key={key}";
    private static final String SEARCH_URL_MULTI = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=viewCount&maxResults=15&q={q}&publishedAfter={publishedAfter}&key={key}";
    private static final String VIDEO_DETAIL_URL = "https://www.googleapis.com/youtube/v3/videos?part=snippet&id={id}&key={key}";

    public YouTubeVideoResult searchTopVideoLastYear(String recipeName) {
        if (apiKey == null || apiKey.isBlank()) {
            if (!loggedNoKey) {
                loggedNoKey = true;
                log.info("YouTube API 키가 없어 썸네일/영상이 표시되지 않습니다. backend/application-local.properties에 app.youtube.api-key= 를 넣거나 환경변수 APP_YOUTUBE_API_KEY 를 설정하세요.");
            }
            return null;
        }
        String q = (recipeName != null ? recipeName : "").trim();
        if (q.isEmpty()) return null;
        String publishedAfter = ZonedDateTime.now().minusYears(1).format(DateTimeFormatter.ISO_INSTANT);
        try {
            Map<String, ?> response = restTemplate.getForObject(SEARCH_URL, Map.class, q, publishedAfter, apiKey);
            if (response == null) return null;
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> items = (List<Map<String, Object>>) response.get("items");
            if (items == null || items.isEmpty()) return null;
            Map<String, Object> first = items.get(0);
            Object idObj = first.get("id");
            if (!(idObj instanceof Map)) return null;
            @SuppressWarnings("unchecked")
            String videoId = (String) ((Map<String, Object>) idObj).get("videoId");
            Object snippetObj = first.get("snippet");
            String title = null;
            if (snippetObj instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> snippet = (Map<String, Object>) snippetObj;
                title = (String) snippet.get("title");
            }
            return new YouTubeVideoResult(videoId, title);
        } catch (Exception e) {
            log.warn("YouTube 검색 실패 (메뉴: {}): {}. YouTube Data API v3 사용 설정·할당량 확인: https://console.cloud.google.com/apis/library/youtube.googleapis.com", q, e.getMessage());
            return null;
        }
    }

    /** 선택한 재료 이름으로 유튜브 검색. strictOnly=true면 "해당 재료만", false면 "다양하게". 실패 시 errorReason에 사유 담김. */
    public YouTubeSearchResult searchByIngredients(List<String> ingredientNames, boolean strictOnly) {
        if (apiKey == null || apiKey.isBlank()) {
            if (!loggedNoKey) {
                loggedNoKey = true;
                log.warn("YouTube API 키가 없습니다. 유튜브 영상이 나오지 않습니다. 로컬: application-local.properties에 app.youtube.api-key= 설정. Fly.io: Secrets에 APP_YOUTUBE_API_KEY 설정 후 fly secrets deploy");
            }
            return new YouTubeSearchResult(List.of(), "YouTube API 키가 없습니다. 로컬: application-local.properties에 app.youtube.api-key 설정. Fly.io: Secrets에 APP_YOUTUBE_API_KEY 설정 후 fly secrets deploy");
        }
        if (ingredientNames == null || ingredientNames.isEmpty()) {
            log.debug("searchByIngredients: 재료 목록이 비어 있어 검색하지 않습니다.");
            return new YouTubeSearchResult(List.of(), null);
        }
        String q = ingredientNames.stream()
                .filter(s -> s != null && !s.isBlank())
                .map(String::trim)
                .limit(10)
                .collect(Collectors.joining(" "));
        if (q.isBlank()) return new YouTubeSearchResult(List.of(), null);
        q = strictOnly ? (q + " 만으로 만드는 레시피") : (q + " 레시피");
        String publishedAfter = ZonedDateTime.now().minusYears(1).format(DateTimeFormatter.ISO_INSTANT);
        try {
            Map<String, ?> response = restTemplate.getForObject(SEARCH_URL_MULTI, Map.class, q, publishedAfter, apiKey);
            if (response == null) {
                log.warn("YouTube 검색 응답이 null입니다. (q: {})", q);
                return new YouTubeSearchResult(List.of(), "YouTube 검색 응답이 없습니다. 네트워크 또는 API 상태를 확인하세요.");
            }
            Object errorObj = response.get("error");
            if (errorObj instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> err = (Map<String, Object>) errorObj;
                Integer code = (Integer) err.get("code");
                String message = (String) err.get("message");
                log.warn("YouTube API 에러 (q: {}). code={}, message={}. API 키·할당량·YouTube Data API v3 사용 설정을 확인하세요.", q, code, message);
                String reason = message != null ? message : ("code=" + code);
                if (code != null && code == 403) {
                    reason = "할당량 초과 또는 API 접근 거부(403). " + (message != null ? message : "Google Cloud Console에서 YouTube Data API v3 할당량·API 사용 설정을 확인하세요.");
                }
                return new YouTubeSearchResult(List.of(), reason);
            }
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> items = (List<Map<String, Object>>) response.get("items");
            if (items == null || items.isEmpty()) {
                log.debug("YouTube 검색 결과 없음 (q: {}). 응답에 items가 없거나 비어 있습니다.", q);
                return new YouTubeSearchResult(List.of(), null);
            }
            List<YouTubeVideoResult> list = new ArrayList<>();
            for (Map<String, Object> item : items) {
                Object idObj = item.get("id");
                if (!(idObj instanceof Map)) continue;
                @SuppressWarnings("unchecked")
                String videoId = (String) ((Map<String, Object>) idObj).get("videoId");
                if (videoId == null || videoId.isBlank()) continue;
                String title = null;
                Object snippetObj = item.get("snippet");
                if (snippetObj instanceof Map) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> snippet = (Map<String, Object>) snippetObj;
                    title = (String) snippet.get("title");
                }
                list.add(new YouTubeVideoResult(videoId, title != null ? title : ""));
            }
            Collections.shuffle(list);
            return new YouTubeSearchResult(list.stream().limit(9).collect(Collectors.toList()), null);
        } catch (Exception e) {
            String friendlyReason = null;
            if (e instanceof HttpStatusCodeException ex) {
                if (ex.getStatusCode().value() == 403) {
                    String body = ex.getResponseBodyAsString();
                    if (body != null && (body.contains("quotaExceeded") || body.contains("quota"))) {
                        friendlyReason = "YouTube API 일일 할당량을 초과했습니다. 내일 다시 시도하거나 Google Cloud Console에서 할당량을 확인하세요.";
                    } else {
                        friendlyReason = "YouTube API 접근이 거부되었습니다(403). API 키·YouTube Data API v3 사용 설정을 확인하세요.";
                    }
                }
            }
            if (friendlyReason == null && e.getMessage() != null && (e.getMessage().contains("403") || e.getMessage().contains("quota"))) {
                friendlyReason = "YouTube API 일일 할당량을 초과했습니다. 내일 다시 시도하세요.";
            }
            if (friendlyReason == null) {
                friendlyReason = "YouTube 검색 실패: " + (e.getMessage() != null ? e.getMessage() : "연결 오류");
            }
            log.warn("YouTube 재료 검색 실패 (q: {}). {} - API 키(APP_YOUTUBE_API_KEY), 할당량, YouTube Data API v3 사용 설정을 확인하세요.", q, friendlyReason);
            return new YouTubeSearchResult(List.of(), friendlyReason);
        }
    }

    @Data
    public static class YouTubeSearchResult {
        private final List<YouTubeVideoResult> videos;
        /** 실패 시 사유(할당량 초과, API 키 없음 등). 성공 시 null */
        private final String errorReason;
    }

    /** 영상 상세(snippet)에서 설명(description) 조회. 자막 없을 때 레시피 추출 fallback용 */
    public String getVideoDescription(String videoId) {
        if (apiKey == null || apiKey.isBlank()) return null;
        if (videoId == null || videoId.isBlank()) return null;
        try {
            Map<String, ?> response = restTemplate.getForObject(VIDEO_DETAIL_URL, Map.class, videoId, apiKey);
            if (response == null) return null;
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> items = (List<Map<String, Object>>) response.get("items");
            if (items == null || items.isEmpty()) return null;
            Object snippetObj = items.get(0).get("snippet");
            if (!(snippetObj instanceof Map)) return null;
            return (String) ((Map<String, ?>) snippetObj).get("description");
        } catch (Exception e) {
            log.debug("영상 설명 조회 실패 videoId={}: {}", videoId, e.getMessage());
            return null;
        }
    }

    @Data
    public static class YouTubeVideoResult {
        private final String videoId;
        private final String title;
    }
}
