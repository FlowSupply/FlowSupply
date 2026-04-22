import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';

export interface PurchaseRequest {
  requestId: string;
  productName: string;
  quantity: number;
  reason: string;
  priority: string;
  date: string;
  status: string;
}

@Component({
  selector: 'app-approvals',
  imports: [CommonModule],
  templateUrl: './approvals.html',
  styleUrl: './approvals.css',
})
export class Approvals implements OnInit {
  approvals: PurchaseRequest[] = [];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.loadPending(); }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  loadPending() {
    this.http.get<PurchaseRequest[]>('http://localhost:5090/api/requests', { headers: this.getHeaders() })
      .subscribe({
        next: (data) => {
          this.approvals = data.filter(r => r.status === 'Pending');
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

  private updateStatus(item: PurchaseRequest, status: string) {
    this.http.patch(
      `http://localhost:5090/api/requests/${item.requestId}/status`,
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
}