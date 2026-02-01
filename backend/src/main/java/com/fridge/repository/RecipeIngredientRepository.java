package com.fridge.repository;

import com.fridge.entity.RecipeIngredient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecipeIngredientRepository extends JpaRepository<RecipeIngredient, Long> {

    List<RecipeIngredient> findAllByRecipeId(Long recipeId);

    /** N+1 방지: 여러 레시피의 재료를 한 번에 조회 */
    List<RecipeIngredient> findAllByRecipeIdIn(java.util.Collection<Long> recipeIds);
}
