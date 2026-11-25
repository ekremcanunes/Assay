namespace market_service.Clients;

public class BorsaIstanbulClient(HttpClient httpClient, IConfiguration configuration,
    ILogger<BorsaIstanbulClient> logger) : IBorsaIstanbulClient
{
    private readonly string _source = configuration["BorsaIstanbul:ConstituentsSource"] ?? string.Empty;

    public async Task<string?> GetConstituentsCsvAsync(CancellationToken ct)
    {
        try
        {
            if (!_source.StartsWith("http", StringComparison.OrdinalIgnoreCase))
                return await File.ReadAllTextAsync(_source, ct);

            var response = await httpClient.GetAsync(_source, ct);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadAsStringAsync(ct);
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            logger.LogWarning(ex, "Index constituent file could not be read from {Source}", _source);
            return null;
        }
    }
}
