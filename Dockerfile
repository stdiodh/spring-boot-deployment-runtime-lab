FROM eclipse-temurin:21-jre

WORKDIR /app

ARG APP_VERSION=local
LABEL org.opencontainers.image.revision="${APP_VERSION}"

COPY build/libs/app.jar /app/app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
