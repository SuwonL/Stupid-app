package com.fridge.web;

import com.fridge.dto.IngredientDto;
import com.fridge.dto.RecipeDetailDto;
import com.fridge.dto.RecipeDto;
import com.fridge.dto.RecommendRequest;
import com.fridge.dto.RecommendResponse;
import com.fridge.entity.Ingredient;
import com.fridge.repository.IngredientRepository;
import com.fridge.dto.YoutubeRecipeStepsDto;
import com.fridge.service.RecipeDetailService;
import com.fridge.service.RecipeRecommendService;
import com.fridge.service.YoutubeTranscriptService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RecipeController {

    private final IngredientRepository ingredientRepository;
    private final RecipeRecommendService recipeRecommendService;
    private final RecipeDetailService recipeDetailService;
    private final YoutubeTranscriptService youtubeTranscriptService;

    @GetMapping(value = "/ingredients", produces = "application/json;charset=UTF-8")
    public ResponseEntity<List<IngredientDto>> listIngredients() {
        List<Ingredient> all = ingredientRepository.findAllByOrderByNameAsc();
        List<IngredientDto> dtos = all.stream()
                .map(i -> IngredientDto.builder()
                        .id(i.getId())
                        .name(i.getName())
                        .category(i.getCategory())
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping(value = "/recipes/recommend", produces = "application/json;charset=UTF-8")
    public ResponseEntity<RecommendResponse> recommend(@RequestBody RecommendRequest request) {
        RecommendResponse result = recipeRecommendService.recommendByIngredients(
                request.getIngredientIds(),
                request.getIngredientNames(),
                request.getStrictOnly()
        );
        return ResponseEntity.ok(result);
    }

    @GetMapping(value = "/recipes/{id}/detail", produces = "application/json;charset=UTF-8")
    public ResponseEntity<RecipeDetailDto> recipeDetail(@PathVariable Long id) {
        RecipeDetailDto dto = recipeDetailService.getDetail(id);
        if (dto == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(dto);
    }

    @GetMapping(value = "/youtube/{videoId}/recipe-steps", produces = "application/json;charset=UTF-8")
    public ResponseEntity<YoutubeRecipeStepsDto> youtubeRecipeSteps(
            @PathVariable String videoId,
            @RequestParam(required = false) String title
    ) {
        YoutubeRecipeStepsDto dto = youtubeTranscriptService.getRecipeSteps(videoId, title);
        return ResponseEntity.ok(dto);
    }
}
