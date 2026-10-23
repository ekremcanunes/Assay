using market_service.Caching;

namespace market_service.Middleware;

// Cevaba, içindeki verinin en erken bitecek cache kaydının kalan ömrünü yazar.
// Frontend (React Query) staleTime'ı buradan alır; böylece Redis süresi dolmadan boşa istek atılmaz.
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
