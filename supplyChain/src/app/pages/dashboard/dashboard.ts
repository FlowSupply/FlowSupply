import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard implements OnInit {

  chartValues = [80, 70, 20, 50, 10, 90];
  months: string[] = [];
  maxValue = 0;
  scaleSteps: number[] = [];

  stockTrend = [435, 330, 437, 325, 318, 325, 320];
  weekDays: string[] = [];
  stockScaleSteps: number[] = [];

  isCreateModalOpen = false;
  isJoinModalOpen = false;
  joinTab: 'code' | 'link' = 'code';
  createForm = { name: '', industry: '', description: '', visibility: 'private' };
  joinForm = { code: '', link: '' };

  lowStockItems = [
    { name: 'USB Cables (Type-C)', current: 12, min: 50 },
    { name: 'HP Toner 26A',        current: 3,  min: 20 },
    { name: 'AA Batteries (box)',  current: 8,  min: 30 },
    { name: 'A4 Paper (pack)',     current: 15, min: 100 },
  ];

  lateDeliveries = [
    { days: 3, name: 'SSD disks',     supplier: 'TechParts BG', order: '#ORD-2041' },
    { days: 5, name: 'Printer heads', supplier: 'OfficeMax',    order: '#ORD-2038' },
    { days: 2, name: 'Cable connections',  supplier: 'ElektroSupply',order: '#ORD-2035' },
  ];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.months = this.getLastSixMonths();
    this.maxValue = Math.max(...this.chartValues);
    const roundedMax = Math.ceil(this.maxValue / 50) * 50;
    const step = roundedMax / 5;
    this.scaleSteps = Array.from({ length: 6 }, (_, i) => Math.round(i * step));

    this.weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const stockMax = Math.max(...this.stockTrend);
    const stockRoundedMax = Math.ceil(stockMax / 150) * 150;
    const stockStep = stockRoundedMax / 4;
    this.stockScaleSteps = Array.from({ length: 5 }, (_, i) => Math.round(i * stockStep));
  }

  getLastSixMonths(): string[] {
    const result: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push(d.toLocaleString('default', { month: 'long' }));
    }
    return result;
  }


  getLastSevenDays(): string[] {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result: string[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      result.push(days[d.getDay()]);
    }
    return result;
  }

getLinePoints(values: number[], max: number, width: number, height: number): string {
    return values.map((v, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - (v / max) * height;
        return `${x},${y}`;
    }).join(' ');
}

getAreaPoints(values: number[], max: number, width: number, height: number): string {
    const linePoints = values.map((v, i) => {
        const x = (i / (values.length - 1)) * width;
        const y = height - (v / max) * height;
        return `${x},${y}`;
    });
    return [`0,${height}`, ...linePoints, `${width},${height}`].join(' ');
}

  get stockScaleStepsReversed(): number[] {
    return [...this.stockScaleSteps].reverse();
  }

  getLowStockPercent(current: number, min: number): number {
    return Math.min((current / min) * 100, 100);
  }

  openCreateModal() { 
    console.log('openCreateModal called');
    this.isCreateModalOpen = true; 
  }
  openJoinModal() { 
    console.log('openJoinModal called');
    this.isJoinModalOpen = true; 
  }
  closeModals()     { this.isCreateModalOpen = false; this.isJoinModalOpen = false; }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  createChain() {
    if (!this.createForm.name.trim()) {
      alert('Chain name is required');
      return;
    }

    const payload = {
      name: this.createForm.name,
      industry: this.createForm.industry,
      description: this.createForm.description,
      visibility: this.createForm.visibility
    };

    this.http.post('http://localhost:5090/api/chains', payload, { headers: this.getHeaders() })
      .subscribe({
        next: (response) => {
          alert('Supply chain created successfully!');
          localStorage.setItem('supplyChain', JSON.stringify(response));
          this.createForm = { name: '', industry: '', description: '', visibility: 'private' };
          this.closeModals();
        },
        error: (err) => {
          console.error('Error creating chain:', err);
          alert('Failed to create supply chain. Please try again.');
        }
      });
  }

  joinChain() {
    const code = this.joinTab === 'code' ? this.joinForm.code : this.joinForm.link;
    if (!code.trim()) {
      alert('Please enter an invite code or link');
      return;
    }

    const payload = {
      [this.joinTab === 'code' ? 'code' : 'link']: code
    };

    this.http.post('http://localhost:5090/api/chains/join', payload, { headers: this.getHeaders() })
      .subscribe({
        next: (response) => {
          alert('Successfully joined supply chain!');
          localStorage.setItem('supplyChain', JSON.stringify(response));
          this.joinForm = { code: '', link: '' };
          this.closeModals();
        },
        error: (err) => {
          console.error('Error joining chain:', err);
          alert('Failed to join supply chain. Please check your code and try again.');
        }
      });
  }
}