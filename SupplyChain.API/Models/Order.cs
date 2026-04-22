using System.ComponentModel.DataAnnotations;

namespace SupplyChain.API.Models;

public class Order
{
    [Key]
    public Guid OrderId { get; set; } = Guid.NewGuid();
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending"; // Pending / Shipped / Delivered
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ShippedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }

    public Guid RequestId { get; set; } // връзка към заявката
}