package com.fridge.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class StockAiAnalysisDto {
    private boolean enabled;
    private String model;
    private String source;
    private String action;
    private String summary;
    private List<String> buyChecklist;
    private List<String> riskChecklist;
    private String invalidationPoint;
    private String positionSizing;
    private String error;
}
