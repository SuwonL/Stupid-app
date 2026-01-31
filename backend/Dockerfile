# 1단계: 빌드
FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /app

COPY pom.xml ./
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn -DskipTests package -B

# 2단계: 실행
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

COPY --from=build /app/target/fridge-menu-api-*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
