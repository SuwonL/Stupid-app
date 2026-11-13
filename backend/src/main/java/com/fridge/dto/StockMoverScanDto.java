package com.fridge.dto;

import java.time.Instant;
import java.util.List;

/** Per-request diagnostics; configured credentials alone do not imply a successful scan. */
public record StockMoverScanDto(List<StockMoverDto> movers, List<MarketStatus> markets, Instant checkedAt) {
    public record MarketStatus(String market, String status, String code, int count, int rejectedCount) {}
}
