using System.ComponentModel.DataAnnotations;

namespace SupplyChain.API.Models;

public class Chain
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Industry { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Visibility { get; set; } = "private";
    public string InviteCode { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int OwnerId { get; set; }
    public User? Owner { get; set; }
}