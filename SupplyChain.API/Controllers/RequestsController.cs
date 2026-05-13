using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SupplyChain.API.Data;
using SupplyChain.API.Models;
using System.Security.Claims;

namespace SupplyChain.API.Controllers;

[Authorize]
[ApiController]
[Route("api/requests")]
public class RequestsController : ControllerBase
{
    private readonly AppDbContext _db;
    public RequestsController(AppDbContext db) => _db = db;

    // GET api/requests
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var chainId = await GetCurrentChainId();
        if (chainId == null) return BadRequest("No chain.");

        var requests = await _db.PurchaseRequests
            .Where(r => r.SupplyChainId == chainId)
            .OrderByDescending(r => r.Date)
            .ToListAsync();
        return Ok(requests);
    }

    // POST api/requests
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PurchaseRequest dto)
    {
        // Вземаме UserId от JWT токена
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();

        var chainId = await GetCurrentChainId();
        if (chainId == null) return BadRequest("No chain.");

        var request = new PurchaseRequest
        {
            ProductName = dto.ProductName,
            Quantity     = dto.Quantity,
            Reason       = dto.Reason,
            Priority     = dto.Priority,
            UserId = int.Parse(userIdClaim),
            SupplyChainId = chainId
        };

        _db.PurchaseRequests.Add(request);
        await _db.SaveChangesAsync();
        return Ok(request);
    }

    [HttpPatch("{id}/status")]
public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] string status)
{
    var chainId = await GetCurrentChainId();
    if (chainId == null) return BadRequest("No chain.");

    var request = await _db.PurchaseRequests
        .FirstOrDefaultAsync(r => r.RequestId == id && r.SupplyChainId == chainId);
    if (request == null) return NotFound();

    var allowed = new[] { "Pending", "Approved", "Rejected" };
    if (!allowed.Contains(status)) return BadRequest("Invalid status.");

    request.Status = status;

    // Ако е одобрена → създай поръчка
    if (status == "Approved")
    {
        var order = new Order
        {
            ProductName  = request.ProductName,
            Quantity     = request.Quantity,
            SupplierName = "TBD", // ще се попълва от AI по-късно
            Status       = "Pending",
            RequestId    = request.RequestId,
            SupplyChainId = chainId
        };
        _db.Orders.Add(order);
    }

    await _db.SaveChangesAsync();
    return Ok(request);
}

private async Task<Guid?> GetCurrentChainId()
{
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (userId == null) return null;

    var user = await _db.Users.FindAsync(int.Parse(userId));
    return user?.SupplyChainId;
}
}
