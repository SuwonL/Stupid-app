-- Ingredients: 분류 3가지 (고기·계란·통조림 / 야채·채소 / 양념·밥·면)
-- 고기·계란·통조림
INSERT INTO ingredients (name, category) VALUES ('돼지고기', '고기·계란·통조림');
INSERT INTO ingredients (name, category) VALUES ('소고기', '고기·계란·통조림');
INSERT INTO ingredients (name, category) VALUES ('닭고기', '고기·계란·통조림');
INSERT INTO ingredients (name, category) VALUES ('베이컨', '고기·계란·통조림');
INSERT INTO ingredients (name, category) VALUES ('달걀', '고기·계란·통조림');
INSERT INTO ingredients (name, category) VALUES ('참치캔', '고기·계란·통조림');
INSERT INTO ingredients (name, category) VALUES ('스팸', '고기·계란·통조림');
INSERT INTO ingredients (name, category) VALUES ('두부', '고기·계란·통조림');
-- 야채·채소
INSERT INTO ingredients (name, category) VALUES ('양파', '야채·채소');
INSERT INTO ingredients (name, category) VALUES ('감자', '야채·채소');
INSERT INTO ingredients (name, category) VALUES ('당근', '야채·채소');
INSERT INTO ingredients (name, category) VALUES ('대파', '야채·채소');
INSERT INTO ingredients (name, category) VALUES ('마늘', '야채·채소');
INSERT INTO ingredients (name, category) VALUES ('깻잎', '야채·채소');
INSERT INTO ingredients (name, category) VALUES ('애호박', '야채·채소');
INSERT INTO ingredients (name, category) VALUES ('버섯', '야채·채소');
INSERT INTO ingredients (name, category) VALUES ('콩나물', '야채·채소');
INSERT INTO ingredients (name, category) VALUES ('시금치', '야채·채소');
INSERT INTO ingredients (name, category) VALUES ('김치', '야채·채소');
-- 양념·밥·면
INSERT INTO ingredients (name, category) VALUES ('고추장', '양념·밥·면');
INSERT INTO ingredients (name, category) VALUES ('간장', '양념·밥·면');
INSERT INTO ingredients (name, category) VALUES ('고춧가루', '양념·밥·면');
INSERT INTO ingredients (name, category) VALUES ('된장', '양념·밥·면');
INSERT INTO ingredients (name, category) VALUES ('참기름', '양념·밥·면');
INSERT INTO ingredients (name, category) VALUES ('라면', '양념·밥·면');
INSERT INTO ingredients (name, category) VALUES ('밥', '양념·밥·면');
INSERT INTO ingredients (name, category) VALUES ('소시지', '고기·계란·통조림');
INSERT INTO ingredients (name, category) VALUES ('햄', '고기·계란·통조림');
INSERT INTO ingredients (name, category) VALUES ('치즈', '고기·계란·통조림');
INSERT INTO ingredients (name, category) VALUES ('새우', '고기·계란·통조림');
INSERT INTO ingredients (name, category) VALUES ('토마토', '야채·채소');
INSERT INTO ingredients (name, category) VALUES ('고추', '야채·채소');
INSERT INTO ingredients (name, category) VALUES ('배추', '야채·채소');
INSERT INTO ingredients (name, category) VALUES ('무', '야채·채소');
INSERT INTO ingredients (name, category) VALUES ('설탕', '양념·밥·면');
INSERT INTO ingredients (name, category) VALUES ('식용유', '양념·밥·면');

-- Recipes (주메뉴/부메뉴 분류 포함)
INSERT INTO recipes (name, description, main_category, sub_category) VALUES ('계란말이', '부드러운 계란말이.', '한식', '반찬');
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 1, id FROM ingredients WHERE name = '달걀';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 1, id FROM ingredients WHERE name = '대파';
INSERT INTO recipe_steps (recipe_id, step_order, step_text) VALUES (1, 1, '달걀을 풀고 소금, 대파를 넣어 섞는다.');
INSERT INTO recipe_steps (recipe_id, step_order, step_text) VALUES (1, 2, '팬에 기름을 두르고 달걀물을 부어 말아 굽는다.');

