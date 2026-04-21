using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SupplyChain.API.Data;
using SupplyChain.API.Models;

namespace SupplyChain.API.Controllers;

[ApiController]
[Route("api/shopping-orders")]
public class ShoppingOrdersController : ControllerBase
{
    private static readonly string[] ActiveStatusFlow = ["pending", "confirmed", "shipped", "delivered"];

    private static readonly Dictionary<string, string> StatusLabels = new()
    {
        ["pending"] = "Чакаща",
        ["confirmed"] = "Потвърдена",
        ["shipped"] = "Изпратена",
        ["delivered"] = "Доставена",
        ["cancelled"] = "Отказана"
    };

    private readonly AppDbContext _context;

    public ShoppingOrdersController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult> GetAll()
    {
        var orders = await _context.ShoppingOrders
            .Include(order => order.Steps.OrderBy(step => step.Id))
            .OrderBy(order => order.Id)
            .ToListAsync();

        return Ok(orders);
    }

    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult> UpdateStatus(int id, UpdateOrderStatusRequest request)
    {
        var status = request.Status.Trim().ToLowerInvariant();
        if (!StatusLabels.ContainsKey(status))
        {
            return BadRequest("Unsupported order status.");
        }

        var order = await _context.ShoppingOrders
            .Include(shoppingOrder => shoppingOrder.Steps)
            .FirstOrDefaultAsync(shoppingOrder => shoppingOrder.Id == id);

        if (order == null)
        {
            return NotFound();
        }

        ApplyStatus(order, status);
        await _context.SaveChangesAsync();

        return Ok(order);
    }

    private static void ApplyStatus(ShoppingOrder order, string status)
    {
        order.Status = status;
        order.StatusLabel = StatusLabels[status];

        if (status == "cancelled")
        {
            foreach (var step in order.Steps)
            {
                step.IsDone = false;
                step.CompletedAt = null;
            }

            return;
        }

        var currentStatusIndex = Array.IndexOf(ActiveStatusFlow, status);
        foreach (var step in order.Steps)
        {
            var stepIndex = Array.IndexOf(ActiveStatusFlow, step.Status);
            var isDone = stepIndex <= currentStatusIndex;

            step.IsDone = isDone;
            step.CompletedAt = isDone ? step.CompletedAt ?? DateTime.UtcNow : null;
        }
    }
}
