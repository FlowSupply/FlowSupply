using System.ComponentModel.DataAnnotations;

namespace SupplyChain.API.Models;

public class ChainInvite
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public Guid ChainId { get; set; }
    public Chain? Chain { get; set; }
    public string Role { get; set; } = "Employee";
    public bool IsUsed { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddDays(7);
}