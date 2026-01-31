package com.fridge.config;

import com.fridge.repository.IngredientRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.EncodedResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;

/**
 * data.sql을 UTF-8로 읽어 실행. (기본 로더는 JVM 인코딩을 쓰므로 Windows에서 한글이 깨질 수 있음)
 * 수정 시 data.sql만 고치면 됨 → DB 쓰는 것처럼 쉽고 빠름.
 */
@Component
@Order(1)
public class SqlDataLoader implements ApplicationRunner {

    private final DataSource dataSource;
    private final IngredientRepository ingredientRepository;

    public SqlDataLoader(DataSource dataSource, IngredientRepository ingredientRepository) {
        this.dataSource = dataSource;
        this.ingredientRepository = ingredientRepository;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (ingredientRepository.count() > 0) return;
        try (Connection conn = dataSource.getConnection()) {
            EncodedResource resource = new EncodedResource(
                    new ClassPathResource("data.sql"),
                    StandardCharsets.UTF_8
            );
            ScriptUtils.executeSqlScript(conn, resource);
        }
    }
}
