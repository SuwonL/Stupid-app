package com.fridge.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StockNewsDto {
    private String symbol;
    private String title;
    private String link;
    private String publishedAt;
    private String source;
}
