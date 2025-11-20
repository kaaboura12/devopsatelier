# Use OpenJDK 17 Alpine image
FROM openjdk:17-alpine

# Set working directory
WORKDIR /app

# Copy the packaged jar into the container
COPY target/*.jar app.jar

# Expose the port your app runs on (adjust if needed)
EXPOSE 8080

# Define the entrypoint
ENTRYPOINT ["java", "-jar", "app.jar"]
