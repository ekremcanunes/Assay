using market_service.Middleware;
using market_service.Services;
using Serilog;
using Serilog.Formatting.Compact;

var builder = WebApplication.CreateBuilder(args);

// Log seviyeleri appsettings/env var'dan okunur (bkz. docs/10-standards/LOGGING.md).
// Container'da JSON, lokal geliştirmede okunabilir metin.
builder.Services.AddSerilog((services, cfg) =>
{
    cfg.ReadFrom.Configuration(builder.Configuration)
       .ReadFrom.Services(services)
       .Enrich.FromLogContext();

    if (builder.Environment.IsDevelopment())
        cfg.WriteTo.Console();
    else
        cfg.WriteTo.Console(new CompactJsonFormatter());
});

builder.WebHost.UseUrls(builder.Configuration["ASPNETCORE_URLS"] ?? "http://0.0.0.0:5002");

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy
            .WithOrigins("http://localhost", "http://localhost:80")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
});

builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = Environment.GetEnvironmentVariable("REDIS_CONNECTION")
        ?? builder.Configuration.GetConnectionString("Redis");
});

builder.Services.AddHttpClient<IFrankfurterClient, FrankfurterClient>();
builder.Services.AddHttpClient<ITwelveDataClient, TwelveDataClient>();
builder.Services.AddHttpClient<IYahooFinanceClient, YahooFinanceClient>();
builder.Services.AddHttpClient("Kratos");

builder.Services.AddScoped<IBistCatalog, BistCatalog>();
builder.Services.AddScoped<IMarketService, MarketService>();
builder.Services.AddScoped<ISymbolSearchService, SymbolSearchService>();
builder.Services.AddScoped<IMarketOverviewService, MarketOverviewService>();
builder.Services.AddScoped<IPriceHistoryService, PriceHistoryService>();
builder.Services.AddScoped<IPriceOnDateService, PriceOnDateService>();

builder.Services.AddControllers();

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();
}

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseSerilogRequestLogging();
app.UseCors();
app.UseMiddleware<KratosMiddleware>();
app.MapControllers();

app.Run();
