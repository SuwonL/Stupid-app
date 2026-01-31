package com.fridge.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeDto {
    private Long id;
    private String name;
    private String description;
    private String imageUrl;
    private String mainCategory;
    private String subCategory;
    private List<String> ingredientNames;
    /** 유튜브 영상 ID (썸네일: https://img.youtube.com/vi/{youtubeVideoId}/mqdefault.jpg) */
    private String youtubeVideoId;
}
