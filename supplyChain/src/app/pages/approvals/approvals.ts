import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, forkJoin, of } from 'rxjs';
import { apiUrl } from '../../services/api.config';

export interface PurchaseRequest {
  requestId: string;
  productName: string;
  quantity: number;
  reason: string;
  priority: string;
  date: string;
  status: string;
}

interface Supplier {
  supplierId: number;
  supplierName: string;
  supplierCategory: string;
  supplierRating: string;
  supplierSupplies: string;
  supplierAvrLatency: number;
  supplierStatus: string;
}

interface Order {
  orderId: string;
  productName: string;
  quantity: number;
  supplierName: string;
  status: string;
  createdAt: string;
}

interface AiAnalysis {
  recommendation: 'approve' | 'reject' | 'review';
  confidence: 'high' | 'medium' | 'low';
  summary: string;
  suggestedSupplier: string;
  estimatedPrice: number | null;
  currency: string;
  riskLevel: 'low' | 'medium' | 'high';
  reason: string;
}

type AiAnalysisState =
  | { status: 'loading' }
  | { status: 'ready'; data: AiAnalysis }
  | { status: 'error'; message: string };

const AI_ANALYSIS_WEBHOOK_URL = 'http://localhost:5678/webhook/ai-analyze';
const AI_ANALYSIS_CACHE_PREFIX = 'flowsupply-ai-analysis:';

const AI_EXPECTED_OUTPUT: AiAnalysis = {
  recommendation: 'review',
  confidence: 'medium',
  summary: 'Request looks reasonable but needs supplier and price validation.',
  suggestedSupplier: 'TBD',
  estimatedPrice: null,
  currency: 'USD',
  riskLevel: 'medium',
  reason: 'There is not enough supplier or pricing context to auto-approve confidently.'
};

