using System.ComponentModel.DataAnnotations;

namespace SupplyChain.API.Models;

public class Product
{
    [Key]
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductSKU { get; set; } = string.Empty;
    public string ProductCategory { get; set; } = string.Empty;
    public int ProductAvailability { get; set; } = 0;
    public int ProductMinimum { get; set; } = 0;
}