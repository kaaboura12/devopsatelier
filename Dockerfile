# Use OpenJDK 17 slim image
FROM openjdk:17-slim

# Set working directory
WORKDIR /app

# Copy the packaged jar into the container
COPY target/*.jar app.jar

# Expose the port your app runs on
EXPOSE 8080

# Define the entrypoint
ENTRYPOINT ["java", "-jar", "app.jar"]
