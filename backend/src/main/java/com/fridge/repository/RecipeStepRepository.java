package com.fridge.repository;

import com.fridge.entity.RecipeStep;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecipeStepRepository extends JpaRepository<RecipeStep, Long> {

    List<RecipeStep> findAllByRecipeIdOrderByStepOrderAsc(Long recipeId);
}
