import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';

interface TimelineStep {
  label: string;
  date: string | null;
  done: boolean;
  cancelled?: boolean;
}

export interface Order {
  orderId: string;
  productName: string;
  quantity: number;
  supplierName: string;
  status: OrderStatus;
  createdAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
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
  showHistoryPanel = false;
  showFilterModal = false;
  filters = {
    status: '' as OrderStatus | ''
  };
  activeFilters = {
    status: '' as OrderStatus | ''
  };
  readonly statusOptions: OrderStatus[] = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

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
    const nextStatus = order.status === 'Pending'
      ? 'Confirmed'
      : order.status === 'Confirmed'
        ? 'Shipped'
        : 'Delivered';

    this.changeStatus(order, nextStatus);
  }

  changeStatus(order: Order, status: OrderStatus) {
    this.http.patch<Order>(
      `http://localhost:5090/api/orders/${order.orderId}/status`,
      { status },
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
    let filtered = this.orders;

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.productName.toLowerCase().includes(term) ||
        o.supplierName.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (this.activeFilters.status) {
      filtered = filtered.filter(o => o.status === this.activeFilters.status);
    }

    return filtered;
  }

  get activeOrders() {
    return this.filteredOrders.filter(o => o.status !== 'Delivered');
  }

  get historyOrders() {
    return this.orders
      .filter(o => o.status === 'Delivered' || o.status === 'Cancelled')
      .sort((a, b) => this.getHistoryTimestamp(b) - this.getHistoryTimestamp(a));
  }

  getSteps(order: Order): TimelineStep[] {
    const steps: TimelineStep[] = [
      { label: 'Order created', date: order.createdAt, done: true },
      {
        label: 'Confirmed by supplier',
        date: order.confirmedAt,
        done: !!order.confirmedAt || !!order.shippedAt || !!order.deliveredAt ||
          order.status === 'Confirmed' || order.status === 'Shipped' || order.status === 'Delivered'
      },
      {
        label: 'Shipped',
        date: order.shippedAt,
        done: !!order.shippedAt || order.status === 'Shipped' || order.status === 'Delivered'
      },
      {
        label: 'Delivered',
        date: order.deliveredAt,
        done: !!order.deliveredAt || order.status === 'Delivered'
      }
    ];

    if (order.status !== 'Cancelled') {
      return steps;
    }

    const lastDoneIndex = steps.reduce((lastIndex, step, index) => step.done ? index : lastIndex, 0);
    const cancelledStep: TimelineStep = {
      label: 'Cancelled',
      date: order.cancelledAt,
      done: true,
      cancelled: true
    };

    return [
      ...steps.slice(0, lastDoneIndex + 1),
      cancelledStep,
      ...steps.slice(lastDoneIndex + 1)
    ];
  }

  canAdvance(order: Order) {
    return order.status !== 'Delivered' && order.status !== 'Cancelled';
  }

  getStatusLabel(status: OrderStatus): string {
    return status;
  }

  getHistoryDate(order: Order): string | null {
    return order.status === 'Cancelled' ? order.cancelledAt : order.deliveredAt;
  }

  toggleHistoryPanel() {
    this.showHistoryPanel = !this.showHistoryPanel;
    this.cdr.detectChanges();
  }

  private getHistoryTimestamp(order: Order): number {
    const date = this.getHistoryDate(order);
    return date ? new Date(date).getTime() : 0;
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB');
  }

  openFilterModal() {
    this.showFilterModal = true;
    this.cdr.detectChanges();
  }

  closeFilterModal() {
    this.showFilterModal = false;
    this.cdr.detectChanges();
  }

  applyFilters() {
    this.activeFilters = {
      status: this.filters.status
    };
    this.closeFilterModal();
  }

  clearFilters() {
    this.filters = {
      status: ''
    };
    this.activeFilters = {
      status: ''
    };
    this.cdr.detectChanges();
  }
}
