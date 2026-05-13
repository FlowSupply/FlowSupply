using Microsoft.EntityFrameworkCore;
using SupplyChain.API.Data;
using SupplyChain.API.Models;

namespace SupplyChain.API.Services;

public class ChainSeedService
{
    private readonly AppDbContext _context;

    public ChainSeedService(AppDbContext context)
    {
        _context = context;
    }

    public async Task SeedAllChainsAsync()
    {
        var chains = await _context.Chains
            .Select(chain => new { chain.Id, chain.OwnerId })
            .ToListAsync();

        foreach (var chain in chains)
        {
            await SeedForChainAsync(chain.Id, chain.OwnerId);
        }
    }

    public async Task SeedForChainAsync(Guid chainId, int ownerId)
    {
        if (!await _context.Products.AnyAsync(product => product.SupplyChainId == chainId))
        {
            _context.Products.AddRange(
                new Product { ProductName = "USB Cables Type-C", ProductSKU = "USB-C-001", ProductCategory = "Electronics", ProductAvailability = 62, ProductMinimum = 20, SupplyChainId = chainId },
                new Product { ProductName = "HP Toner 26A", ProductSKU = "TON-26A", ProductCategory = "Office Supplies", ProductAvailability = 60, ProductMinimum = 50, SupplyChainId = chainId },
                new Product { ProductName = "A4 Paper Pack", ProductSKU = "PPR-A4", ProductCategory = "Office Supplies", ProductAvailability = 45, ProductMinimum = 50, SupplyChainId = chainId },
                new Product { ProductName = "SSD Disks 1TB", ProductSKU = "SSD-1TB", ProductCategory = "Hardware", ProductAvailability = 40, ProductMinimum = 50, SupplyChainId = chainId },
                new Product { ProductName = "AA Batteries Box", ProductSKU = "BAT-AA", ProductCategory = "Office Supplies", ProductAvailability = 25, ProductMinimum = 50, SupplyChainId = chainId },
                new Product { ProductName = "Printer Heads", ProductSKU = "PRN-HEAD", ProductCategory = "Hardware", ProductAvailability = 15, ProductMinimum = 50, SupplyChainId = chainId }
            );
        }

        if (!await _context.Suppliers.AnyAsync(supplier => supplier.SupplyChainId == chainId))
        {
            _context.Suppliers.AddRange(
                new Supplier { SupplierName = "TechParts BG", SupplierCategory = "Hardware", SupplierRating = "4.7", SupplierSupplies = "18", SupplierAvrLatency = 1.8, SupplierStatus = "Active", SupplierContactPerson = "Ivan Petrov", SupplierContactEmail = "contact@techparts.bg", SupplierContactPhone = "+359 888 111 222", SupplierAddress = "Sofia, Bulgaria", SupplyChainId = chainId },
                new Supplier { SupplierName = "BG Office Pro", SupplierCategory = "Office Supplies", SupplierRating = "4.4", SupplierSupplies = "24", SupplierAvrLatency = 2.3, SupplierStatus = "Active", SupplierContactPerson = "Maria Georgieva", SupplierContactEmail = "sales@bgoffice.bg", SupplierContactPhone = "+359 888 333 444", SupplierAddress = "Plovdiv, Bulgaria", SupplyChainId = chainId },
                new Supplier { SupplierName = "ElektroSupply", SupplierCategory = "Electronics", SupplierRating = "4.6", SupplierSupplies = "12", SupplierAvrLatency = 2.0, SupplierStatus = "Active", SupplierContactPerson = "Nikolay Ivanov", SupplierContactEmail = "orders@elektrosupply.bg", SupplierContactPhone = "+359 888 555 666", SupplierAddress = "Varna, Bulgaria", SupplyChainId = chainId }
            );
        }

        if (!await _context.PurchaseRequests.AnyAsync(request => request.SupplyChainId == chainId))
        {
            _context.PurchaseRequests.AddRange(
                new PurchaseRequest { ProductName = "HP Toner 26A", Quantity = 50, Reason = "Restock printer supplies", Priority = "High", Status = "Approved", UserId = ownerId, SupplyChainId = chainId, Date = DateTime.UtcNow.AddDays(-4) },
                new PurchaseRequest { ProductName = "A4 Paper Pack", Quantity = 120, Reason = "Monthly office paper usage", Priority = "Medium", Status = "Pending", UserId = ownerId, SupplyChainId = chainId, Date = DateTime.UtcNow.AddDays(-2) },
                new PurchaseRequest { ProductName = "USB Cables Type-C", Quantity = 40, Reason = "Replacement cables for workstations", Priority = "Low", Status = "Delivered", UserId = ownerId, SupplyChainId = chainId, Date = DateTime.UtcNow.AddDays(-8) }
            );
        }

        if (!await _context.Orders.AnyAsync(order => order.SupplyChainId == chainId))
        {
            _context.Orders.AddRange(
                new Order { ProductName = "HP Toner 26A", SupplierName = "TechParts BG", Quantity = 50, Status = "Pending", CreatedAt = DateTime.UtcNow.AddDays(-3), RequestId = Guid.Empty, SupplyChainId = chainId },
                new Order { ProductName = "A4 Paper Pack", SupplierName = "BG Office Pro", Quantity = 200, Status = "Shipped", CreatedAt = DateTime.UtcNow.AddDays(-6), ConfirmedAt = DateTime.UtcNow.AddDays(-5), ShippedAt = DateTime.UtcNow.AddDays(-4), RequestId = Guid.Empty, SupplyChainId = chainId },
                new Order { ProductName = "USB Cables Type-C", SupplierName = "ElektroSupply", Quantity = 120, Status = "Confirmed", CreatedAt = DateTime.UtcNow.AddDays(-1), ConfirmedAt = DateTime.UtcNow.AddHours(-18), RequestId = Guid.Empty, SupplyChainId = chainId }
            );
        }

        await _context.SaveChangesAsync();
    }
}
