package com.fridge.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StockIndicatorsDto {
    private String symbol;
    /** 오늘 거래량이 최근 20거래일 평균 거래량 대비 몇 % 많은지 (실제 과거 시세 기반 계산). */
    private Double volumeChangeRate;
    /** 현재가가 20일 이동평균 대비 몇 % 위/아래에 있는지 (실제 과거 시세 기반 계산). */
    private Double ma20DeviationPercent;
    /** ma20DeviationPercent가 임계값을 넘으면 true (계산된 값, 임의 지정 아님). */
    private Boolean overheating;
    private String source;
    private String error;
}
