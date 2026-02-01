package com.fridge.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * 외부 API(YouTube, Spoonacular, 자막 등) 호출용 RestTemplate.
 * 연결/읽기 타임아웃으로 무한 대기 방지.
 */
@Configuration
public class RestTemplateConfig {

    private static final int CONNECT_TIMEOUT_SEC = 8;
    private static final int READ_TIMEOUT_SEC = 18;

    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
                .setConnectTimeout(Duration.ofSeconds(CONNECT_TIMEOUT_SEC))
                .setReadTimeout(Duration.ofSeconds(READ_TIMEOUT_SEC))
                .build();
    }
}
