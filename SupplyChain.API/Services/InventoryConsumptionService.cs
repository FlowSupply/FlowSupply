using Microsoft.EntityFrameworkCore;
using SupplyChain.API.Data;

namespace SupplyChain.API.Services;

public class InventoryConsumptionService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<InventoryConsumptionService> _logger;

    public InventoryConsumptionService(
        IServiceScopeFactory scopeFactory,
        ILogger<InventoryConsumptionService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = TimeSpan.FromMilliseconds(Random.Shared.Next(2500, 7501));
            await Task.Delay(delay, stoppingToken);
            await ConsumeInventory(stoppingToken);
        }
    }

    private async Task ConsumeInventory(CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var items = await context.InventoryItems
            .Where(item => item.AvailableQuantity > 0)
            .OrderBy(item => item.Id)
            .ToListAsync(stoppingToken);

        if (items.Count == 0)
        {
            return;
        }

        foreach (var item in items)
        {
            item.LastConsumedQuantity = 0;
        }

        var updatesCount = Math.Min(items.Count, Random.Shared.Next(1, 4));
        var targetItems = items
            .OrderBy(_ => Random.Shared.Next())
            .Take(updatesCount);

        foreach (var targetItem in targetItems)
        {
            var consumedQuantity = Math.Min(targetItem.AvailableQuantity, GetWeightedConsumptionQuantity());

            targetItem.AvailableQuantity -= consumedQuantity;
            targetItem.LastConsumedQuantity = consumedQuantity;
            targetItem.Status = GetStatus(targetItem.AvailableQuantity, targetItem.MinimumQuantity);

            _logger.LogInformation(
                "Consumed {ConsumedQuantity} from inventory item {ItemName}. Remaining: {AvailableQuantity}",
                consumedQuantity,
                targetItem.Name,
                targetItem.AvailableQuantity);
        }

        await context.SaveChangesAsync(stoppingToken);
    }

    private static string GetStatus(int availableQuantity, int minimumQuantity)
    {
        if (availableQuantity <= 0)
        {
            return "Out of Stock";
        }

        var availabilityPercentage = minimumQuantity == 0
            ? 0
            : (availableQuantity / (double)minimumQuantity) * 100;

        return availabilityPercentage switch
        {
            <= 15 => "Critical",
            <= 30 => "Very Low",
            <= 50 => "Low",
            <= 80 => "Good",
            <= 100 => "Optimal",
            _ => "Overstock"
        };
    }

    private static int GetWeightedConsumptionQuantity()
    {
        var roll = Random.Shared.Next(100);

        return roll switch
        {
            < 65 => 1,
            < 90 => 2,
            _ => 3
        };
    }
}
