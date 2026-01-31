package com.fridge.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class YoutubeRecommendationDto {
    private String videoId;
    private String title;
}
