package com.fridge.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StockProviderStatusDto {
    private boolean kisConfigured;
    private boolean polygonConfigured;
    private boolean finnhubConfigured;
    private boolean naverConfigured;
    private String policy;
}
