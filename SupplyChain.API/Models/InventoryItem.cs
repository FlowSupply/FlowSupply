namespace SupplyChain.API.Models;

public class InventoryItem
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int AvailableQuantity { get; set; }
    public int MinimumQuantity { get; set; }
    public string Status { get; set; } = "Optimal";
    public string SupplierName { get; set; } = string.Empty;
    public int LastConsumedQuantity { get; set; }
}
