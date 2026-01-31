CREATE TABLE IF NOT EXISTS ingredients (
    id   BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS recipes (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    description   VARCHAR(2000),
    image_url     VARCHAR(500),
    main_category VARCHAR(50),
    sub_category  VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipe_id    BIGINT NOT NULL,
    ingredient_id BIGINT NOT NULL,
    amount       VARCHAR(100),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id),
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);

CREATE TABLE IF NOT EXISTS recipe_steps (
    id        BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipe_id BIGINT NOT NULL,
    step_order INT NOT NULL,
    step_text VARCHAR(500) NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);
