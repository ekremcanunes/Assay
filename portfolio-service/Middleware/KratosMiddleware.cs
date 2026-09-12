using System.Text.Json.Serialization;

namespace portfolio_service.Middleware;

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

public record KratosSession([property: JsonPropertyName("identity")] KratosIdentity? Identity);
public record KratosIdentity([property: JsonPropertyName("id")] string Id);
