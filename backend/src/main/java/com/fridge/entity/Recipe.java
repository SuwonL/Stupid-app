package com.fridge.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "recipes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Recipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(length = 2000)
    private String description;

    private String imageUrl;

    /** 주메뉴 분류: 한식, 일식, 중식, 양식 등 */
    private String mainCategory;
    /** 부메뉴 분류: 밥류, 국물류, 반찬, 면류 등 */
    private String subCategory;
}
