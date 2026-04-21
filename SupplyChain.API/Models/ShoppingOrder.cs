namespace SupplyChain.API.Models;

public class ShoppingOrder
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Supplier { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public DateTime OrderDate { get; set; }
    public string Status { get; set; } = "pending";
    public string StatusLabel { get; set; } = "Чакаща";
    public List<ShoppingOrderStep> Steps { get; set; } = [];
}
