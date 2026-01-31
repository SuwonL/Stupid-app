package com.fridge.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecommendResponse {
    /** 선택한 재료로 검색한 유튜브 영상, 최대 5개 랜덤 */
    private List<YoutubeRecommendationDto> youtubeRecommendations;
    /** 레시피 추천, 최대 5개 랜덤 */
    private List<RecipeDto> recipeRecommendations;
}
