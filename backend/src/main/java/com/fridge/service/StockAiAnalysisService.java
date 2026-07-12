package com.fridge.service;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.StructuredMessageCreateParams;
import com.anthropic.models.messages.ThinkingConfigAdaptive;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fridge.dto.StockAiAnalysisDto;
import com.fridge.dto.StockAiAnalysisRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class StockAiAnalysisService {

    private static final String SOURCE = "Anthropic Claude Messages API";

    private final ObjectMapper objectMapper;

    @Value("${app.anthropic.api-key:}")
    private String apiKey;

    @Value("${app.anthropic.model:claude-sonnet-5}")
    private String model;

    private volatile AnthropicClient client;

    public record AiAnalysisResult(
            @JsonPropertyDescription("매수 가능, 분할 매수, 관망, 제외 중 하나")
            String action,
            @JsonPropertyDescription("실제 매수 판단에 참고할 수 있는 짧고 단호한 요약")
            String summary,
            List<String> buyChecklist,
            List<String> riskChecklist,
            String invalidationPoint,
            String positionSizing
    ) {
    }

    public StockAiAnalysisDto analyze(StockAiAnalysisRequest request) {
        if (!hasText(apiKey)) {
            return StockAiAnalysisDto.builder()
                    .enabled(false)
                    .model(model)
                    .source(SOURCE)
                    .error("Anthropic API 키가 설정되지 않았습니다. APP_ANTHROPIC_API_KEY 또는 app.anthropic.api-key를 설정해 주세요.")
                    .build();
        }

        try {
            AiAnalysisResult result = callClaude(request);
            return StockAiAnalysisDto.builder()
                    .enabled(true)
                    .model(model)
                    .source(SOURCE)
                    .action(orDefault(result.action(), "관망"))
                    .summary(orDefault(result.summary(), "AI 분석 결과를 해석할 수 없습니다."))
                    .buyChecklist(result.buyChecklist())
                    .riskChecklist(result.riskChecklist())
                    .invalidationPoint(orDefault(result.invalidationPoint(), request.getStopLossRange()))
                    .positionSizing(orDefault(result.positionSizing(), "고위험 구간은 비중을 낮춰 접근하세요."))
                    .build();
        } catch (Exception e) {
            return StockAiAnalysisDto.builder()
                    .enabled(false)
                    .model(model)
                    .source(SOURCE)
                    .error("AI 매수 판단 생성 실패: " + e.getMessage())
                    .build();
        }
    }

    private AiAnalysisResult callClaude(StockAiAnalysisRequest request) throws Exception {
        StructuredMessageCreateParams<AiAnalysisResult> params = MessageCreateParams.builder()
                .model(model)
                .maxTokens(8192L)
                .thinking(ThinkingConfigAdaptive.builder().build())
                .outputConfig(AiAnalysisResult.class)
                .system("""
                        너는 한국어로 답하는 주식 리스크 분석 보조자다.
                        제공된 공식 시세, 공식 뉴스, 추천 점수, 매수/익절/손절 기준만 사용한다.
                        새 가격이나 확인되지 않은 뉴스를 지어내지 않는다.
                        사용자가 실제 매수 판단에 참고할 수 있게 짧고 단호하게 답하되, 수익 보장을 암시하지 않는다.
                        """)
                .addUserMessage("아래 추천 후보를 실제 매수 전 점검 관점으로 분석해줘.\n"
                        + objectMapper.writeValueAsString(request))
                .build();

        Optional<AiAnalysisResult> result = client().messages().create(params).content().stream()
                .flatMap(block -> block.text().stream())
                .map(structuredText -> structuredText.text())
                .findFirst();

        return result.orElseThrow(() -> new IllegalStateException("Claude 응답에 결과가 없습니다."));
    }

    private AnthropicClient client() {
        AnthropicClient current = client;
        if (current == null) {
            synchronized (this) {
                current = client;
                if (current == null) {
                    current = AnthropicOkHttpClient.builder().apiKey(apiKey).build();
                    client = current;
                }
            }
        }
        return current;
    }

    private String orDefault(String value, String fallback) {
        return hasText(value) ? value : fallback;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
