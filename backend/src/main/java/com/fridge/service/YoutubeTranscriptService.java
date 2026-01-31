package com.fridge.service;

import com.fridge.dto.YoutubeRecipeStepsDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import lombok.RequiredArgsConstructor;

import java.net.URI;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * 유튜브 영상 자막을 추출해 레시피 순서로 정리.
 * 자막이 없으면 영상 설명(description)에서 추출 시도.
 */
@Service
@RequiredArgsConstructor
public class YoutubeTranscriptService {

    private static final Logger log = LoggerFactory.getLogger(YoutubeTranscriptService.class);
    /** watch 페이지 HTML/JSON에서 captionTracks[0].baseUrl 추출 */
    private static final Pattern CAPTION_TRACKS_PATTERN = Pattern.compile(
            "\"captionTracks\":\\s*\\[\\s*\\{\\s*\"baseUrl\":\"([^\"]+)\""
    );
    private static final int MAX_STEPS = 50;
    private static final int MIN_CHARS_PER_STEP = 15;
    /** 설명에서 번호·줄 단위로 잘라낼 때 최소 길이 */
    private static final int MIN_DESC_STEP_LENGTH = 10;

    private final RestTemplate restTemplate = new RestTemplate();
    private final YouTubeService youTubeService;

    public YoutubeRecipeStepsDto getRecipeSteps(String videoId, String videoTitle) {
        if (videoId == null || videoId.isBlank()) return emptyResult(videoId, videoTitle);
        String cleanId = videoId.trim().replaceAll("[^a-zA-Z0-9_-]", "");
        if (cleanId.isEmpty()) return emptyResult(videoId, videoTitle);

        try {
            String baseUrl = fetchCaptionBaseUrl(cleanId);
            List<String> steps = new ArrayList<>();
            if (baseUrl != null && !baseUrl.isBlank()) {
                baseUrl = baseUrl.replace("\\u0026", "&").replace("\\/", "/");
                List<String> rawLines = fetchTranscriptLines(baseUrl);
                if (!rawLines.isEmpty()) steps = organizeIntoSteps(rawLines);
            }
            if (steps.isEmpty()) {
                String description = youTubeService != null ? youTubeService.getVideoDescription(cleanId) : null;
                if (description != null && !description.isBlank()) {
                    steps = parseDescriptionIntoSteps(description);
                    if (!steps.isEmpty()) log.debug("자막 없음, 영상 설명으로 레시피 추출: videoId={}", cleanId);
                }
            }
            return YoutubeRecipeStepsDto.builder()
                    .videoId(cleanId)
                    .title(videoTitle != null ? videoTitle : "")
                    .steps(steps)
                    .build();
        } catch (Exception e) {
            log.warn("레시피 추출 실패 videoId={}: {}", cleanId, e.getMessage());
            return emptyResult(cleanId, videoTitle);
        }
    }

    private String fetchCaptionBaseUrl(String videoId) {
        try {
            String url = "https://www.youtube.com/watch?v=" + videoId;
            HttpHeaders headers = new HttpHeaders();
            headers.setAccept(List.of(MediaType.TEXT_HTML));
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            ResponseEntity<String> res = restTemplate.exchange(
                    URI.create(url),
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    String.class
            );
            String html = res.getBody();
            if (html == null || html.isBlank()) return null;

            Matcher m = CAPTION_TRACKS_PATTERN.matcher(html);
            if (m.find()) return m.group(1);
            return null;
        } catch (Exception e) {
            log.debug("watch 페이지 조회 실패: {}", e.getMessage());
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private List<String> fetchTranscriptLines(String baseUrl) {
        try {
            String url = baseUrl.contains("?") ? baseUrl + "&fmt=json3" : baseUrl + "?fmt=json3";
            Map<String, Object> body = restTemplate.getForObject(url, Map.class);
            if (body == null) return List.of();
            Object eventsObj = body.get("events");
            if (!(eventsObj instanceof List)) return List.of();
            List<String> lines = new ArrayList<>();
            for (Object ev : (List<?>) eventsObj) {
                if (!(ev instanceof Map)) continue;
                Map<String, Object> event = (Map<String, Object>) ev;
                Object segsObj = event.get("segs");
                if (!(segsObj instanceof List)) continue;
                StringBuilder line = new StringBuilder();
                for (Object s : (List<?>) segsObj) {
                    if (!(s instanceof Map)) continue;
                    String utf8 = (String) ((Map<String, Object>) s).get("utf8");
                    if (utf8 != null && !utf8.isBlank() && !"\n".equals(utf8)) {
                        line.append(utf8.trim());
                    }
                }
                if (line.length() > 0) lines.add(line.toString());
            }
            return lines;
        } catch (Exception e) {
            log.debug("자막 본문 조회 실패: {}", e.getMessage());
            return List.of();
        }
    }

    private List<String> organizeIntoSteps(List<String> rawLines) {
        List<String> merged = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (String line : rawLines) {
            String t = line.trim();
            if (t.isEmpty()) continue;
            if (current.length() > 0) current.append(" ");
            current.append(t);
            if (current.length() >= MIN_CHARS_PER_STEP || t.endsWith(".") || t.endsWith("요") || t.endsWith("다")) {
                merged.add(current.toString().trim());
                current.setLength(0);
            }
        }
        if (current.length() > 0) merged.add(current.toString().trim());

        return merged.stream()
                .filter(s -> s.length() >= 5)
                .limit(MAX_STEPS)
                .collect(Collectors.toList());
    }

    /** 영상 설명(description)을 번호·줄 단위로 잘라 레시피 단계로 변환 */
    private List<String> parseDescriptionIntoSteps(String description) {
        if (description == null || description.isBlank()) return List.of();
        String normalized = description.replace("\r\n", "\n").replace("\r", "\n").trim();
        List<String> steps = new ArrayList<>();
        for (String line : normalized.split("\n")) {
            String t = line.replaceAll("^[\\d]+[.)\\s]+", "").trim();
            if (t.length() >= MIN_DESC_STEP_LENGTH && !t.matches("^https?://.*") && !t.startsWith("http")) {
                steps.add(t);
            }
        }
        if (steps.isEmpty() && normalized.length() >= MIN_DESC_STEP_LENGTH) {
            String[] byNumber = normalized.split("\\s*[\\d]+[.)]\\s*");
            for (String s : byNumber) {
                String t = s.trim();
                if (t.length() >= MIN_DESC_STEP_LENGTH && !t.startsWith("http")) steps.add(t);
            }
        }
        return steps.stream().limit(MAX_STEPS).collect(Collectors.toList());
    }

    private YoutubeRecipeStepsDto emptyResult(String videoId, String title) {
        return YoutubeRecipeStepsDto.builder()
                .videoId(videoId != null ? videoId : "")
                .title(title != null ? title : "")
                .steps(List.of())
                .build();
    }
}
