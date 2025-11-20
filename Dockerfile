# Use OpenJDK 17 slim (Debian Bullseye)
FROM openjdk:17.0.2-jdk-slim-bullseye

WORKDIR /app

COPY target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
