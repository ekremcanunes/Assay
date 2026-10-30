namespace portfolio_service.Services;

// Kullanıcının çiğnediği iş kuralı (ör. elindekinden fazla satış). Web Code'u TR/EN çevirir,
// Params mesajdaki yer tutucuları doldurur; Message yalnızca teşhis içindir ve İngilizcedir.
public class AssetRuleException(string code, string message, IReadOnlyDictionary<string, string> parameters)
    : InvalidOperationException(message)
{
    public string Code { get; } = code;
    public IReadOnlyDictionary<string, string> Params { get; } = parameters;
}
