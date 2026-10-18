using System.Text.Json.Serialization;

namespace market_service.Middleware;

public class KratosMiddleware(RequestDelegate next, IHttpClientFactory httpClientFactory, IConfiguration configuration)
{
    public async Task InvokeAsync(HttpContext context)
    {
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

            // 2FA zorunluluğu: portfolio-service ile aynı kural (compose iki servise aynı AUTH_REQUIRED_AAL değerini verir).
            var mfaRequired = (configuration["Auth:RequiredAal"] ?? "highest_available") != "aal1";
            if (mfaRequired && session.Aal != "aal2")
            {
                context.Response.StatusCode = 403;
                await context.Response.WriteAsJsonAsync(new { error = "aal2_required" });
                return;
            }
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
