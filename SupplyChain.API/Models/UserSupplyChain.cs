using System.ComponentModel.DataAnnotations;

namespace SupplyChain.API.Models;

public class UserSupplyChain
{
    [Key]
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public Guid SupplyChainId { get; set; }
    public Chain? SupplyChain { get; set; } 
    public string Role { get; set; } = "Employee"; // Employee / Admin / SuperAdmin
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}