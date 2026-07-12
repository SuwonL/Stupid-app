package com.fridge.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class StockMarketStatusDto {
    private String baseTime;
    private String source;
    private List<StockQuoteDto> quotes;
}
