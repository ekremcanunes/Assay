using market_service.Models;

namespace market_service.Services;

public interface ISymbolSearchService
{
    Task<List<SymbolSearchResult>> SearchAsync(string query);
}
