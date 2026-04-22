using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SupplyChain.API.Data;

namespace SupplyChain.API.Controllers;

[Authorize]
[ApiController]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;
    public DashboardController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var orders    = await _db.Orders.ToListAsync();
        var products  = await _db.Products.ToListAsync();
        var requests  = await _db.PurchaseRequests.ToListAsync();

        var lowStock = products
            .Where(p => p.ProductMinimum > 0 && p.ProductAvailability < p.ProductMinimum)
            .OrderBy(p => (double)p.ProductAvailability / p.ProductMinimum)
            .Take(5)
            .Select(p => new {
                p.ProductName,
                current = p.ProductAvailability,
                min     = p.ProductMinimum
            });

        var lateOrders = orders
            .Where(o => o.Status != "Delivered" &&
                        o.CreatedAt < DateTime.UtcNow.AddDays(-3))
            .Select(o => new {
                days     = (int)(DateTime.UtcNow - o.CreatedAt).TotalDays,
                name     = o.ProductName,
                supplier = o.SupplierName,
                order    = "#" + o.OrderId.ToString().Substring(0, 8).ToUpper()
            });

        // Поръчки по месец (последните 6 месеца)
        var now = DateTime.UtcNow;
        var monthlyOrders = Enumerable.Range(0, 6)
            .Select(i => now.AddMonths(-5 + i))
            .Select(m => new {
                month = m.ToString("MMMM"),
                count = orders.Count(o =>
                    o.CreatedAt.Year == m.Year &&
                    o.CreatedAt.Month == m.Month)
            })
            .ToList();

        return Ok(new {
            totalOrders    = orders.Count,
            totalProducts  = products.Sum(p => p.ProductAvailability),
            lowStockCount  = products.Count(p => p.ProductAvailability < p.ProductMinimum),
            lateCount      = lateOrders.Count(),
            lowStockItems  = lowStock,
            lateDeliveries = lateOrders,
            monthlyOrders  = monthlyOrders
        });
    }
}