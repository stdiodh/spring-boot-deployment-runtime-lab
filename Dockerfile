FROM eclipse-temurin:21-jre

WORKDIR /app

# TODO 1. bootJar 결과물이 있는 경로를 ARG로 선언하세요.
# 힌트: 이번 실습에서는 build/libs 아래 jar 하나를 복사하는 흐름이면 충분합니다.

# TODO 2. 위 ARG를 이용해 컨테이너 안으로 jar를 복사하세요.
# 힌트: 컨테이너 안 이름은 app.jar 정도로 단순하게 맞춰두면 이후 명령이 읽기 쉽습니다.

EXPOSE 8080

# TODO 3. 컨테이너 기본 실행 명령을 작성하세요.
# 힌트: java -jar /app/app.jar 형태를 먼저 떠올리면 됩니다.
