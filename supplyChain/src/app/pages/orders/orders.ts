import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

interface OrderStep {
  label: string;
  date: string | null;
  status: OrderStatus;
  done: boolean;
}

interface ShoppingOrder {
  id: string;
  title: string;
  supplier: string;
  quantity: number;
  date: string;
  status: OrderStatus;
  statusLabel: string;
  steps: OrderStep[];
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Чакаща',
  confirmed: 'Потвърдена',
  shipped: 'Изпратена',
  delivered: 'Доставена',
  cancelled: 'Отказана'
};

const ACTIVE_STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'shipped', 'delivered'];

@Component({
  selector: 'app-orders',
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders {
  readonly statusOptions: OrderStatus[] = [...ACTIVE_STATUS_FLOW, 'cancelled'];

  orders: ShoppingOrder[] = [
    {
      id: 'ORD-2045',
      title: 'Тонер HP 26A',
      supplier: 'TechParts BG',
      quantity: 50,
      date: '16.03.2026',
      status: 'pending',
      statusLabel: STATUS_LABELS.pending,
      steps: [
        { label: 'Order created', date: '16.03.2026', status: 'pending', done: true },
        { label: 'Confirmed by supplier', date: null, status: 'confirmed', done: false },
        { label: 'Shipped', date: null, status: 'shipped', done: false },
        { label: 'Delivered', date: null, status: 'delivered', done: false }
      ]
    },
    {
      id: 'ORD-2044',
      title: 'Хартия A4 (200 пакета)',
      supplier: 'BG Office Pro',
      quantity: 200,
      date: '13.03.2026',
      status: 'shipped',
      statusLabel: STATUS_LABELS.shipped,
      steps: [
        { label: 'Order created', date: '13.03.2026', status: 'pending', done: true },
        { label: 'Confirmed by supplier', date: '13.03.2026', status: 'confirmed', done: true },
        { label: 'Shipped', date: '15.03.2026', status: 'shipped', done: true },
        { label: 'Delivered', date: null, status: 'delivered', done: false }
      ]
    },
    {
      id: 'ORD-2046',
      title: 'USB-C кабели',
      supplier: 'ElektroSupply',
      quantity: 120,
      date: '18.03.2026',
      status: 'confirmed',
      statusLabel: STATUS_LABELS.confirmed,
      steps: [
        { label: 'Order created', date: '18.03.2026', status: 'pending', done: true },
        { label: 'Confirmed by supplier', date: '18.03.2026', status: 'confirmed', done: true },
        { label: 'Shipped', date: null, status: 'shipped', done: false },
        { label: 'Delivered', date: null, status: 'delivered', done: false }
      ]
    }
  ];

  changeStatus(order: ShoppingOrder, status: OrderStatus) {
    order.status = status;
    order.statusLabel = STATUS_LABELS[status];

    if (status === 'cancelled') {
      order.steps = order.steps.map((step) => ({ ...step, done: false }));
      return;
    }

    const activeStatusIndex = ACTIVE_STATUS_FLOW.indexOf(status);
    order.steps = order.steps.map((step) => {
      const stepIndex = ACTIVE_STATUS_FLOW.indexOf(step.status);
      const done = stepIndex <= activeStatusIndex;

      return {
        ...step,
        done,
        date: done ? step.date ?? this.today() : null
      };
    });
  }

  moveToNextStatus(order: ShoppingOrder) {
    if (order.status === 'cancelled' || order.status === 'delivered') {
      return;
    }

    const currentIndex = ACTIVE_STATUS_FLOW.indexOf(order.status);
    this.changeStatus(order, ACTIVE_STATUS_FLOW[currentIndex + 1]);
  }

  getStatusLabel(status: OrderStatus): string {
    return STATUS_LABELS[status];
  }

  private today(): string {
    return new Date().toLocaleDateString('bg-BG');
  }
}
