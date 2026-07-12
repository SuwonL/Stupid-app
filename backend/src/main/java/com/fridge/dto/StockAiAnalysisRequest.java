package com.fridge.dto;

import lombok.Data;

import java.util.List;

@Data
public class StockAiAnalysisRequest {
    private String name;
    private String code;
    private String symbol;
    private String marketLabel;
    private String horizonLabel;
    private String holdingPeriod;
    private Double recommendedPrice;
    private Double liveChangePercent;
    private String buyRange;
    private String takeProfitRange;
    private String stopLossRange;
    private Integer score;
    private String reason;
    private String tradeStyle;
    private List<String> riskFactors;
    private List<String> criteria;
    private List<StockNewsDto> officialNews;
}
