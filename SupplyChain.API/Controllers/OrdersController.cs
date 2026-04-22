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

    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var orders = await _db.Orders.OrderByDescending(o => o.CreatedAt).ToListAsync();
        return Ok(orders);
    }

    // Advance status: Pending -> Confirmed -> Shipped -> Delivered
    [AllowAnonymous]
    [HttpPatch("{id}/advance")]
    public async Task<IActionResult> Advance(Guid id)
    {
        var order = await _db.Orders.FindAsync(id);
        if (order == null) return NotFound();

        var nextStatus = order.Status switch
        {
            "Pending" => "Confirmed",
            "Confirmed" => "Shipped",
            "Shipped" => "Delivered",
            _ => order.Status
        };

        await ApplyOrderStatus(order, nextStatus);

        await _db.SaveChangesAsync();
        return Ok(order);
    }

    [AllowAnonymous]
    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateOrderStatusRequest request)
    {
        var order = await _db.Orders.FindAsync(id);
        if (order == null) return NotFound();

        var nextStatus = NormalizeStatus(request.Status);
        if (nextStatus == null)
        {
            return BadRequest("Unsupported order status.");
        }

        await ApplyOrderStatus(order, nextStatus);

        await _db.SaveChangesAsync();
        return Ok(order);
    }

    private static string? NormalizeStatus(string status)
    {
        return status.Trim().ToLowerInvariant() switch
        {
            "pending" => "Pending",
            "confirmed" => "Confirmed",
            "shipped" => "Shipped",
            "delivered" => "Delivered",
            "cancelled" => "Cancelled",
            _ => null
        };
    }

    private async Task ApplyOrderStatus(Order order, string nextStatus)
    {
        order.Status = nextStatus;

        switch (nextStatus)
        {
            case "Pending":
                order.ConfirmedAt = null;
                order.ShippedAt = null;
                order.DeliveredAt = null;
                order.CancelledAt = null;
                break;

            case "Confirmed":
                order.ConfirmedAt ??= DateTime.UtcNow;
                order.ShippedAt = null;
                order.DeliveredAt = null;
                order.CancelledAt = null;
                break;

            case "Shipped":
                order.ConfirmedAt ??= DateTime.UtcNow;
                order.ShippedAt ??= DateTime.UtcNow;
                order.DeliveredAt = null;
                order.CancelledAt = null;
                break;

            case "Delivered":
                order.ConfirmedAt ??= DateTime.UtcNow;
                order.ShippedAt ??= DateTime.UtcNow;
                order.DeliveredAt ??= DateTime.UtcNow;
                order.CancelledAt = null;
                break;

            case "Cancelled":
                // Keep existing timestamps so the UI can show where the order stopped.
                order.CancelledAt ??= DateTime.UtcNow;
                break;
        }

        if (nextStatus == "Delivered" && !order.InventoryAppliedToStock)
        {
            var product = await _db.Products
                .FirstOrDefaultAsync(p => p.ProductName == order.ProductName);

            if (product != null)
            {
                product.ProductAvailability += order.Quantity;
                order.InventoryAppliedToStock = true;
            }
        }
    }
}
