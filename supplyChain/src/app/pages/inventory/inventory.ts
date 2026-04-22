import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

type ProductStatus = 'Out of Stock' | 'Critical' | 'Very Low' | 'Low' | 'Good' | 'Optimal' | 'Overstock';

interface InventoryProduct {
  productId: number;
  productName: string;
  productSCU: string;
  productCategory: string;
  productAvailability: number;
  productMinimum: number;
  productStatus: ProductStatus;
  supplierContactPerson: string;
  supplierContactEmail: string;
  supplierContactPhone: string;
  supplierAddress: string;
  lastConsumption?: number;
}

interface ApiInventoryItem {
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
export class Inventory implements OnInit, OnDestroy {
  private readonly refreshIntervalMs = 1500;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private highlightTimer?: ReturnType<typeof setTimeout>;
  private readonly apiUrl = 'http://localhost:5090/api/products';
  private recentlyChangedProductIds = new Set<number>();
  private hasLoadedBackendInventory = false;
  lastUpdatedAt = '';
  latestStockChange = '';
  apiErrorMessage = '';

  products: InventoryProduct[] = [
    {productId: 1, productName: 'USB Cables Type-C', productSCU: 'USB-C-001', productCategory: 'Electronics', productAvailability: 62, productMinimum: 20, productStatus: 'Optimal', supplierContactPerson: 'John Doe', supplierContactEmail: 'jD0eI@example.com', supplierContactPhone: '123-456-7890', supplierAddress: '123 Main St, City, Country'},
    {productId: 2, productName: 'HP Toner 26A', productSCU: 'TON-26A', productCategory: 'Office Supplies', productAvailability: 60, productMinimum: 50, productStatus: 'Optimal', supplierContactPerson: 'John Doe1', supplierContactEmail: 'jD0eI@example.com1', supplierContactPhone: '123-456-7891', supplierAddress: '124 Main St, City, Country'},
    {productId: 3, productName: 'A4 Paper Pack', productSCU: 'PPR-A4', productCategory: 'Office Supplies', productAvailability: 45, productMinimum: 50, productStatus: 'Good', supplierContactPerson: 'John Doe1', supplierContactEmail: 'jD0eI@example.com1', supplierContactPhone: '123-456-7891', supplierAddress: '124 Main St, City, Country'},
    {productId: 4, productName: 'SSD Disks 1TB', productSCU: 'SSD-1TB', productCategory: 'Hardware', productAvailability: 40, productMinimum: 50, productStatus: 'Good', supplierContactPerson: 'John Doe1', supplierContactEmail: 'jD0eI@example.com1', supplierContactPhone: '123-456-7891', supplierAddress: '124 Main St, City, Country'},
    {productId: 5, productName: 'AA Batteries Box', productSCU: 'BAT-AA', productCategory: 'Office Supplies', productAvailability: 25, productMinimum: 50, productStatus: 'Low', supplierContactPerson: 'John Doe1', supplierContactEmail: 'jD0eI@example.com1', supplierContactPhone: '123-456-7891', supplierAddress: '124 Main St, City, Country'},
    {productId: 6, productName: 'Printer Heads', productSCU: 'PRN-HEAD', productCategory: 'Hardware', productAvailability: 15, productMinimum: 50, productStatus: 'Very Low', supplierContactPerson: 'John Doe1', supplierContactEmail: 'jD0eI@example.com1', supplierContactPhone: '123-456-7891', supplierAddress: '124 Main St, City, Country'}
  ]

  statusColors: Record<ProductStatus, string> = {
    'Out of Stock': 'hsl(0, 0%, 25%)',
    Critical: 'hsl(0, 72%, 51%)',      // red
    'Very Low': 'hsl(29, 85%, 55%)',   // orange-red
    Low: 'hsl(55, 73%, 50%)',         // orange
    Good: 'hsl(152, 85%, 43%)',        // light-green
    Optimal: 'hsl(152, 90%, 27%)',    // green
    Overstock: 'hsl(217 91% 60%)'   // blue
  };

  newSupplier: any = {
  productName: '',
  productSCU: '',
  productCategory: '',
  productAvailability: 0,
  productMinimum: 1,
  supplierContactPerson: '',
  supplierContactEmail: '',
  supplierContactPhone: '',
  supplierAddress: ''
};

  selectedSupplier: any = null;

  constructor(
    private http: HttpClient,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.products.forEach((product) => this.compareAvailabilityToMinimum(product));
    this.loadInventory();
    this.refreshTimer = setInterval(() => this.loadInventory(), this.refreshIntervalMs);
  }

  ngOnDestroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    if (this.highlightTimer) {
      clearTimeout(this.highlightTimer);
    }
  }

  addSupplier() {
    const supplierToAdd: InventoryProduct = {
      productId: this.products.length + 1,
      productName: this.newSupplier.productName || 'New Product',
      productSCU: this.newSupplier.productSCU || 'SKU',
      productCategory: this.newSupplier.productCategory || 'General',
      productAvailability: Number(this.newSupplier.productAvailability) || 0,
      productMinimum: Number(this.newSupplier.productMinimum) || 1,
      productStatus: 'Critical',
      supplierContactPerson: this.newSupplier.supplierContactPerson || '',
      supplierContactEmail: this.newSupplier.supplierContactEmail || '',
      supplierContactPhone: this.newSupplier.supplierContactPhone || '',
      supplierAddress: this.newSupplier.supplierAddress || ''
  };

  this.compareAvailabilityToMinimum(supplierToAdd);
  this.products.push(supplierToAdd);

  this.selectedSupplier = supplierToAdd;

  this.newSupplier = {
    productName: '',
    productSCU: '',
    productCategory: '',
    productAvailability: 0,
    productMinimum: 1,
    supplierContactPerson: '',
    supplierContactEmail: '',
    supplierContactPhone: '',
    supplierAddress: ''
  };
  }

