import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

export type RequestStatus = 'Pending' | 'Approved' | 'Rejected';
export type RequestPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface PurchaseRequest {
  requestId: string;
  productName: string;
  quantity: number;
  reason: string;
  priority: RequestPriority;
  date: string;
  status: RequestStatus;
}

@Component({
  selector: 'app-requests',
  imports: [CommonModule, FormsModule],
  templateUrl: './requests.html',
  styleUrl: './requests.css',
})
export class Requests implements OnInit {

  isModalOpen = false;
  requests: PurchaseRequest[] = [];

  newRequest = {
    productName: '',
    quantity: 1,
    reason: '',
    priority: 'Medium' as RequestPriority
  };

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadRequests();
  }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
  }

  loadRequests() {
    this.http.get<PurchaseRequest[]>('http://localhost:5090/api/requests', { headers: this.getHeaders() })
      .subscribe({
        next: (data) => {
          this.requests = data;
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error loading requests:', err)
      });
  }

  submitRequest() {
    const { productName, quantity, reason, priority } = this.newRequest;
    if (!productName || quantity < 1) return;

    const body = { productName, quantity, reason, priority };

    this.http.post<PurchaseRequest>('http://localhost:5090/api/requests', body, { headers: this.getHeaders() })
      .subscribe({
        next: (created) => {
          this.requests.push(created);
          this.cdr.detectChanges();
          this.closeCreateRequestModal();
          this.resetForm();
        },
        error: (err) => {
          console.error('Error creating request:', err);
          alert('Failed to submit request.');
        }
      });
  }

  openCreateRequestModal() { this.isModalOpen = true; }

  closeCreateRequestModal() {
    this.isModalOpen = false;
    this.resetForm();
  }

  private resetForm() {
    this.newRequest = { productName: '', quantity: 1, reason: '', priority: 'Medium' };
  }

  get totalCount()    { return this.requests.length; }
  get pendingCount()  { return this.requests.filter(r => r.status === 'Pending').length; }
  get approvedCount() { return this.requests.filter(r => r.status === 'Approved').length; }
}