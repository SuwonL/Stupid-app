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
    /** 유튜브 검색 실패 시 사유(할당량 초과, API 키 없음 등). 성공 시 null */
    private String youtubeErrorReason;
    /** 레시피 추천, 최대 5개 랜덤 */
    private List<RecipeDto> recipeRecommendations;
}
