package com.fridge.service;

import com.fridge.dto.RecipeDetailDto;
import com.fridge.entity.Recipe;
import com.fridge.entity.RecipeIngredient;
import com.fridge.entity.RecipeStep;
import com.fridge.repository.RecipeIngredientRepository;
import com.fridge.repository.RecipeRepository;
import com.fridge.repository.RecipeStepRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecipeDetailService {

    private final RecipeRepository recipeRepository;
    private final RecipeIngredientRepository recipeIngredientRepository;
    private final RecipeStepRepository recipeStepRepository;
    private final YouTubeService youTubeService;
    private final SpoonacularService spoonacularService;

    @Transactional(readOnly = true)
    public RecipeDetailDto getDetail(Long recipeId) {
        if (recipeId == null) return null;
        if (recipeId < 0) {
            return spoonacularService.getRecipeDetail(-recipeId.longValue(), youTubeService);
        }
        Recipe r = recipeRepository.findById(recipeId).orElse(null);
        if (r == null) return null;

        List<String> ingredientsWithAmount = recipeIngredientRepository.findAllByRecipeId(r.getId()).stream()
                .map(RecipeDetailService::formatIngredient)
                .collect(Collectors.toList());
        List<String> steps = recipeStepRepository.findAllByRecipeIdOrderByStepOrderAsc(r.getId()).stream()
                .map(RecipeStep::getStepText)
                .collect(Collectors.toList());

        var video = youTubeService.searchTopVideoLastYear(r.getName());

        return RecipeDetailDto.builder()
                .id(r.getId())
                .name(r.getName())
                .description(r.getDescription())
                .mainCategory(r.getMainCategory())
                .subCategory(r.getSubCategory())
                .ingredientsWithAmount(ingredientsWithAmount)
                .steps(steps)
                .youtubeVideoId(video != null ? video.getVideoId() : null)
                .youtubeTitle(video != null ? video.getTitle() : null)
                .build();
    }

    private static String formatIngredient(RecipeIngredient ri) {
        String name = ri.getIngredient().getName();
        if (ri.getAmount() != null && !ri.getAmount().isBlank()) return name + " " + ri.getAmount();
        return name;
    }
}