  compareAvailabilityToMinimum(product: InventoryProduct): ProductStatus {
    if (product.productAvailability <= 0) {
      return product.productStatus = 'Out of Stock';
    }

    let availabilityPercentage = (product.productAvailability / product.productMinimum) * 100;

    if (availabilityPercentage <= 15) {
      return product.productStatus = 'Critical';
    } else if (availabilityPercentage <= 30) {
      return product.productStatus = 'Very Low';
    } else if (availabilityPercentage <= 50) {
      return product.productStatus = 'Low';
    } else if (availabilityPercentage <= 80) {
      return product.productStatus = 'Good';
    } else if (availabilityPercentage <= 100) {
      return product.productStatus = 'Optimal';
    } else {
      return product.productStatus = 'Overstock';
    }
  }

  getLightColor(color: string) {
    return color.replace('hsl', 'hsla').replace(')', ' , 0.2)');
  }

  getAvailabilityPercentage(product: InventoryProduct) {
      if (!product.productMinimum) return 0;
      return Math.min((product.productAvailability / product.productMinimum) * 100, 100);
    }

  isRecentlyChanged(product: InventoryProduct): boolean {
    return this.recentlyChangedProductIds.has(product.productId);
  }

  get lowStockCount(): number {
    return this.products.filter(p => this.compareAvailabilityToMinimum(p) === 'Low' || this.compareAvailabilityToMinimum(p) === 'Very Low').length;
  }

  get criticalCount(): number {
    return this.products.filter(p => ['Out of Stock', 'Critical'].includes(this.compareAvailabilityToMinimum(p))).length;
  }

  get inStockCount(): number {
    return this.products.filter(p => 
      ['Optimal', 'Good', 'Overstock'].includes(this.compareAvailabilityToMinimum(p))
    ).length;
  }

  private loadInventory() {
    this.http.get<ApiInventoryItem[]>(this.apiUrl, { headers: this.getHeaders() }).subscribe({
      next: (items) => {
        const shouldCompareStockChanges = this.hasLoadedBackendInventory;
        const previousQuantities = shouldCompareStockChanges
          ? new Map(this.products.map((product) => [product.productId, product.productAvailability]))
          : new Map<number, number>();
        const changedProductIds = new Set<number>();

        this.products = items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productSCU: item.productSKU,
          productCategory: item.productCategory,
          productAvailability: item.productAvailability,
          productMinimum: item.productMinimum,
          productStatus: this.getProductStatus(item.productAvailability, item.productMinimum),
          supplierContactPerson: '',
          supplierContactEmail: '',
          supplierContactPhone: '',
          supplierAddress: '',
          lastConsumption: shouldCompareStockChanges
            ? this.getLastConsumption(item, previousQuantities)
            : undefined
        }));

        if (shouldCompareStockChanges) {
          for (const product of this.products) {
            const previousQuantity = previousQuantities.get(product.productId);
            if (previousQuantity !== undefined && previousQuantity !== product.productAvailability) {
              changedProductIds.add(product.productId);
            }
          }
        }

        this.recentlyChangedProductIds = changedProductIds;
        this.hasLoadedBackendInventory = true;
        this.lastUpdatedAt = new Date().toLocaleTimeString('bg-BG');
        this.apiErrorMessage = '';
        this.latestStockChange = '';

        if (changedProductIds.size > 0) {
          const changedProducts = this.products.filter((product) => changedProductIds.has(product.productId));
          this.latestStockChange = changedProducts
            .map((product) => `${product.productName} -${product.lastConsumption ?? 1}`)
            .join(', ');

          if (this.highlightTimer) {
            clearTimeout(this.highlightTimer);
          }

          this.highlightTimer = setTimeout(() => {
            this.recentlyChangedProductIds = new Set<number>();
            this.changeDetectorRef.detectChanges();
          }, 5000);
        }

        this.changeDetectorRef.detectChanges();
      },
      error: () => {
        this.apiErrorMessage = 'Backend inventory API is not reachable. Showing local demo data.';
        this.changeDetectorRef.detectChanges();
      }
    });
  }

  private getLastConsumption(item: ApiInventoryItem, previousQuantities: Map<number, number>): number | undefined {
    const previousQuantity = previousQuantities.get(item.productId);
    if (previousQuantity !== undefined && previousQuantity > item.productAvailability) {
      return previousQuantity - item.productAvailability;
    }

    return undefined;
  }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private getProductStatus(availability: number, minimum: number): ProductStatus {
    const product = {
      productAvailability: availability,
      productMinimum: minimum,
      productStatus: 'Optimal' as ProductStatus
    } as InventoryProduct;

    return this.compareAvailabilityToMinimum(product);
  }
}
