using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;

namespace portfolio_service.Services;

// Sağlayıcıdan bağımsız REST gönderici. Adres, auth header ve JSON gövde şablonu yapılandırmadan gelir;
// sağlayıcı değiştirmek yalnızca SMS_* değerlerini değiştirmektir. Başarı: HTTP 2xx.
public partial class HttpSmsSender(HttpClient http, IOptions<SmsOptions> options) : ISmsSender
{
    // Relaxed: Türkçe karakterler ve '+' kaçışlanmadan kalır. Gövde HTML'e değil API'ye gittiği için güvenli.
    private static readonly JavaScriptEncoder Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping;

    public async Task SendAsync(string to, string message, CancellationToken ct)
    {
        var o = options.Value;
        using var request = new HttpRequestMessage(HttpMethod.Post, o.Url)
        {
            Content = new StringContent(RenderBody(o.BodyTemplate, to, message, o.Sender), Encoding.UTF8, "application/json")
        };
        if (!string.IsNullOrWhiteSpace(o.AuthHeader))
            request.Headers.TryAddWithoutValidation(o.AuthHeader, o.AuthValue);

        using var response = await http.SendAsync(request, ct);
        // Mesajda yalnızca durum kodu: numara, metin ve gövde loglanmaz (LOGGING.md).
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"SMS sağlayıcısı {(int)response.StatusCode} döndü", null, response.StatusCode);
    }

    // Tek geçişte değiştirir: mesajın içinde "{sender}" geçse bile ikinci kez yorumlanmaz.
    public static string RenderBody(string template, string to, string message, string sender) =>
        Placeholder().Replace(template, m => JsonEncodedText.Encode(m.Groups[1].Value switch
        {
            "to" => to,
            "message" => message,
            _ => sender,
        }, Encoder).ToString());

    [GeneratedRegex(@"\{(to|message|sender)\}")]
    private static partial Regex Placeholder();
}
