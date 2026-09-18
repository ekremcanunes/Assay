# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
# Bağımlılık katmanı: yalnızca .csproj değişince yeniden çalışır
COPY portfolio-service.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /publish --no-restore

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /publish .
CMD ["dotnet", "portfolio-service.dll"]
