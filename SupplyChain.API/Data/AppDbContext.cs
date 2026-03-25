using Microsoft.EntityFrameworkCore;
using SupplyChain.API.Models;

namespace SupplyChain.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
}