package com.fridge.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecommendRequest {
    private List<Long> ingredientIds;
    private List<String> ingredientNames;
}
