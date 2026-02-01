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
    /** true: 해당 재료만 검색, false/null: 다양하게 검색(선택 재료 포함) */
    private Boolean strictOnly;
}
