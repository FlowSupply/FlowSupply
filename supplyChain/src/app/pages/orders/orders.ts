import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

export interface Order {
  orderId: string;
  productName: string;
  quantity: number;
  supplierName: string;
  status: string;
  createdAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  requestId: string;
}

@Component({
  selector: 'app-orders',
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders implements OnInit {
  orders: Order[] = [];
  searchTerm = '';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.loadOrders(); }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  loadOrders() {
    this.http.get<Order[]>('http://localhost:5090/api/orders', { headers: this.getHeaders() })
      .subscribe({
        next: (data) => {
          this.orders = data;
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error loading orders:', err)
      });
  }

  advanceStatus(order: Order) {
    if (order.status === 'Delivered') return;
    this.http.patch(
      `http://localhost:5090/api/orders/${order.orderId}/advance`,
      {},
      { headers: this.getHeaders() }
    ).subscribe({
      next: (updated: any) => {
        const i = this.orders.findIndex(o => o.orderId === order.orderId);
        if (i !== -1) this.orders[i] = updated;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error advancing order:', err)
    });
  }

  get filteredOrders() {
    if (!this.searchTerm) return this.orders;
    const term = this.searchTerm.toLowerCase();
    return this.orders.filter(o =>
      o.productName.toLowerCase().includes(term) ||
      o.supplierName.toLowerCase().includes(term)
    );
  }

  // Build timeline steps from order data
  getSteps(order: Order) {
    return [
      { label: 'Order created',          date: order.createdAt,   done: true },
      { label: 'Confirmed by supplier',  date: order.shippedAt,   done: order.status === 'Shipped' || order.status === 'Delivered' },
      { label: 'Shipped',                date: order.shippedAt,   done: order.status === 'Shipped' || order.status === 'Delivered' },
      { label: 'Delivered',              date: order.deliveredAt, done: order.status === 'Delivered' }
    ];
  }

  canAdvance(order: Order) {
    return order.status !== 'Delivered';
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB');
  }
}