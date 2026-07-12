package com.fridge.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fridge.dto.StockAiAnalysisDto;
import com.fridge.dto.StockAiAnalysisRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class StockAiAnalysisService {

    private static final String OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
    private static final String SOURCE = "OpenAI Responses API";

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.openai.api-key:}")
    private String apiKey;

    @Value("${app.openai.model:gpt-5.2}")
    private String model;

    public StockAiAnalysisDto analyze(StockAiAnalysisRequest request) {
        if (!hasText(apiKey)) {
            return StockAiAnalysisDto.builder()
                    .enabled(false)
                    .model(model)
                    .source(SOURCE)
                    .error("OpenAI API 키가 설정되지 않았습니다. APP_OPENAI_API_KEY 또는 app.openai.api-key를 설정해 주세요.")
                    .build();
        }

        try {
            JsonNode parsed = callOpenAi(request);
            return StockAiAnalysisDto.builder()
                    .enabled(true)
                    .model(model)
                    .source(SOURCE)
                    .action(text(parsed, "action", "관망"))
                    .summary(text(parsed, "summary", "AI 분석 결과를 해석할 수 없습니다."))
                    .buyChecklist(textList(parsed.path("buyChecklist")))
                    .riskChecklist(textList(parsed.path("riskChecklist")))
                    .invalidationPoint(text(parsed, "invalidationPoint", request.getStopLossRange()))
                    .positionSizing(text(parsed, "positionSizing", "고위험 구간은 비중을 낮춰 접근하세요."))
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

    private JsonNode callOpenAi(StockAiAnalysisRequest request) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
                "model", model,
                "instructions", """
                        너는 한국어로 답하는 주식 리스크 분석 보조자다.
                        제공된 공식 시세, 공식 뉴스, 추천 점수, 매수/익절/손절 기준만 사용한다.
                        새 가격이나 확인되지 않은 뉴스를 지어내지 않는다.
                        사용자가 실제 매수 판단에 참고할 수 있게 짧고 단호하게 답하되, 수익 보장을 암시하지 않는다.
                        action은 매수 가능, 분할 매수, 관망, 제외 중 하나만 쓴다.
                        """,
                "input", buildInput(request),
                "text", Map.of(
                        "format", Map.of(
                                "type", "json_schema",
                                "name", "stock_ai_analysis",
                                "strict", true,
                                "schema", Map.of(
                                        "type", "object",
                                        "additionalProperties", false,
                                        "properties", Map.of(
                                                "action", Map.of("type", "string"),
                                                "summary", Map.of("type", "string"),
                                                "buyChecklist", Map.of("type", "array", "items", Map.of("type", "string")),
                                                "riskChecklist", Map.of("type", "array", "items", Map.of("type", "string")),
                                                "invalidationPoint", Map.of("type", "string"),
                                                "positionSizing", Map.of("type", "string")
                                        ),
                                        "required", List.of("action", "summary", "buyChecklist", "riskChecklist", "invalidationPoint", "positionSizing")
                                )
                        )
                )
        );

        ResponseEntity<JsonNode> response = restTemplate.exchange(
                URI.create(OPENAI_RESPONSES_URL),
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                JsonNode.class
        );

        String outputText = response.getBody() == null ? "" : response.getBody().path("output_text").asText("");
        if (!outputText.isBlank()) return objectMapper.readTree(outputText);

        JsonNode output = response.getBody() == null ? null : response.getBody().path("output");
        String fallbackText = findOutputText(output);
        if (fallbackText.isBlank()) throw new IllegalStateException("OpenAI 응답에 텍스트가 없습니다.");
        return objectMapper.readTree(fallbackText);
    }

    private String buildInput(StockAiAnalysisRequest request) throws Exception {
        return "아래 추천 후보를 실제 매수 전 점검 관점으로 분석해줘. JSON 스키마만 반환해.\n"
                + objectMapper.writeValueAsString(request);
    }

    private String findOutputText(JsonNode node) {
        if (node == null || node.isMissingNode()) return "";
        if (node.isArray()) {
            for (JsonNode item : node) {
                String found = findOutputText(item);
                if (!found.isBlank()) return found;
            }
            return "";
        }
        if ("output_text".equals(node.path("type").asText()) && node.has("text")) {
            return node.path("text").asText("");
        }
        return findOutputText(node.path("content"));
    }

    private String text(JsonNode node, String field, String fallback) {
        String value = node.path(field).asText("");
        return value.isBlank() ? fallback : value;
    }

    private List<String> textList(JsonNode node) {
        if (node == null || !node.isArray()) return List.of();
        return java.util.stream.StreamSupport.stream(node.spliterator(), false)
                .map(JsonNode::asText)
                .filter(value -> value != null && !value.isBlank())
                .limit(5)
                .toList();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
