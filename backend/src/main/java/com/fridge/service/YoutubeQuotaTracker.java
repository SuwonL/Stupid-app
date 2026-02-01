package com.fridge.service;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * YouTube API 일일 사용량 추정 (검색 호출 시 100 단위 가정).
 * Google은 잔여 할당량 API를 제공하지 않으므로 서버에서 호출 횟수만 추정.
 */
@Service
public class YoutubeQuotaTracker {

    private static final int LIMIT = 10_000;
    private static final int SEARCH_COST = 100;

    private final AtomicReference<LocalDate> lastDate = new AtomicReference<>(null);
    private final AtomicInteger usedToday = new AtomicInteger(0);

    /** 검색 1회 호출 시 사용 (100 단위). */
    public void addSearchUsage() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        lastDate.updateAndGet(d -> {
            if (d == null || !d.equals(today)) {
                usedToday.set(0);
                return today;
            }
            return d;
        });
        usedToday.addAndGet(SEARCH_COST);
    }

    public int getUsedToday() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        lastDate.updateAndGet(d -> {
            if (d == null || !d.equals(today)) {
                usedToday.set(0);
                return today;
            }
            return d;
        });
        return usedToday.get();
    }

    public int getLimit() {
        return LIMIT;
    }
}
