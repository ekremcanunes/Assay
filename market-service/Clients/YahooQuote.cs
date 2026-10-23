namespace market_service.Clients;

// Yahoo Finance chart meta'sından çekilen ham quote (native para biriminde)
public record YahooQuote(
    decimal Price,
    decimal? PreviousClose,
    decimal? DayHigh,
    decimal? DayLow,
    decimal? Week52High,
    decimal? Week52Low,
    long? Volume,
    string Currency,
    string Exchange);
