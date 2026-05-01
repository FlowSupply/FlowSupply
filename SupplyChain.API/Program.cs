using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SupplyChain.API.Data;
using SupplyChain.API.Models;
using SupplyChain.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter: Bearer YOUR_TOKEN"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<TokenService>();
builder.Services.AddHostedService<InventoryConsumptionService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy
            .WithOrigins("http://localhost:4200", "http://127.0.0.1:4200")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new Exception("JWT Key is missing.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddScoped<EmailService>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await SeedDemoData(context);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection();

app.UseCors("AllowAngular");

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => "SupplyChain API is running.");

app.MapControllers();

app.Run();

static async Task SeedDemoData(AppDbContext context)
{
    if (!await context.Products.AnyAsync())
    {
        context.Products.AddRange(
            new Product { ProductName = "USB Cables Type-C", ProductSKU = "USB-C-001", ProductCategory = "Electronics", ProductAvailability = 62, ProductMinimum = 20 },
            new Product { ProductName = "HP Toner 26A", ProductSKU = "TON-26A", ProductCategory = "Office Supplies", ProductAvailability = 60, ProductMinimum = 50 },
            new Product { ProductName = "A4 Paper Pack", ProductSKU = "PPR-A4", ProductCategory = "Office Supplies", ProductAvailability = 45, ProductMinimum = 50 },
            new Product { ProductName = "SSD Disks 1TB", ProductSKU = "SSD-1TB", ProductCategory = "Hardware", ProductAvailability = 40, ProductMinimum = 50 },
            new Product { ProductName = "AA Batteries Box", ProductSKU = "BAT-AA", ProductCategory = "Office Supplies", ProductAvailability = 25, ProductMinimum = 50 },
            new Product { ProductName = "Printer Heads", ProductSKU = "PRN-HEAD", ProductCategory = "Hardware", ProductAvailability = 15, ProductMinimum = 50 }
        );
    }

    if (!await context.Orders.AnyAsync())
    {
        context.Orders.AddRange(
            new Order { ProductName = "HP Toner 26A", SupplierName = "TechParts BG", Quantity = 50, Status = "Pending", CreatedAt = new DateTime(2026, 3, 16, 0, 0, 0, DateTimeKind.Utc), RequestId = Guid.Empty },
            new Order { ProductName = "A4 Paper Pack", SupplierName = "BG Office Pro", Quantity = 200, Status = "Shipped", CreatedAt = new DateTime(2026, 3, 13, 0, 0, 0, DateTimeKind.Utc), ShippedAt = new DateTime(2026, 3, 15, 0, 0, 0, DateTimeKind.Utc), RequestId = Guid.Empty },
            new Order { ProductName = "USB Cables Type-C", SupplierName = "ElektroSupply", Quantity = 120, Status = "Pending", CreatedAt = new DateTime(2026, 3, 18, 0, 0, 0, DateTimeKind.Utc), RequestId = Guid.Empty }
        );
    }

    await context.SaveChangesAsync();
}
