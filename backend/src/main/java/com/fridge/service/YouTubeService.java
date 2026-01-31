package com.fridge.service;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
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

    /** 선택한 재료 이름으로 유튜브 검색 (재료만 들어가는 영상). 최대 15건 조회 후 9개 랜덤 반환 */
    public List<YouTubeVideoResult> searchByIngredients(List<String> ingredientNames) {
        if (apiKey == null || apiKey.isBlank()) {
            if (!loggedNoKey) {
                loggedNoKey = true;
                log.info("YouTube API 키가 없어 썸네일/영상이 표시되지 않습니다. backend/application-local.properties에 app.youtube.api-key= 를 넣거나 환경변수 APP_YOUTUBE_API_KEY 를 설정하세요.");
            }
            return List.of();
        }
        if (ingredientNames == null || ingredientNames.isEmpty()) return List.of();
        String q = ingredientNames.stream()
                .filter(s -> s != null && !s.isBlank())
                .map(String::trim)
                .limit(10)
                .collect(Collectors.joining(" "));
        if (q.isBlank()) return List.of();
        q = q + " 레시피";
        String publishedAfter = ZonedDateTime.now().minusYears(1).format(DateTimeFormatter.ISO_INSTANT);
        try {
            Map<String, ?> response = restTemplate.getForObject(SEARCH_URL_MULTI, Map.class, q, publishedAfter, apiKey);
            if (response == null) return List.of();
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> items = (List<Map<String, Object>>) response.get("items");
            if (items == null || items.isEmpty()) return List.of();
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
            return list.stream().limit(9).collect(Collectors.toList());
        } catch (Exception e) {
            log.warn("YouTube 재료 검색 실패 (q: {}): {}", q, e.getMessage());
            return List.of();
        }
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
