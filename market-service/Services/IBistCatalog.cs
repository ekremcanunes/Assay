using market_service.Models;

namespace market_service.Services;

public interface IBistCatalog
{
    Task<List<SymbolSearchResult>> GetAllAsync();
}
