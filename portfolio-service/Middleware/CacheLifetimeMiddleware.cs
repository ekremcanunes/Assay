using portfolio_service.Services;

namespace portfolio_service.Middleware;

// market-service'ten gelen kalan cache ömrünü tarayıcıya iletir. Portföy gibi birden çok fiyat
// içeren cevaplarda en erken biten kayıt esas alınır. Frontend staleTime'ı bu header'dan okur.
public class CacheLifetimeMiddleware(RequestDelegate next)
{
    public const string HeaderName = "X-Cache-Expires-In";

    public async Task InvokeAsync(HttpContext context, CacheLifetime lifetime)
    {
        context.Response.OnStarting(() =>
        {
            if (lifetime.SecondsLeft() is int seconds)
                context.Response.Headers[HeaderName] = seconds.ToString();
            return Task.CompletedTask;
        });
        await next(context);
    }
}
