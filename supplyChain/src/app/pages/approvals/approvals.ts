import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-approvals',
  imports: [CommonModule],
  templateUrl: './approvals.html',
  styleUrl: './approvals.css',
})
export class Approvals {
  approvals = [
    {
      id: 'PR-001',
      title: 'Тонер HP 26A',
      status: 'Чакаща',
      description: 'Свършващи наличности — остават 3 бр.',
      quantity: 50,
      user: 'Иван Петров',
      date: '14.03.2026',
      confidence: 95,
      aiText: 'Препоръчвам одобрение...',
      supplier: 'TechParts BG',
      price: 625
    },
    {
      id: 'PR-004',
      title: 'Батерии AA',
      status: 'Чакаща',
      description: 'Нисък склад — останали 8 кутии',
      quantity: 60,
      user: 'Мария Иванова',
      date: '15.03.2026',
      confidence: 72,
      aiText: 'Одобрение с резерва...',
      supplier: 'BG Office Pro',
      price: 180
    }
  ];

  approve(item: any) {
    console.log('Approved:', item);
  }

  reject(item: any) {
    console.log('Rejected:', item);
  }
}