@Component({
  selector: 'app-approvals',
  imports: [CommonModule],
  templateUrl: './approvals.html',
  styleUrl: './approvals.css',
})
export class Approvals implements OnInit {
  approvals: PurchaseRequest[] = [];
  aiAnalyses: Record<string, AiAnalysisState> = {};
  private suppliers: Supplier[] = [];
  private recentOrders: Order[] = [];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.loadPending(); }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  loadPending() {
    const headers = this.getHeaders();

    forkJoin({
      requests: this.http.get<PurchaseRequest[]>(apiUrl('requests'), { headers }),
      suppliers: this.http.get<Supplier[]>(apiUrl('suppliers'), { headers }).pipe(catchError(() => of([]))),
      orders: this.http.get<Order[]>(apiUrl('orders'), { headers }).pipe(catchError(() => of([])))
    })
      .subscribe({
        next: ({ requests, suppliers, orders }) => {
          this.suppliers = suppliers;
          this.recentOrders = orders.slice(0, 25);
          this.approvals = requests.filter(r => r.status === 'Pending');
          this.approvals.forEach(item => this.loadAiAnalysis(item));
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error loading requests:', err)
      });
  }

  approve(item: PurchaseRequest) {
    this.updateStatus(item, 'Approved');
  }

  reject(item: PurchaseRequest) {
    this.updateStatus(item, 'Rejected');
  }

  getAiAnalysis(requestId: string): AiAnalysis | null {
    const state = this.aiAnalyses[requestId];
    return state?.status === 'ready' ? state.data : null;
  }

  getAiStatus(requestId: string): AiAnalysisState['status'] | 'idle' {
    return this.aiAnalyses[requestId]?.status ?? 'idle';
  }

  getAiMessage(requestId: string): string {
    const state = this.aiAnalyses[requestId];
    return state?.status === 'error'
      ? state.message
      : 'AI analysis via n8n will appear here once connected.';
  }

  private updateStatus(item: PurchaseRequest, status: string) {
    this.http.patch(
      apiUrl(`requests/${item.requestId}/status`),
      JSON.stringify(status),
      { headers: this.getHeaders().set('Content-Type', 'application/json') }
    ).subscribe({
      next: () => {
        this.approvals = this.approvals.filter(r => r.requestId !== item.requestId);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error updating status:', err)
    });
  }

  private loadAiAnalysis(item: PurchaseRequest) {
    if (this.aiAnalyses[item.requestId]?.status === 'ready') return;

    const cachedAnalysis = this.getCachedAiAnalysis(item.requestId);
    if (cachedAnalysis) {
      this.aiAnalyses[item.requestId] = {
        status: 'ready',
        data: cachedAnalysis
      };
      return;
    }

    this.aiAnalyses[item.requestId] = { status: 'loading' };

    const payload = {
      request: {
        requestId: item.requestId,
        productName: item.productName,
        quantity: item.quantity,
        reason: item.reason,
        priority: item.priority,
        date: item.date,
        status: item.status
      },
      context: {
        suppliers: this.suppliers.map(supplier => ({
          supplierId: supplier.supplierId,
          name: supplier.supplierName,
          category: supplier.supplierCategory,
          rating: supplier.supplierRating,
          completedSupplies: supplier.supplierSupplies,
          averageLatencyDays: supplier.supplierAvrLatency,
          status: supplier.supplierStatus
        })),
        recentOrders: this.recentOrders.map(order => ({
          orderId: order.orderId,
          productName: order.productName,
          quantity: order.quantity,
          supplierName: order.supplierName,
          status: order.status,
          createdAt: order.createdAt
        }))
      }
    };

    this.http.post<unknown>(AI_ANALYSIS_WEBHOOK_URL, payload)
      .subscribe({
        next: (response) => {
          const analysis = this.normalizeAiAnalysis(response);
          this.cacheAiAnalysis(item.requestId, analysis);

          this.aiAnalyses[item.requestId] = {
            status: 'ready',
            data: analysis
          };
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading AI analysis:', err);
          this.aiAnalyses[item.requestId] = {
            status: 'error',
            message: 'AI analysis is unavailable right now.'
          };
          this.cdr.detectChanges();
        }
      });
  }

  private getCachedAiAnalysis(requestId: string): AiAnalysis | null {
    const cacheValue = localStorage.getItem(this.getAiCacheKey(requestId));
    if (!cacheValue) return null;

    try {
      return this.normalizeAiAnalysis(JSON.parse(cacheValue));
    } catch {
      localStorage.removeItem(this.getAiCacheKey(requestId));
      return null;
    }
  }

  private cacheAiAnalysis(requestId: string, analysis: AiAnalysis) {
    localStorage.setItem(this.getAiCacheKey(requestId), JSON.stringify(analysis));
  }

  private getAiCacheKey(requestId: string): string {
    return `${AI_ANALYSIS_CACHE_PREFIX}${requestId}`;
  }

  private normalizeAiAnalysis(response: unknown): AiAnalysis {
    const value = this.unwrapAiResponse(response);

    return {
      recommendation: this.pickOne(value['recommendation'], ['approve', 'reject', 'review'], AI_EXPECTED_OUTPUT.recommendation),
      confidence: this.pickOne(value['confidence'], ['high', 'medium', 'low'], AI_EXPECTED_OUTPUT.confidence),
      summary: this.pickString(value['summary'], AI_EXPECTED_OUTPUT.summary),
      suggestedSupplier: this.pickString(value['suggestedSupplier'], AI_EXPECTED_OUTPUT.suggestedSupplier),
      estimatedPrice: this.pickNumber(value['estimatedPrice']),
      currency: this.pickString(value['currency'], AI_EXPECTED_OUTPUT.currency),
      riskLevel: this.pickOne(value['riskLevel'], ['low', 'medium', 'high'], AI_EXPECTED_OUTPUT.riskLevel),
      reason: this.pickString(value['reason'], AI_EXPECTED_OUTPUT.reason)
    };
  }

  private unwrapAiResponse(response: unknown): Record<string, unknown> {
    if (Array.isArray(response)) {
      return this.unwrapAiResponse(response[0]);
    }

    const root = this.asObject(response);
    const output = root['output'];

    if (typeof output === 'string') {
      try {
        return this.unwrapAiResponse(JSON.parse(output));
      } catch {
        return root;
      }
    }

    if (Array.isArray(output) || (output && typeof output === 'object')) {
      return this.unwrapAiResponse(output);
    }

    return root;
  }

  private asObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? value as Record<string, unknown> : {};
  }

  private pickString(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  private pickNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
    return null;
  }

  private pickOne<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
    return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback;
  }
}
