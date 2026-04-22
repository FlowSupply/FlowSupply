using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SupplyChain.API.Data;
using SupplyChain.API.Models;

namespace SupplyChain.API.Controllers;

[Authorize]
[ApiController]
[Route("api/products")]
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ProductsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await _db.Products.OrderBy(p => p.ProductName).ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Product dto)
    {
        _db.Products.Add(dto);
        await _db.SaveChangesAsync();
        return Ok(dto);
    }
}