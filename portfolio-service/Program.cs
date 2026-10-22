using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using portfolio_service.Data;
using portfolio_service.Middleware;
using portfolio_service.Services;
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

builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<CacheLifetime>();

builder.Services.AddHttpClient<IMarketServiceClient, MarketServiceClient>(client =>
{
    client.BaseAddress = new Uri(builder.Configuration["ServiceUrls:MarketService"] ?? "http://localhost:5002");
});

builder.Services.AddHttpClient("Kratos");

builder.Services.AddScoped<IAssetService, AssetService>();
builder.Services.AddScoped<ITransactionService, TransactionService>();
builder.Services.Configure<AuthOptions>(builder.Configuration.GetSection("Auth"));

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy
            .WithOrigins("http://localhost", "http://localhost:80")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
});

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddOpenApi();
}

builder.WebHost.UseUrls(builder.Configuration["ASPNETCORE_URLS"] ?? "http://0.0.0.0:5001");

var app = builder.Build();

// 2FA yapılandırma kontrolü: hatalı ayar loglanır, servis yine açılır.
var authOptions = app.Services.GetRequiredService<IOptions<AuthOptions>>().Value;
if (authOptions.IsMisconfigured())
    app.Logger.LogError("{Message}", AuthOptions.MisconfiguredMessage);

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseSerilogRequestLogging();
app.UseCors();
app.UseMiddleware<KratosMiddleware>();
app.UseMiddleware<CacheLifetimeMiddleware>();
app.MapControllers();

app.Run();
