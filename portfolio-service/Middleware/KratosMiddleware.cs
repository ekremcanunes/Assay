using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using portfolio_service.Services;

namespace portfolio_service.Middleware;

public class KratosMiddleware(RequestDelegate next, IHttpClientFactory httpClientFactory, IConfiguration configuration,
    IOptions<AuthOptions> authOptions)
{
    public async Task InvokeAsync(HttpContext context)
    {
        // /internal/*: Kratos'un sunucudan sunucuya çağrıları (SMS relay). Kullanıcı oturumu yok; API anahtarıyla korunur.
        // /api/auth/options: 2FA adımından önce (AAL1) çağrılır; aşağıdaki AAL kontrolü bu noktada reddeder. Hassas veri dönmez.
        if (context.Request.Path.StartsWithSegments("/internal")
            || context.Request.Path.StartsWithSegments("/api/auth/options"))
        {
            await next(context);
            return;
        }

        var kratosUrl = configuration["Kratos:BaseUrl"] ?? "http://kratos:4433";
        var client = httpClientFactory.CreateClient("Kratos");

        var request = new HttpRequestMessage(HttpMethod.Get, $"{kratosUrl}/sessions/whoami");

        var cookieHeader = context.Request.Headers["Cookie"].ToString();
        if (!string.IsNullOrEmpty(cookieHeader))
            request.Headers.Add("Cookie", cookieHeader);

        var sessionToken = context.Request.Headers["X-Session-Token"].ToString();
        if (!string.IsNullOrEmpty(sessionToken))
            request.Headers.Add("X-Session-Token", sessionToken);

        try
        {
            var response = await client.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                context.Response.StatusCode = 401;
                await context.Response.WriteAsync("Unauthorized");
                return;
            }

            var session = await response.Content.ReadFromJsonAsync<KratosSession>();
            if (session?.Identity?.Id is null)
            {
                context.Response.StatusCode = 401;
                await context.Response.WriteAsync("Unauthorized");
                return;
            }

            // 2FA zorunluluğu burada uygulanır: Kratos v1.2 e-posta kodunu "2FA yapabilen" kimlik bilgisi saymadığı için
            // highest_available AAL1 oturumu whoami'de reddetmez. Frontend 403 aal2_required alınca kod adımına gider.
            if (authOptions.Value.MfaRequired && session.Aal != "aal2")
            {
                context.Response.StatusCode = 403;
                await context.Response.WriteAsJsonAsync(new { error = "aal2_required" });
                return;
            }

            context.Items["UserId"] = session.Identity.Id;
        }
        catch
        {
            context.Response.StatusCode = 503;
            await context.Response.WriteAsync("Auth service unavailable");
            return;
        }

        await next(context);
    }
}

public record KratosSession(
    [property: JsonPropertyName("identity")] KratosIdentity? Identity,
    [property: JsonPropertyName("authenticator_assurance_level")] string? Aal);
public record KratosIdentity([property: JsonPropertyName("id")] string Id);
