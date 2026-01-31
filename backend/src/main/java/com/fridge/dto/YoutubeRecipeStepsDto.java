package com.fridge.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class YoutubeRecipeStepsDto {
    private String videoId;
    private String title;
    private List<String> steps;
}
