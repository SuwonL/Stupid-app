package com.fridge.service;

import com.fridge.dto.RecommendResponse;
import com.fridge.dto.YoutubeRecommendationDto;
import com.fridge.entity.Ingredient;
import com.fridge.repository.IngredientRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/** 재료 기준 유튜브 추천만 반환. DB·Spoonacular 레시피 추천 없음. */
@Service
@RequiredArgsConstructor
public class RecipeRecommendService {

    private static final Logger log = LoggerFactory.getLogger(RecipeRecommendService.class);

    private final IngredientRepository ingredientRepository;
    private final YouTubeService youTubeService;

    @Transactional(readOnly = true)
    public RecommendResponse recommendByIngredients(List<Long> ingredientIds, List<String> ingredientNames) {
        Set<Long> allIds = new HashSet<>();
        if (ingredientIds != null) allIds.addAll(ingredientIds);
        if (ingredientNames != null) {
            for (String name : ingredientNames) {
                String trimmed = name != null ? name.trim() : "";
                if (trimmed.isEmpty()) continue;
                ingredientRepository.findByNameIgnoreCase(trimmed)
                        .map(Ingredient::getId)
                        .ifPresent(allIds::add);
            }
        }
        List<String> namesForApi = new ArrayList<>();
        for (Long id : allIds) {
            ingredientRepository.findById(id).map(Ingredient::getName).ifPresent(namesForApi::add);
        }
        if (ingredientNames != null) {
            for (String n : ingredientNames) {
                if (n != null && !n.isBlank() && !namesForApi.contains(n.trim())) namesForApi.add(n.trim());
            }
        }

        List<YoutubeRecommendationDto> youtubeRecommendations = youTubeService.searchByIngredients(namesForApi).stream()
                .map(v -> YoutubeRecommendationDto.builder().videoId(v.getVideoId()).title(v.getTitle()).build())
                .collect(Collectors.toList());
        if (youtubeRecommendations.isEmpty()) log.debug("유튜브 추천 없음: names={}", namesForApi);

        return RecommendResponse.builder()
                .youtubeRecommendations(youtubeRecommendations)
                .recipeRecommendations(List.of())
                .build();
    }
}
