import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

export interface Product {
  productId: number;
  productName: string;
  productSKU: string;
  productCategory: string;
  productAvailability: number;
  productMinimum: number;
}

@Component({
  selector: 'app-inventory',
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory.html',
  styleUrl: './inventory.css',
})
export class Inventory implements OnInit {
  products: Product[] = [];
  isModalOpen = false;
  searchTerm = '';

  newProduct: Partial<Product> = {
    productName: '', productSKU: '', productCategory: '',
    productAvailability: 0, productMinimum: 0
  };

  statusColors: Record<string, string> = {
    Critical:  'hsl(0, 72%, 51%)',
    'Very Low':'hsl(29, 85%, 55%)',
    Low:       'hsl(55, 73%, 50%)',
    Good:      'hsl(152, 85%, 43%)',
    Optimal:   'hsl(152, 90%, 27%)',
    Overstock: 'hsl(217, 91%, 60%)'
  };

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.loadProducts(); }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  loadProducts() {
    this.http.get<Product[]>('http://localhost:5090/api/products', { headers: this.getHeaders() })
      .subscribe({
        next: (data) => { this.products = data; this.cdr.detectChanges(); },
        error: (err) => console.error('Error loading products:', err)
      });
  }

  submitProduct() {
    this.http.post<Product>('http://localhost:5090/api/products', this.newProduct, { headers: this.getHeaders() })
      .subscribe({
        next: (created) => {
          this.products.push(created);
          this.cdr.detectChanges();
          this.isModalOpen = false;
          this.newProduct = { productName: '', productSKU: '', productCategory: '', productAvailability: 0, productMinimum: 0 };
        },
        error: (err) => console.error('Error adding product:', err)
      });
  }

  get filteredProducts() {
    if (!this.searchTerm) return this.products;
    const t = this.searchTerm.toLowerCase();
    return this.products.filter(p =>
      p.productName.toLowerCase().includes(t) ||
      p.productCategory.toLowerCase().includes(t) ||
      p.productSKU.toLowerCase().includes(t)
    );
  }

  compareAvailabilityToMinimum(product: Product): string {
    if (!product.productMinimum) return 'Optimal';
    const pct = (product.productAvailability / product.productMinimum) * 100;
    if (pct <= 15)  return 'Critical';
    if (pct <= 30)  return 'Very Low';
    if (pct <= 50)  return 'Low';
    if (pct <= 80)  return 'Good';
    if (pct <= 100) return 'Optimal';
    return 'Overstock';
  }

  getAvailabilityPercentage(product: Product): number {
    if (!product.productMinimum) return 100;
    return Math.min((product.productAvailability / product.productMinimum) * 100, 100);
  }

  getLightColor(color: string): string {
    return color.replace('hsl', 'hsla').replace(')', ', 0.15)');
  }

  get inStockCount()   { return this.products.filter(p => ['Optimal','Good','Overstock'].includes(this.compareAvailabilityToMinimum(p))).length; }
  get lowStockCount()  { return this.products.filter(p => ['Low','Very Low'].includes(this.compareAvailabilityToMinimum(p))).length; }
  get criticalCount()  { return this.products.filter(p => this.compareAvailabilityToMinimum(p) === 'Critical').length; }
}