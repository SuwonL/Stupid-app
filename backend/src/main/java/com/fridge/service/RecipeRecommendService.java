package com.fridge.service;

import com.fridge.dto.RecipeDto;
import com.fridge.dto.RecommendResponse;
import com.fridge.dto.YoutubeRecommendationDto;
import com.fridge.entity.Ingredient;
import com.fridge.entity.Recipe;
import com.fridge.entity.RecipeIngredient;
import com.fridge.repository.IngredientRepository;
import com.fridge.repository.RecipeIngredientRepository;
import com.fridge.repository.RecipeRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

import static java.util.stream.Collectors.groupingBy;

/** 검색 모드: strictOnly=true면 선택 재료만, false면 선택 재료 포함 다양하게 검색. */
@Service
@RequiredArgsConstructor
public class RecipeRecommendService {

    private static final Logger log = LoggerFactory.getLogger(RecipeRecommendService.class);
    private static final int MAX_RECIPE_RECOMMENDATIONS = 10;

    private final IngredientRepository ingredientRepository;
    private final RecipeRepository recipeRepository;
    private final RecipeIngredientRepository recipeIngredientRepository;
    private final YouTubeService youTubeService;

    @Transactional(readOnly = true)
    public RecommendResponse recommendByIngredients(List<Long> ingredientIds, List<String> ingredientNames, Boolean strictOnly) {
        boolean strict = Boolean.TRUE.equals(strictOnly);
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

        var youtubeResult = youTubeService.searchByIngredients(namesForApi, strict);
        List<YoutubeRecommendationDto> youtubeRecommendations = youtubeResult.getVideos().stream()
                .map(v -> YoutubeRecommendationDto.builder().videoId(v.getVideoId()).title(v.getTitle()).build())
                .collect(Collectors.toList());
        String youtubeErrorReason = youtubeResult.getErrorReason();
        if (youtubeRecommendations.isEmpty() && youtubeErrorReason != null) {
            log.warn("유튜브 추천 결과 없음. 재료={}, strict={}. 사유: {}", namesForApi, strict, youtubeErrorReason);
        }

        List<RecipeDto> recipeRecommendations = List.of();
        if (!allIds.isEmpty()) {
            List<Recipe> recipes = strict
                    ? recipeRepository.findRecipesByAvailableIngredients(new ArrayList<>(allIds))
                    : recipeRepository.findRecipesUsingAnyIngredient(new ArrayList<>(allIds));
            if (!recipes.isEmpty()) {
                List<Long> recipeIds = recipes.stream().map(Recipe::getId).toList();
                Map<Long, List<RecipeIngredient>> ingredientsByRecipe = recipeIngredientRepository
                        .findAllByRecipeIdIn(recipeIds)
                        .stream()
                        .collect(groupingBy(ri -> ri.getRecipe().getId()));
                recipeRecommendations = recipes.stream()
                        .map(r -> toRecipeDto(r, ingredientsByRecipe.getOrDefault(r.getId(), List.of())))
                        .collect(Collectors.toList());
                Collections.shuffle(recipeRecommendations);
                recipeRecommendations = recipeRecommendations.stream().limit(MAX_RECIPE_RECOMMENDATIONS).collect(Collectors.toList());
            }
        }

        return RecommendResponse.builder()
                .youtubeRecommendations(youtubeRecommendations)
                .youtubeErrorReason(youtubeErrorReason)
                .recipeRecommendations(recipeRecommendations)
                .build();
    }

    private RecipeDto toRecipeDto(Recipe r, List<RecipeIngredient> recipeIngredients) {
        List<String> ingredientNames = recipeIngredients.stream()
                .map(RecipeIngredient::getIngredient)
                .map(Ingredient::getName)
                .collect(Collectors.toList());
        return RecipeDto.builder()
                .id(r.getId())
                .name(r.getName())
                .description(r.getDescription())
                .imageUrl(r.getImageUrl())
                .mainCategory(r.getMainCategory())
                .subCategory(r.getSubCategory())
                .ingredientNames(ingredientNames)
                .youtubeVideoId(null)
                .build();
    }
}
