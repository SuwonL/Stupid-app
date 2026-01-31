package com.fridge.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IngredientDto {
    private Long id;
    private String name;
    private String category;
}
