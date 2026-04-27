using System.ComponentModel.DataAnnotations;

namespace SupplyChain.API.Models;

public class PurchaseRequest
{
    [Key]
    public Guid RequestId { get; set; } = Guid.NewGuid();
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Priority { get; set; } = "Medium";
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "Pending";

    public int UserId { get; set; }  
    public User? User { get; set; }
}