import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Added for the modals [(ngModel)]
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { EMPTY, Subscription, catchError, interval, startWith, switchMap } from 'rxjs';

interface DashboardData {
  totalOrders:    number;
  totalProducts:  number;
  lowStockCount:  number;
  lateCount:      number;
  lowStockItems:  { productName: string; current: number; min: number }[];
  lateDeliveries: { days: number; name: string; supplier: string; order: string }[];
  monthlyOrders:  { month: string; count: number }[];
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule], 
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {

  // ==================== DASHBOARD DATA ====================
  data: DashboardData | null = null;

  months: string[] = [];
  chartValues: number[] = [];
  scaleSteps: number[] =[];

  stockTrend: number[] = [];
  weekDays   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  stockScaleSteps: number[] =[];
  private readonly dashboardRefreshMs = 5000;
  private dashboardSubscription?: Subscription;

  // ==================== MODAL STATES ====================
  isCreateModalOpen = false;
  isJoinModalOpen = false;
  joinTab: 'code' | 'link' = 'code';

  createForm = {
    name: '',
    industry: '',
    description: '',
    visibility: 'private'
  };

  joinForm = {
    code: '',
    link: ''
  };

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.startLiveDashboard();
  }

  ngOnDestroy() {
    this.dashboardSubscription?.unsubscribe();
  }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  private startLiveDashboard() {
    this.dashboardSubscription = interval(this.dashboardRefreshMs)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.http.get<DashboardData>('http://localhost:5090/api/dashboard', { headers: this.getHeaders() })
            .pipe(catchError((err) => {
              console.error('Dashboard error:', err);
              return EMPTY;
            }))
        )
      )
      .subscribe({
        next: (d) => this.updateDashboard(d)
      });
  }

  private updateDashboard(d: DashboardData) {
    this.data = d;

    // bar chart
    this.months      = d.monthlyOrders.map(m => m.month);
    this.chartValues = d.monthlyOrders.map(m => m.count);
    const maxVal     = Math.max(...this.chartValues, 1);
    const roundedMax = Math.ceil(maxVal / 10) * 10;
    const step       = roundedMax / 5;
    this.scaleSteps  = Array.from({ length: 6 }, (_, i) => Math.round(i * step));

    this.updateStockTrend(d.totalProducts);

    // stock scale
    const stockMax       = Math.max(...this.stockTrend, 1);
    const stockRounded   = Math.ceil(stockMax / 150) * 150;
    const stockStep      = stockRounded / 4;
    this.stockScaleSteps = Array.from({ length: 5 }, (_, i) => Math.round(i * stockStep));

    this.cdr.detectChanges();
  }

  private updateStockTrend(totalProducts: number) {
    if (this.stockTrend.length === 0) {
      this.stockTrend = Array(7).fill(totalProducts);
      return;
    }

    this.stockTrend = [...this.stockTrend.slice(-6), totalProducts];
  }

  get stockScaleStepsReversed() { return [...this.stockScaleSteps].reverse(); }

  getLinePoints(values: number[], max: number, width: number, height: number): string {
    if (values.length === 0) return '';
    if (values.length === 1) return `0,${height - (values[0] / Math.max(max, 1)) * height}`;

    const safeMax = Math.max(max, 1);
    return values.map((v, i) => `${(i / (values.length - 1)) * width},${height - (v / safeMax) * height}`).join(' ');
  }

  getAreaPoints(values: number[], max: number, width: number, height: number): string {
    if (values.length === 0) return '';

    const safeMax = Math.max(max, 1);
    const pts = values.length === 1
      ? [`0,${height - (values[0] / safeMax) * height}`]
      : values.map((v, i) => `${(i / (values.length - 1)) * width},${height - (v / safeMax) * height}`);

    return [`0,${height}`, ...pts, `${width},${height}`].join(' ');
  }

  getLowStockPercent(current: number, min: number): number {
    return Math.min((current / min) * 100, 100);
  }

  // ==================== MODAL ACTIONS ====================
  closeModals() {
    this.isCreateModalOpen = false;
    this.isJoinModalOpen = false;
  }

  createChain() {
    console.log('Creating chain...', this.createForm);
    this.closeModals();
  }

  joinChain() {
    console.log('Joining chain...', this.joinForm);
    this.closeModals();
  }
}
