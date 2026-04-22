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

        var products = await context.Products
            .Where(product => product.ProductAvailability > 0)
            .OrderBy(product => product.ProductId)
            .ToListAsync(stoppingToken);

        if (products.Count == 0)
        {
            return;
        }

        var updatesCount = Math.Min(products.Count, Random.Shared.Next(1, 4));
        var targetProducts = products
            .OrderBy(_ => Random.Shared.Next())
            .Take(updatesCount);

        foreach (var targetProduct in targetProducts)
        {
            var consumedQuantity = Math.Min(targetProduct.ProductAvailability, GetWeightedConsumptionQuantity());

            targetProduct.ProductAvailability -= consumedQuantity;

            _logger.LogInformation(
                "Consumed {ConsumedQuantity} from product {ProductName}. Remaining: {AvailableQuantity}",
                consumedQuantity,
                targetProduct.ProductName,
                targetProduct.ProductAvailability);
        }

        await context.SaveChangesAsync(stoppingToken);
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
