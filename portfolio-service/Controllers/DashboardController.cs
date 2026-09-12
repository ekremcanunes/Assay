using Microsoft.AspNetCore.Mvc;
using portfolio_service.DTOs;
using portfolio_service.Services;

namespace portfolio_service.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController(IAssetService assetService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<DashboardDto>> GetDashboard()
    {
        var userId = HttpContext.Items["UserId"]?.ToString()!;
        return Ok(await assetService.GetDashboardAsync(userId));
    }
}
