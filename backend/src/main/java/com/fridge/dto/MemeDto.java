package com.fridge.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class MemeDto {
    private int rank;
    private String term;
    private String description;
    private String thumbnailUrl;
    private String source;
    private String error;
}
