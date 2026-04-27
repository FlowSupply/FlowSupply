using System.ComponentModel.DataAnnotations;

namespace SupplyChain.API.Models;

public class Supplier
{
    [Key] // Указваме, че това е Primary Key
    public int SupplierId { get; set; }
    
    public string SupplierName { get; set; } = string.Empty;
    public string SupplierCategory { get; set; } = string.Empty;
    
    // Във frontend-а ги пазите като string ('4.5', '10'), затова тук ги слагам като string, за да не се счупи Angular-a
    public string SupplierRating { get; set; } = "0.0";
    public string SupplierSupplies { get; set; } = "0";
    
    // Тук във frontend-а е число (0.3)
    public double SupplierAvrLatency { get; set; }
    
    public string SupplierStatus { get; set; } = "Active";
    
    public string SupplierContactPerson { get; set; } = string.Empty;
    public string SupplierContactEmail { get; set; } = string.Empty;
    public string SupplierContactPhone { get; set; } = string.Empty;
    public string SupplierAddress { get; set; } = string.Empty;
}