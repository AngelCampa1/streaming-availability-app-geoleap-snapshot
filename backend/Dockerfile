# Multi-stage production Dockerfile for GeoLeap.Api
# Optimized for security, performance, and minimal image size

# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy project files and restore dependencies (leverages Docker cache)
COPY ["GeoLeap.Api/GeoLeap.Api.csproj", "GeoLeap.Api/"]
COPY ["GeoLeap.Api.Tests/GeoLeap.Api.Tests.csproj", "GeoLeap.Api.Tests/"]
RUN dotnet restore "GeoLeap.Api/GeoLeap.Api.csproj"

# Copy all source files
COPY . .

# Build the application in Release mode
WORKDIR "/src/GeoLeap.Api"
RUN dotnet build "GeoLeap.Api.csproj" -c Release -o /app/build

# Stage 2: Publish
FROM build AS publish
RUN dotnet publish "GeoLeap.Api.csproj" \
    -c Release \
    -o /app/publish \
    /p:UseAppHost=false \
    --no-restore

# Stage 3: Final runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# Install curl for health checks
RUN apt-get update && \
    apt-get install -y curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r appuser && \
    useradd -r -g appuser appuser && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port 8020 (GeoLeap backend port)
EXPOSE 8020

# Health check configuration (uses PORT env var on Railway, defaults to 8020)
HEALTHCHECK --interval=5m \
            --timeout=10s \
            --start-period=60s \
            --retries=3 \
  CMD curl -f http://localhost:${PORT:-8020}/health/live || exit 1

# Copy published application from publish stage
COPY --from=publish --chown=appuser:appuser /app/publish .

# Set entry point
ENTRYPOINT ["dotnet", "GeoLeap.Api.dll"]
