package com.fridge.service;

import com.fridge.dto.RecipeDetailDto;
import com.fridge.dto.RecipeDto;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * Spoonacular API: 재료로 레시피 검색·상세.
 * API 키는 환경변수 또는 application-local.properties에만 설정 (저장소/배포에 포함 금지).
 * 무료 한도(50포인트/일) 내에서만 호출. 초과 시 당일 추가 호출 안 함.
 */
@Service
@RequiredArgsConstructor
public class SpoonacularService {

    private static final Logger log = LoggerFactory.getLogger(SpoonacularService.class);
    private static final String BASE = "https://api.spoonacular.com";
    /** 무료 50포인트/일 기준, findByIngredients 1+0.01*10 ≈ 1.1 포인트/회 → 일 45회까지 */
    private static final int FREE_DAILY_REQUESTS = 45;

    private final RestTemplate restTemplate = new RestTemplate();
    private volatile LocalDate lastRequestDate = null;
    private final AtomicInteger dailyRequestCount = new AtomicInteger(0);

    @Value("${app.spoonacular.api-key:}")
    private String apiKey;

    /** 한글 재료명 → Spoonacular 검색용 영어 (없으면 원문 사용) */
    private static final Map<String, String> KO_TO_EN = Map.ofEntries(
            Map.entry("돼지고기", "pork"), Map.entry("소고기", "beef"), Map.entry("닭고기", "chicken"),
            Map.entry("베이컨", "bacon"), Map.entry("달걀", "egg"), Map.entry("참치캔", "tuna"),
            Map.entry("스팸", "spam"), Map.entry("두부", "tofu"), Map.entry("양파", "onion"),
            Map.entry("감자", "potato"), Map.entry("당근", "carrot"), Map.entry("대파", "green onion"),
            Map.entry("마늘", "garlic"), Map.entry("깻잎", "perilla"), Map.entry("애호박", "zucchini"),
            Map.entry("버섯", "mushroom"), Map.entry("콩나물", "bean sprouts"), Map.entry("시금치", "spinach"),
            Map.entry("김치", "kimchi"), Map.entry("고추장", "gochujang"), Map.entry("간장", "soy sauce"),
            Map.entry("고춧가루", "red pepper flakes"), Map.entry("된장", "doenjang"), Map.entry("참기름", "sesame oil"),
            Map.entry("라면", "ramen"), Map.entry("밥", "rice")
    );

