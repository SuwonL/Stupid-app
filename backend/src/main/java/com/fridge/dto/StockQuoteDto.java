package com.fridge.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StockQuoteDto {
    private String symbol;
    private String name;
    private Double price;
    private Double previousClose;
    private Double change;
    private Double changePercent;
    private Long volume;
    private Long marketTime;
    private String currency;
    private String source;
    private String error;
}
