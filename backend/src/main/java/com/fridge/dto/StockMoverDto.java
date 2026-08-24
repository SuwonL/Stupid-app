package com.fridge.dto;

import lombok.Builder;
import lombok.Data;

/**
 * 정적으로 큐레이션된 후보 목록이 아니라, 그날 실제로 시장 전체에서 등락률 상위인 종목을
 * 공식 API(국내: KIS 등락률 순위, 해외: Polygon 상승률 상위)에서 그대로 가져온 결과.
 * "오르는 종목을 찾아주는" 기능의 핵심 — 정해진 몇 개 종목 중에서 고르는 게 아니라
 * 시장 전체를 스캔한다.
 */
@Data
@Builder
public class StockMoverDto {
    private String symbol;
    private String name;
    private String region; // domestic | overseas
    private Double price;
    private Double changePercent;
    private Long volume;
    private String source;
    private String error;
}
