package com.fridge.config;

import com.fridge.entity.Ingredient;
import com.fridge.entity.Recipe;
import com.fridge.entity.RecipeIngredient;
import com.fridge.entity.RecipeStep;
import com.fridge.repository.IngredientRepository;
import com.fridge.repository.RecipeIngredientRepository;
import com.fridge.repository.RecipeRepository;
import com.fridge.repository.RecipeStepRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

/**
 * data.sql 로드 후 실행. 1·2·3개 재료 조합마다 최소 10개 레시피를 보장.
 * (선택 최대 5개일 때 모든 조합에서 최소 10개씩 결과가 나오도록)
 */
@Component
@Order(2)
public class RecipeSeedLoader implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(RecipeSeedLoader.class);
    private static final int RECIPES_PER_COMBO = 10;
    private static final String[] SUFFIXES = {"볶음", "찌개", "구이", "전", "밥", "무침", "조림", "볶음밥", "덮밥", "국", "탕", "스프", "샐러드", "튀김", "찜"};
    private static final int BATCH_SIZE = 200;

    private final RecipeRepository recipeRepository;
    private final RecipeIngredientRepository recipeIngredientRepository;
    private final RecipeStepRepository recipeStepRepository;
    private final IngredientRepository ingredientRepository;

    public RecipeSeedLoader(RecipeRepository recipeRepository,
                            RecipeIngredientRepository recipeIngredientRepository,
                            RecipeStepRepository recipeStepRepository,
                            IngredientRepository ingredientRepository) {
        this.recipeRepository = recipeRepository;
        this.recipeIngredientRepository = recipeIngredientRepository;
        this.recipeStepRepository = recipeStepRepository;
        this.ingredientRepository = ingredientRepository;
    }

    @Value("${app.recipe.seed.enabled:false}")
    private boolean seedEnabled;

    @Override
    public void run(ApplicationArguments args) {
        if (!seedEnabled || recipeRepository.count() > 10) return;

        List<Ingredient> all = ingredientRepository.findAllByOrderByNameAsc();
        if (all.isEmpty()) return;

        try {
            runSeed(all);
        } catch (Exception e) {
            log.warn("레시피 시드 로드 실패 (기본 10개 레시피만 사용): {}", e.getMessage());
        }
    }

    /** 배치마다 별도 트랜잭션으로 저장 (한 번에 3만 건 시 타임아웃 방지) */
    public void runSeed(List<Ingredient> all) {

        Map<String, Ingredient> byName = all.stream().collect(Collectors.toMap(Ingredient::getName, i -> i, (a, b) -> a));
        List<String> names = all.stream().map(Ingredient::getName).collect(Collectors.toList());
        int n = names.size();

        List<List<String>> combos1 = new ArrayList<>();
        for (int i = 0; i < n; i++) combos1.add(List.of(names.get(i)));
        List<List<String>> combos2 = new ArrayList<>();
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++)
                combos2.add(List.of(names.get(i), names.get(j)));
        List<List<String>> combos3 = new ArrayList<>();
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++)
                for (int k = j + 1; k < n; k++)
                    combos3.add(List.of(names.get(i), names.get(j), names.get(k)));

        List<Recipe> recipeBatch = new ArrayList<>();
        List<List<String>> ingBatch = new ArrayList<>();
        List<String> suffixBatch = new ArrayList<>();

        for (List<List<String>> combos : List.of(combos1, combos2, combos3)) {
            for (int c = 0; c < combos.size(); c++) {
                List<String> ingNames = combos.get(c);
                for (int r = 0; r < RECIPES_PER_COMBO; r++) {
                    String suffix = SUFFIXES[(c * RECIPES_PER_COMBO + r) % SUFFIXES.length];
                    String recipeName = String.join(" ", ingNames) + " " + suffix + (r > 0 ? " " + (r + 1) : "");
                    recipeBatch.add(Recipe.builder()
                            .name(recipeName)
                            .description(ingNames + "으로 만드는 " + suffix + " 요리.")
                            .mainCategory("한식")
                            .subCategory(subCategoryFor(suffix))
                            .build());
                    ingBatch.add(ingNames);
                    suffixBatch.add(suffix);
                }
            }
        }

        for (int i = 0; i < recipeBatch.size(); i += BATCH_SIZE) {
            int end = Math.min(i + BATCH_SIZE, recipeBatch.size());
            List<Recipe> batch = recipeBatch.subList(i, end);
            List<Recipe> saved = recipeRepository.saveAll(batch);
            List<RecipeIngredient> riList = new ArrayList<>();
            List<RecipeStep> rsList = new ArrayList<>();
            for (int j = 0; j < saved.size(); j++) {
                Recipe recipe = saved.get(j);
                List<String> ingNames = ingBatch.get(i + j);
                String suffix = suffixBatch.get(i + j);
                for (String name : ingNames) {
                    Ingredient ing = byName.get(name);
                    if (ing != null)
                        riList.add(RecipeIngredient.builder().recipe(recipe).ingredient(ing).build());
                }
                List<String> steps = stepsFor(ingNames, suffix);
                for (int s = 0; s < steps.size(); s++)
                    rsList.add(RecipeStep.builder().recipe(recipe).stepOrder(s + 1).stepText(steps.get(s)).build());
            }
            recipeIngredientRepository.saveAll(riList);
            recipeStepRepository.saveAll(rsList);
        }
        log.info("레시피 시드 로드 완료: {} 개", recipeBatch.size());
    }

    private String subCategoryFor(String suffix) {
        switch (suffix) {
            case "밥": case "볶음밥": case "덮밥": return "밥류";
            case "찌개": case "국": case "탕": case "스프": return "국물류";
            case "전": case "튀김": case "구이": case "무침": case "조림": case "볶음": case "찜": return "반찬";
            case "샐러드": return "샐러드";
            default: return "반찬";
        }
    }

    private List<String> stepsFor(List<String> ingNames, String suffix) {
        List<String> steps = new ArrayList<>();
        steps.add(ingNames + " 재료를 준비한다.");
        if (suffix.contains("찌개") || suffix.contains("국") || suffix.contains("탕")) {
            steps.add("냄비에 물을 올리고 재료를 넣어 끓인다.");
            steps.add("간장·소금으로 간을 맞춘다.");
        } else if (suffix.contains("볶음") || suffix.contains("밥")) {
            steps.add("팬에 기름을 두르고 재료를 넣어 볶는다.");
            steps.add("불을 끄고 참기름을 넣어 비빈다.");
        } else if (suffix.contains("전") || suffix.contains("튀김")) {
            steps.add("재료를 썰어 달걀물·부침가루를 묻힌다.");
            steps.add("팬에 기름을 두르고 앞뒤로 굽는다.");
        } else if (suffix.contains("구이") || suffix.contains("찜")) {
            steps.add("재료에 양념을 발라 10분 재운다.");
            steps.add("그릴이나 찜기에 익힌다.");
        } else {
            steps.add("재료를 넣어 익힌다.");
            steps.add("완성한다.");
        }
        return steps;
    }
}
