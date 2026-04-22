using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SupplyChain.API.Data;
using SupplyChain.API.Models;

namespace SupplyChain.API.Controllers;

[Authorize]
[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _db;
    public OrdersController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var orders = await _db.Orders.OrderByDescending(o => o.CreatedAt).ToListAsync();
        return Ok(orders);
    }

    // Advance status: Pending → Shipped → Delivered
    [HttpPatch("{id}/advance")]
public async Task<IActionResult> Advance(Guid id)
{
    var order = await _db.Orders.FindAsync(id);
    if (order == null) return NotFound();

    var previousStatus = order.Status;

    order.Status = order.Status switch
    {
        "Pending"  => "Shipped",
        "Shipped"  => "Delivered",
        _ => order.Status
    };

    if (order.Status == "Shipped")   order.ShippedAt   = DateTime.UtcNow;
    if (order.Status == "Delivered") order.DeliveredAt = DateTime.UtcNow;

    // Ако е доставена → обнови склада
    if (order.Status == "Delivered" && previousStatus == "Shipped")
    {
        var product = await _db.Products
            .FirstOrDefaultAsync(p => p.ProductName == order.ProductName);

        if (product != null)
            product.ProductAvailability += order.Quantity;
        // ако продуктът не съществува още — не се случва нищо
        // (може да добавиш auto-create логика по-късно)
    }

    await _db.SaveChangesAsync();
    return Ok(order);
}
}