package com.fridge.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.cors.allowed-origins:}")
    private String allowedOriginsConfig;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        List<String> origins = Stream.concat(
                Stream.of("http://localhost:5173", "http://localhost:5174", "http://localhost:3000"),
                Arrays.stream(allowedOriginsConfig.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
        ).distinct().collect(Collectors.toList());
        // 패턴 사용: Vercel 배포 URL이 *.vercel.app 이면 모두 허용 (프리뷰/프로덕션 구분 없이)
        String[] patterns = Stream.concat(
                Stream.of("https://*.vercel.app", "http://localhost:*"),
                origins.stream()
        ).distinct().toArray(String[]::new);
        registry.addMapping("/api/**")
                .allowedOriginPatterns(patterns)
                .allowedMethods("GET", "POST", "OPTIONS")
                .allowedHeaders("*");
    }

    @Override
    public void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
        converters.stream()
                .filter(MappingJackson2HttpMessageConverter.class::isInstance)
                .map(MappingJackson2HttpMessageConverter.class::cast)
                .forEach(converter -> converter.setDefaultCharset(StandardCharsets.UTF_8));
    }
}
