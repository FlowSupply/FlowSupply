using Microsoft.EntityFrameworkCore;
using SupplyChain.API.Models;

namespace SupplyChain.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
    public DbSet<ShoppingOrder> ShoppingOrders => Set<ShoppingOrder>();
    public DbSet<ShoppingOrderStep> ShoppingOrderSteps => Set<ShoppingOrderStep>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>()
            .HasIndex(user => user.Email)
            .IsUnique();

        modelBuilder.Entity<ShoppingOrder>()
            .HasMany(order => order.Steps)
            .WithOne(step => step.Order)
            .HasForeignKey(step => step.ShoppingOrderId);

        modelBuilder.Entity<InventoryItem>().HasData(
            new InventoryItem { Id = 1, Name = "USB Cables Type-C", Sku = "USB-C-001", Category = "Electronics", AvailableQuantity = 62, MinimumQuantity = 20, Status = "Optimal", SupplierName = "ElektroSupply" },
            new InventoryItem { Id = 2, Name = "HP Toner 26A", Sku = "TON-26A", Category = "Office Supplies", AvailableQuantity = 60, MinimumQuantity = 50, Status = "Optimal", SupplierName = "TechParts BG" },
            new InventoryItem { Id = 3, Name = "A4 Paper Pack", Sku = "PPR-A4", Category = "Office Supplies", AvailableQuantity = 45, MinimumQuantity = 50, Status = "Good", SupplierName = "BG Office Pro" },
            new InventoryItem { Id = 4, Name = "SSD Disks 1TB", Sku = "SSD-1TB", Category = "Hardware", AvailableQuantity = 40, MinimumQuantity = 50, Status = "Good", SupplierName = "TechParts BG" },
            new InventoryItem { Id = 5, Name = "AA Batteries Box", Sku = "BAT-AA", Category = "Office Supplies", AvailableQuantity = 25, MinimumQuantity = 50, Status = "Low", SupplierName = "BG Office Pro" },
            new InventoryItem { Id = 6, Name = "Printer Heads", Sku = "PRN-HEAD", Category = "Hardware", AvailableQuantity = 15, MinimumQuantity = 50, Status = "Very Low", SupplierName = "OfficeMax" }
        );

        modelBuilder.Entity<ShoppingOrder>().HasData(
            new ShoppingOrder { Id = 1, OrderNumber = "ORD-2045", Title = "Тонер HP 26A", Supplier = "TechParts BG", Quantity = 50, OrderDate = new DateTime(2026, 3, 16), Status = "pending", StatusLabel = "Чакаща" },
            new ShoppingOrder { Id = 2, OrderNumber = "ORD-2044", Title = "Хартия A4 (200 пакета)", Supplier = "BG Office Pro", Quantity = 200, OrderDate = new DateTime(2026, 3, 13), Status = "shipped", StatusLabel = "Изпратена" },
            new ShoppingOrder { Id = 3, OrderNumber = "ORD-2046", Title = "USB-C кабели", Supplier = "ElektroSupply", Quantity = 120, OrderDate = new DateTime(2026, 3, 18), Status = "confirmed", StatusLabel = "Потвърдена" }
        );

        modelBuilder.Entity<ShoppingOrderStep>().HasData(
            new ShoppingOrderStep { Id = 1, ShoppingOrderId = 1, Label = "Order created", Status = "pending", IsDone = true, CompletedAt = new DateTime(2026, 3, 16) },
            new ShoppingOrderStep { Id = 2, ShoppingOrderId = 1, Label = "Confirmed by supplier", Status = "confirmed", IsDone = false },
            new ShoppingOrderStep { Id = 3, ShoppingOrderId = 1, Label = "Shipped", Status = "shipped", IsDone = false },
            new ShoppingOrderStep { Id = 4, ShoppingOrderId = 1, Label = "Delivered", Status = "delivered", IsDone = false },
            new ShoppingOrderStep { Id = 5, ShoppingOrderId = 2, Label = "Order created", Status = "pending", IsDone = true, CompletedAt = new DateTime(2026, 3, 13) },
            new ShoppingOrderStep { Id = 6, ShoppingOrderId = 2, Label = "Confirmed by supplier", Status = "confirmed", IsDone = true, CompletedAt = new DateTime(2026, 3, 13) },
            new ShoppingOrderStep { Id = 7, ShoppingOrderId = 2, Label = "Shipped", Status = "shipped", IsDone = true, CompletedAt = new DateTime(2026, 3, 15) },
            new ShoppingOrderStep { Id = 8, ShoppingOrderId = 2, Label = "Delivered", Status = "delivered", IsDone = false },
            new ShoppingOrderStep { Id = 9, ShoppingOrderId = 3, Label = "Order created", Status = "pending", IsDone = true, CompletedAt = new DateTime(2026, 3, 18) },
            new ShoppingOrderStep { Id = 10, ShoppingOrderId = 3, Label = "Confirmed by supplier", Status = "confirmed", IsDone = true, CompletedAt = new DateTime(2026, 3, 18) },
            new ShoppingOrderStep { Id = 11, ShoppingOrderId = 3, Label = "Shipped", Status = "shipped", IsDone = false },
            new ShoppingOrderStep { Id = 12, ShoppingOrderId = 3, Label = "Delivered", Status = "delivered", IsDone = false }
        );
    }
}
