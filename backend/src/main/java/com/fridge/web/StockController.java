package com.fridge.web;

import com.fridge.dto.StockAiAnalysisDto;
import com.fridge.dto.StockAiAnalysisRequest;
import com.fridge.dto.StockMarketStatusDto;
import com.fridge.dto.StockNewsDto;
import com.fridge.dto.StockProviderStatusDto;
import com.fridge.dto.StockQuoteDto;
import com.fridge.service.StockAiAnalysisService;
import com.fridge.service.StockMarketService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
public class StockController {

    private final StockMarketService stockMarketService;
    private final StockAiAnalysisService stockAiAnalysisService;

    @GetMapping(value = "/quotes", produces = "application/json;charset=UTF-8")
    public ResponseEntity<List<StockQuoteDto>> quotes(@RequestParam String symbols) {
        List<String> parsed = Arrays.stream(symbols.split(",")).toList();
        return ResponseEntity.ok(stockMarketService.getQuotes(parsed));
    }

    @GetMapping(value = "/market-status", produces = "application/json;charset=UTF-8")
    public ResponseEntity<StockMarketStatusDto> marketStatus(@RequestParam(defaultValue = "08") String baseTime) {
        return ResponseEntity.ok(stockMarketService.getMarketStatus(baseTime));
    }

    @GetMapping(value = "/news", produces = "application/json;charset=UTF-8")
    public ResponseEntity<List<StockNewsDto>> news(@RequestParam String symbols) {
        List<String> parsed = Arrays.stream(symbols.split(",")).toList();
        return ResponseEntity.ok(stockMarketService.getNews(parsed));
    }

    @GetMapping(value = "/provider-status", produces = "application/json;charset=UTF-8")
    public ResponseEntity<StockProviderStatusDto> providerStatus() {
        return ResponseEntity.ok(stockMarketService.getProviderStatus());
    }

    @PostMapping(value = "/ai-analysis", produces = "application/json;charset=UTF-8")
    public ResponseEntity<StockAiAnalysisDto> aiAnalysis(@RequestBody StockAiAnalysisRequest request) {
        return ResponseEntity.ok(stockAiAnalysisService.analyze(request));
    }
}