INSERT INTO recipes (name, description, main_category, sub_category) VALUES ('감자조림', '달콤짭짤한 감자조림.', '한식', '반찬');
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 2, id FROM ingredients WHERE name = '감자';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 2, id FROM ingredients WHERE name = '간장';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 2, id FROM ingredients WHERE name = '참기름';
INSERT INTO recipe_steps (recipe_id, step_order, step_text) VALUES (2, 1, '감자를 큼직하게 썬다.');
INSERT INTO recipe_steps (recipe_id, step_order, step_text) VALUES (2, 2, '간장, 물, 올리고당으로 조린다.');

INSERT INTO recipes (name, description, main_category, sub_category) VALUES ('김치볶음밥', '김치와 밥을 볶고 달걀 프라이를 올리면 완성.', '한식', '밥류');
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 3, id FROM ingredients WHERE name = '밥';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 3, id FROM ingredients WHERE name = '김치';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 3, id FROM ingredients WHERE name = '달걀';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 3, id FROM ingredients WHERE name = '대파';

INSERT INTO recipes (name, description, main_category, sub_category) VALUES ('두부김치', '구운 두부에 김치를 올려 먹는 간단 요리.', '한식', '반찬');
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 4, id FROM ingredients WHERE name = '두부';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 4, id FROM ingredients WHERE name = '김치';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 4, id FROM ingredients WHERE name = '대파';

INSERT INTO recipes (name, description, main_category, sub_category) VALUES ('스팸계란밥', '스팸과 계란을 밥에 올려 드세요.', '한식', '밥류');
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 5, id FROM ingredients WHERE name = '밥';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 5, id FROM ingredients WHERE name = '스팸';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 5, id FROM ingredients WHERE name = '달걀';

INSERT INTO recipes (name, description, main_category, sub_category) VALUES ('양파달걀볶음', '양파를 썰어 달걀과 함께 볶고 간장으로 간하세요.', '한식', '반찬');
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 6, id FROM ingredients WHERE name = '양파';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 6, id FROM ingredients WHERE name = '달걀';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 6, id FROM ingredients WHERE name = '간장';

INSERT INTO recipes (name, description, main_category, sub_category) VALUES ('김치찌개', '익은 김치와 두부, 돼지고기로 끓이는 찌개.', '한식', '국물류');
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 7, id FROM ingredients WHERE name = '김치';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 7, id FROM ingredients WHERE name = '두부';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 7, id FROM ingredients WHERE name = '대파';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 7, id FROM ingredients WHERE name = '돼지고기';

INSERT INTO recipes (name, description, main_category, sub_category) VALUES ('참치덮밥', '참치캔과 달걀을 밥에 올려 간장으로 비벼 드세요.', '한식', '밥류');
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 8, id FROM ingredients WHERE name = '밥';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 8, id FROM ingredients WHERE name = '참치캔';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 8, id FROM ingredients WHERE name = '달걀';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 8, id FROM ingredients WHERE name = '간장';

INSERT INTO recipes (name, description, main_category, sub_category) VALUES ('감자전', '감자와 양파를 채 썰어 달걀에 버무려 부쳐요.', '한식', '반찬');
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 9, id FROM ingredients WHERE name = '감자';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 9, id FROM ingredients WHERE name = '양파';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 9, id FROM ingredients WHERE name = '달걀';

INSERT INTO recipes (name, description, main_category, sub_category) VALUES ('된장찌개', '된장으로 야채와 두부를 넣어 끓이는 찌개.', '한식', '국물류');
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 10, id FROM ingredients WHERE name = '된장';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 10, id FROM ingredients WHERE name = '두부';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 10, id FROM ingredients WHERE name = '감자';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 10, id FROM ingredients WHERE name = '대파';
INSERT INTO recipe_ingredients (recipe_id, ingredient_id) SELECT 10, id FROM ingredients WHERE name = '양파';
