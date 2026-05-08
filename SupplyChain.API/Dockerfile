FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY SupplyChain.API/SupplyChain.API.csproj SupplyChain.API/
RUN dotnet restore SupplyChain.API/SupplyChain.API.csproj

COPY SupplyChain.API/ SupplyChain.API/
RUN dotnet publish SupplyChain.API/SupplyChain.API.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

CMD dotnet SupplyChain.API.dll --urls "http://0.0.0.0:${PORT:-8080}"
