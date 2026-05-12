using System.ComponentModel.DataAnnotations;

namespace SupplyChain.API.Models;

public class RoleChangeLog
{
    [Key]
    public int Id { get; set; }
    public int ChangedByUserId { get; set; }
    public User? ChangedByUser { get; set; }
    public int TargetUserId { get; set; }
    public User? TargetUser { get; set; }
    public string OldRole { get; set; } = string.Empty;
    public string NewRole { get; set; } = string.Empty;
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
    public Guid ChainId { get; set; }
}