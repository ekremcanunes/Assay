namespace market_service.Clients;

// Twelve Data /stocks veya /etfs listesinin bir kaydı, ham haliyle.
// Type: /stocks cevabındaki tür (Common Stock, REIT, Warrant...); /etfs cevabında bu alan yoktur → null.
public record TwelveDataListing(string Symbol, string Name, string Currency, string Exchange, string? Type);
