using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SupplyChain.API.Data;
using SupplyChain.API.Models;
using System.Security.Claims;

namespace SupplyChain.API.Controllers;

[Authorize]
[ApiController]
[Route("api/products")]
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ProductsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var chainId = await GetCurrentChainId();
        if (chainId == null) return BadRequest("No chain.");

        return Ok(await _db.Products
            .Where(p => p.SupplyChainId == chainId)
            .OrderBy(p => p.ProductName)
            .ToListAsync());
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Product dto)
    {
        var chainId = await GetCurrentChainId();
        if (chainId == null) return BadRequest("No chain.");

        dto.SupplyChainId = chainId;
        _db.Products.Add(dto);
        await _db.SaveChangesAsync();
        return Ok(dto);
    }

    private async Task<Guid?> GetCurrentChainId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return null;

        var user = await _db.Users.FindAsync(int.Parse(userId));
        return user?.SupplyChainId;
    }
}
