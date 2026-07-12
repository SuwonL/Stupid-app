package com.fridge.service;

import com.fridge.dto.MemeDto;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 실시간 인기 밈 목록: Giphy Trending API.
 * (Tenor API는 2026-06-30부로 서비스 종료되어 사용하지 않음.)
 * 키가 없으면 빈 리스트 반환. (application.properties: app.giphy.api-key)
 */
@Service
@RequiredArgsConstructor
public class MemeService {

    private static final Logger log = LoggerFactory.getLogger(MemeService.class);
    private static final String GIPHY_SOURCE = "Giphy Trending API";
    private static volatile boolean loggedNoKey;

    private static final String GIPHY_TRENDING_URL = "https://api.giphy.com/v1/gifs/trending?api_key={key}&limit=10&rating=pg-13";

    private final RestTemplate restTemplate;

    @Value("${app.giphy.api-key:}")
    private String giphyApiKey;

    public List<MemeDto> getTrendingMemes() {
        if (!hasText(giphyApiKey)) {
            if (!loggedNoKey) {
                loggedNoKey = true;
                log.info("Giphy API 키가 없어 밈 목록을 표시하지 않습니다. " +
                        "backend/application-local.properties에 app.giphy.api-key 를 넣거나 " +
                        "환경변수 APP_GIPHY_API_KEY 를 설정하세요.");
            }
            return List.of();
        }

        try {
            Map<String, ?> response = restTemplate.getForObject(GIPHY_TRENDING_URL, Map.class, giphyApiKey);
            if (response == null) return List.of();
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> data = (List<Map<String, Object>>) response.get("data");
            if (data == null) return List.of();

            List<MemeDto> memes = new ArrayList<>();
            int rank = 1;
            for (Map<String, Object> item : data) {
                MemeDto meme = toMemeDto(item, rank);
                if (meme != null) {
                    memes.add(meme);
                    rank++;
                }
                if (memes.size() >= 10) break;
            }
            return memes;
        } catch (Exception e) {
            log.warn("Giphy 트렌딩 조회 실패: {}", e.getMessage());
            return List.of();
        }
    }

    private MemeDto toMemeDto(Map<String, Object> item, int rank) {
        String title = (String) item.get("title");
        if (!hasText(title)) return null;
        String altText = (String) item.get("alt_text");
        String thumbnailUrl = extractThumbnailUrl(item);
        return MemeDto.builder()
                .rank(rank)
                .term(title)
                .description(hasText(altText) ? altText : title)
                .thumbnailUrl(thumbnailUrl)
                .source(GIPHY_SOURCE)
                .build();
    }

    @SuppressWarnings("unchecked")
    private String extractThumbnailUrl(Map<String, Object> giphyItem) {
        Object imagesObj = giphyItem.get("images");
        if (!(imagesObj instanceof Map)) return null;
        Object fixedWidthObj = ((Map<String, Object>) imagesObj).get("fixed_width");
        if (!(fixedWidthObj instanceof Map)) return null;
        return (String) ((Map<String, Object>) fixedWidthObj).get("url");
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
