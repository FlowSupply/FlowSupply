import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-orders',
  imports: [CommonModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders {
  orders = [
    {
      id: 'ORD-2045',
      title: 'Тонер HP 26A',
      supplier: 'TechParts BG',
      quantity: 50,
      date: '16.03.2026',
      status: 'pending',
      statusLabel: 'Чакаща',
      steps: [
        { label: 'Order created', date: '16.03.2026', done: true },
        { label: 'Confirmed by supplier', date: null, done: false },
        { label: 'Shipped', date: null, done: false },
        { label: 'Delivered', date: null, done: false }
      ]
    },
    {
      id: 'ORD-2044',
      title: 'Хартия A4 (200 пакета)',
      supplier: 'BG Office Pro',
      quantity: 200,
      date: '13.03.2026',
      status: 'shipped',
      statusLabel: 'Изпратена',
      steps: [
        { label: 'Order created', date: '13.03.2026', done: true },
        { label: 'Confirmed by supplier', date: '13.03.2026', done: true },
        { label: 'Shipped', date: '15.03.2026', done: true },
        { label: 'Delivered', date: null, done: false }
      ]
    }
  ];
}