    /** 재료 이름 목록으로 레시피 실시간 검색. 키 없거나 무료 한도 초과 시 빈 리스트 */
    public List<RecipeDto> findRecipesByIngredients(List<String> ingredientNames) {
        if (apiKey == null || apiKey.isBlank()) {
            log.info("Spoonacular API 키가 없어 실시간 검색을 건너뜁니다. application-local.properties에 app.spoonacular.api-key= 를 넣거나 환경변수 APP_SPOONACULAR_API_KEY 를 설정하세요.");
            return List.of();
        }
        if (ingredientNames == null || ingredientNames.isEmpty()) return List.of();
        if (!withinFreeDailyLimit()) {
            log.debug("Spoonacular 무료 한도 초과로 호출 생략 (일 {}회)", FREE_DAILY_REQUESTS);
            return List.of();
        }
        List<String> forApi = ingredientNames.stream()
                .filter(s -> s != null && !s.isBlank())
                .map(s -> KO_TO_EN.getOrDefault(s.trim(), s.trim()))
                .map(s -> s.replace(",", ""))
                .limit(20)
                .distinct()
                .collect(Collectors.toList());
        if (forApi.isEmpty()) return List.of();
        String ingredientsParam = String.join(",", forApi);
        String url = UriComponentsBuilder.fromHttpUrl(BASE + "/recipes/findByIngredients")
                .queryParam("ingredients", ingredientsParam)
                .queryParam("number", 10)
                .queryParam("ranking", 1)
                .queryParam("apiKey", apiKey)
                .toUriString();
        try {
            List<Map<String, Object>> list = restTemplate.exchange(url, HttpMethod.GET, null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}).getBody();
            if (list == null) return List.of();
            List<RecipeDto> result = new ArrayList<>();
            for (Map<String, Object> item : list) {
                Object idObj = item.get("id");
                if (!(idObj instanceof Number)) continue;
                int extId = ((Number) idObj).intValue();
                String title = (String) item.get("title");
                String image = (String) item.get("image");
                if (image != null && !image.startsWith("http")) image = "https://img.spoonacular.com/recipes/" + image;
                List<String> ingNames = new ArrayList<>();
                addIngredientNames(item, "usedIngredients", ingNames);
                addIngredientNames(item, "missedIngredients", ingNames);
                result.add(RecipeDto.builder()
                        .id((long) -extId)
                        .name(title != null ? title : "")
                        .description(null)
                        .imageUrl(image)
                        .mainCategory("외부")
                        .subCategory("Spoonacular")
                        .ingredientNames(ingNames.isEmpty() ? null : ingNames)
                        .build());
            }
            return result;
        } catch (Exception e) {
            return List.of();
        }
    }

    /** 당일 무료 한도 이내면 true, 호출 시 카운트 증가 */
    private synchronized boolean withinFreeDailyLimit() {
        LocalDate today = LocalDate.now();
        if (lastRequestDate == null || !lastRequestDate.equals(today)) {
            lastRequestDate = today;
            dailyRequestCount.set(0);
        }
        if (dailyRequestCount.get() >= FREE_DAILY_REQUESTS) return false;
        dailyRequestCount.incrementAndGet();
        return true;
    }

    @SuppressWarnings("unchecked")
    private void addIngredientNames(Map<String, Object> item, String key, List<String> out) {
        Object list = item.get(key);
        if (!(list instanceof List)) return;
        for (Object o : (List<?>) list) {
            if (!(o instanceof Map)) continue;
            String name = (String) ((Map<String, Object>) o).get("name");
            if (name != null && !name.isBlank()) out.add(name);
        }
    }

    /** Spoonacular 레시피 상세. id는 양수 Spoonacular id */
    public RecipeDetailDto getRecipeDetail(long spoonacularId, YouTubeService youTubeService) {
        if (apiKey == null || apiKey.isBlank()) return null;
        String infoUrl = UriComponentsBuilder.fromHttpUrl(BASE + "/recipes/" + spoonacularId + "/information")
                .queryParam("apiKey", apiKey)
                .toUriString();
        try {
            Map<String, Object> info = restTemplate.getForObject(infoUrl, Map.class);
            if (info == null) return null;
            String title = (String) info.get("title");
            List<String> ingredientsWithAmount = parseExtendedIngredients(info.get("extendedIngredients"));
            List<String> steps = parseAnalyzedInstructions(info.get("analyzedInstructions"));
            if (steps.isEmpty()) {
                String stepsUrl = UriComponentsBuilder.fromHttpUrl(BASE + "/recipes/" + spoonacularId + "/analyzedInstructions")
                        .queryParam("apiKey", apiKey)
                        .toUriString();
                List<Map<String, Object>> analyzed = restTemplate.exchange(stepsUrl, HttpMethod.GET, null,
                        new ParameterizedTypeReference<List<Map<String, Object>>>() {}).getBody();
                if (analyzed != null) for (Map<String, Object> block : analyzed) steps.addAll(parseStepsFromBlock(block));
            }
            if (steps.isEmpty() && info.get("instructions") != null) {
                String html = info.get("instructions").toString();
                if (!html.isBlank()) steps = List.of(html.replaceAll("<[^>]+>", " ").trim());
            }
            var video = youTubeService != null ? youTubeService.searchTopVideoLastYear(title) : null;
            return RecipeDetailDto.builder()
                    .id((long) -spoonacularId)
                    .name(title != null ? title : "")
                    .description((String) info.get("summary"))
                    .mainCategory("외부")
                    .subCategory("Spoonacular")
                    .ingredientsWithAmount(ingredientsWithAmount)
                    .steps(steps)
                    .youtubeVideoId(video != null ? video.getVideoId() : null)
                    .youtubeTitle(video != null ? video.getTitle() : null)
                    .build();
        } catch (Exception e) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private List<String> parseExtendedIngredients(Object ext) {
        if (!(ext instanceof List)) return List.of();
        List<String> out = new ArrayList<>();
        for (Object o : (List<?>) ext) {
            if (!(o instanceof Map)) continue;
            Map<String, Object> m = (Map<String, Object>) o;
            String original = (String) m.get("original");
            if (original != null && !original.isBlank()) out.add(original);
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private List<String> parseAnalyzedInstructions(Object analyzed) {
        if (!(analyzed instanceof List)) return List.of();
        List<String> steps = new ArrayList<>();
        for (Object block : (List<?>) analyzed) {
            if (!(block instanceof Map)) continue;
            steps.addAll(parseStepsFromBlock((Map<String, Object>) block));
        }
        return steps;
    }

    @SuppressWarnings("unchecked")
    private List<String> parseStepsFromBlock(Map<String, Object> block) {
        List<String> steps = new ArrayList<>();
        Object stepsList = block.get("steps");
        if (!(stepsList instanceof List)) return steps;
        for (Object s : (List<?>) stepsList) {
            if (!(s instanceof Map)) continue;
            String step = (String) ((Map<String, Object>) s).get("step");
            if (step != null && !step.isBlank()) steps.add(step);
        }
        return steps;
    }
}
