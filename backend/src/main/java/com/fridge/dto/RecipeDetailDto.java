package com.fridge.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeDetailDto {
    private Long id;
    private String name;
    private String description;
    private String mainCategory;
    private String subCategory;
    /** 재료명 (수량 있으면 "재료명: 수량" 형태) */
    private List<String> ingredientsWithAmount;
    /** 요리 순서 */
    private List<String> steps;
    /** 유튜브 영상 ID (embed: https://www.youtube.com/embed/{youtubeVideoId}) */
    private String youtubeVideoId;
    private String youtubeTitle;
}
