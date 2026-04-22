<<<<<<< Updated upstream
import { Component } from '@angular/core';
=======
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface DashboardData {
  totalOrders:    number;
  totalProducts:  number;
  lowStockCount:  number;
  lateCount:      number;
  lowStockItems:  { productName: string; current: number; min: number }[];
  lateDeliveries: { days: number; name: string; supplier: string; order: string }[];
  monthlyOrders:  { month: string; count: number }[];
}
>>>>>>> Stashed changes

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
<<<<<<< Updated upstream
export class Dashboard {}
=======
export class Dashboard implements OnInit {

  data: DashboardData | null = null;

  // chart helpers
  months: string[] = [];
  chartValues: number[] = [];
  scaleSteps: number[] = [];

  stockTrend = [435, 330, 437, 325, 318, 325, 320]; // static placeholder — replace with real data later
  weekDays   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  stockScaleSteps: number[] = [];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.loadDashboard(); }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  loadDashboard() {
    this.http.get<DashboardData>('http://localhost:5090/api/dashboard', { headers: this.getHeaders() })
      .subscribe({
        next: (d) => {
          this.data = d;

          // bar chart
          this.months      = d.monthlyOrders.map(m => m.month);
          this.chartValues = d.monthlyOrders.map(m => m.count);
          const maxVal     = Math.max(...this.chartValues, 1);
          const roundedMax = Math.ceil(maxVal / 10) * 10;
          const step       = roundedMax / 5;
          this.scaleSteps  = Array.from({ length: 6 }, (_, i) => Math.round(i * step));

          // stock scale
          const stockMax       = Math.max(...this.stockTrend);
          const stockRounded   = Math.ceil(stockMax / 150) * 150;
          const stockStep      = stockRounded / 4;
          this.stockScaleSteps = Array.from({ length: 5 }, (_, i) => Math.round(i * stockStep));

          this.cdr.detectChanges();
        },
        error: (err) => console.error('Dashboard error:', err)
      });
  }

  get stockScaleStepsReversed() { return [...this.stockScaleSteps].reverse(); }

  getLinePoints(values: number[], max: number, width: number, height: number): string {
    return values.map((v, i) => `${(i / (values.length - 1)) * width},${height - (v / max) * height}`).join(' ');
  }

  getAreaPoints(values: number[], max: number, width: number, height: number): string {
    const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - (v / max) * height}`);
    return [`0,${height}`, ...pts, `${width},${height}`].join(' ');
  }

  getLowStockPercent(current: number, min: number): number {
    return Math.min((current / min) * 100, 100);
  }
}
>>>>>>> Stashed changes
