package com.fridge.repository;

import com.fridge.entity.Recipe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RecipeRepository extends JpaRepository<Recipe, Long> {

    @Query("""
        SELECT r FROM Recipe r
        WHERE NOT EXISTS (
            SELECT ri FROM RecipeIngredient ri
            WHERE ri.recipe = r AND ri.ingredient.id NOT IN :ingredientIds
        )
        AND EXISTS (SELECT ri2 FROM RecipeIngredient ri2 WHERE ri2.recipe = r)
        ORDER BY r.name
        """)
    List<Recipe> findRecipesByAvailableIngredients(@Param("ingredientIds") List<Long> ingredientIds);

    /** 선택한 재료 중 하나라도 쓰는 레시피 (추천 결과가 없을 때 보조용) */
    @Query("SELECT DISTINCT r FROM Recipe r JOIN RecipeIngredient ri ON ri.recipe = r WHERE ri.ingredient.id IN :ingredientIds ORDER BY r.name")
    List<Recipe> findRecipesUsingAnyIngredient(@Param("ingredientIds") List<Long> ingredientIds);
}
