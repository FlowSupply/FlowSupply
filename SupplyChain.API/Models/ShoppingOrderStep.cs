using System.Text.Json.Serialization;

namespace SupplyChain.API.Models;

public class ShoppingOrderStep
{
    public int Id { get; set; }
    public int ShoppingOrderId { get; set; }
    [JsonIgnore]
    public ShoppingOrder? Order { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool IsDone { get; set; }
    public DateTime? CompletedAt { get; set; }
}
