package com.fridge.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class YoutubeQuotaDto {
    /** 오늘 사용한 단위 (추정) */
    private int usedToday;
    /** 일일 한도 */
    private int limit;
}
