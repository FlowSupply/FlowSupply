using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SupplyChain.API.Data;
using SupplyChain.API.Models;
using System.Security.Claims;

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
        var chainId = await GetCurrentChainId();
        if (chainId == null) return BadRequest("No chain.");

        var orders = await _db.Orders
            .Where(o => o.SupplyChainId == chainId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();
        return Ok(orders);
    }

    // Advance status: Pending -> Confirmed -> Shipped -> Delivered
    [HttpPatch("{id}/advance")]
    public async Task<IActionResult> Advance(Guid id)
    {
        var chainId = await GetCurrentChainId();
        if (chainId == null) return BadRequest("No chain.");

        var order = await _db.Orders.FirstOrDefaultAsync(o => o.OrderId == id && o.SupplyChainId == chainId);
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

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateOrderStatusRequest request)
    {
        var chainId = await GetCurrentChainId();
        if (chainId == null) return BadRequest("No chain.");

        var order = await _db.Orders.FirstOrDefaultAsync(o => o.OrderId == id && o.SupplyChainId == chainId);
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
        var previousStatus = order.Status;
        var shouldApplyDeliveryToInventory = nextStatus == "Delivered" && previousStatus != "Delivered";

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

        if (shouldApplyDeliveryToInventory)
        {
            await AddDeliveredOrderQuantityToInventory(order);
            await MarkRequestAsDelivered(order);
        }
    }

    private async Task AddDeliveredOrderQuantityToInventory(Order order)
    {
        var orderProductName = NormalizeProductName(order.ProductName);
        var product = await _db.Products
            .FirstOrDefaultAsync(p => p.SupplyChainId == order.SupplyChainId && p.ProductName.ToLower().Trim() == orderProductName);

        if (product == null)
        {
            product = new Product
            {
                ProductName = order.ProductName.Trim(),
                ProductSKU = GenerateProductSku(order.ProductName),
                ProductCategory = "Requested Items",
                ProductAvailability = 0,
                ProductMinimum = Math.Max(order.Quantity, 1),
                SupplyChainId = order.SupplyChainId
            };

            _db.Products.Add(product);
        }

        product.ProductAvailability += order.Quantity;
    }

    private static string NormalizeProductName(string productName) =>
        productName.Trim().ToLowerInvariant();

    private async Task MarkRequestAsDelivered(Order order)
    {
        if (order.RequestId == Guid.Empty)
        {
            return;
        }

        var request = await _db.PurchaseRequests
            .FirstOrDefaultAsync(r => r.RequestId == order.RequestId && r.SupplyChainId == order.SupplyChainId);
        if (request != null)
        {
            request.Status = "Delivered";
        }
    }

    private static string GenerateProductSku(string productName)
    {
        var lettersAndDigits = new string(productName
            .ToUpperInvariant()
            .Where(char.IsLetterOrDigit)
            .Take(8)
            .ToArray());

        if (string.IsNullOrWhiteSpace(lettersAndDigits))
        {
            lettersAndDigits = "PRODUCT";
        }

        return $"{lettersAndDigits}-AUTO";
    }

    private async Task<Guid?> GetCurrentChainId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return null;

        var user = await _db.Users.FindAsync(int.Parse(userId));
        return user?.SupplyChainId;
    }
}
