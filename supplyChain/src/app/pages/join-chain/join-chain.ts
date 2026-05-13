import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { apiUrl } from '../../services/api.config';

@Component({
  selector: 'app-join-chain',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="join-page">
      <div class="join-panel">
        <div *ngIf="loading" class="join-loading">Joining chain...</div>
        <div *ngIf="error" class="join-error">{{ error }}</div>
        <div *ngIf="success" class="join-success">{{ successMessage }}</div>
      </div>

      <div class="modal-overlay" *ngIf="showTransferModal">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="transfer-title">
          <div class="modal-icon">!</div>
          <h2 id="transfer-title">You are already in a chain</h2>
          <p>
            You are currently in <strong>{{ currentChainName }}</strong>.
            Do you want to leave it and join <strong>{{ targetChainName }}</strong>?
          </p>
          <p class="modal-note">
            If you continue, we will send you an email. The chain change happens only after you confirm from that email.
          </p>
          <div class="modal-actions">
            <button class="btn-secondary" type="button" (click)="cancelTransfer()" [disabled]="transferLoading">
              Stay in current chain
            </button>
            <button class="btn-primary" type="button" (click)="requestTransfer()" [disabled]="transferLoading">
              {{ transferLoading ? 'Sending...' : 'Send confirmation email' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .join-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8f5ff;
      color: #111827;
      padding: 24px;
    }

    .join-panel {
      text-align: center;
      padding: 40px;
    }

    .join-loading { color: #7c3aed; font-size: 18px; font-weight: 700; }
    .join-error { color: #ef4444; font-size: 16px; }
    .join-success { color: #16a34a; font-size: 16px; font-weight: 700; }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(17, 24, 39, 0.48);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal {
      width: min(460px, 100%);
      background: #ffffff;
      border-radius: 8px;
      padding: 28px;
      box-shadow: 0 24px 70px rgba(17, 24, 39, 0.24);
      text-align: left;
    }

    .modal-icon {
      width: 40px;
      height: 40px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      background: #fef3c7;
      color: #b45309;
      font-weight: 800;
      margin-bottom: 16px;
    }

    h2 {
      margin: 0 0 12px;
      font-size: 22px;
      line-height: 1.25;
    }

    p {
      margin: 0 0 14px;
      color: #4b5563;
      line-height: 1.55;
    }

    .modal-note {
      font-size: 14px;
      color: #6b7280;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
      flex-wrap: wrap;
    }

    button {
      border: 0;
      border-radius: 8px;
      padding: 11px 16px;
      font-weight: 700;
      cursor: pointer;
    }

    button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
    }

    .btn-primary {
      background: #7c3aed;
      color: #ffffff;
    }
  `]
})
export class JoinChain implements OnInit {
  loading = true;
  error = '';
  success = false;
  successMessage = 'Success. Redirecting...';
  showTransferModal = false;
  transferLoading = false;
  inviteToken = '';
  currentChainName = 'your current chain';
  targetChainName = 'the invited chain';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    const transferToken = this.route.snapshot.queryParamMap.get('transferToken');
    const email = this.route.snapshot.queryParamMap.get('email') || '';

    if (!token && !transferToken) {
      this.error = 'Invalid link.';
      this.loading = false;
      return;
    }

    const authToken = localStorage.getItem('token');

    if (!authToken) {
      this.router.navigate(['/login'], {
        queryParams: transferToken ? { transferToken, email } : { token, email }
      });
      return;
    }

    if (transferToken) {
      this.confirmTransfer(transferToken, authToken);
      return;
    }

    this.inviteToken = token || '';
    const headers = new HttpHeaders({ Authorization: `Bearer ${authToken}` });

    this.http.post<any>(
      apiUrl('chains/join'),
      { token },
      { headers }
    ).subscribe({
      next: (res) => {
        localStorage.setItem('supplyChainId', res.chainId);
        localStorage.setItem('supplyChainName', res.name ?? '');
        localStorage.setItem('role', res.role);
        this.success = true;
        this.loading = false;
        setTimeout(() => this.router.navigate(['/dashboard']), 1200);
      },
      error: (err) => {
        if (err.status === 409 && err.error?.code === 'ChainTransferRequired') {
          this.currentChainName = err.error.currentChainName || this.currentChainName;
          this.targetChainName = err.error.targetChainName || this.targetChainName;
          this.loading = false;
          this.showTransferModal = true;
          return;
        }

        this.error = this.getErrorMessage(err, 'Invalid or expired link.');
        this.loading = false;
      }
    });
  }

  requestTransfer() {
    const authToken = localStorage.getItem('token');
    if (!authToken || !this.inviteToken) {
      this.error = 'Invalid link.';
      this.showTransferModal = false;
      return;
    }

    this.transferLoading = true;
    const headers = new HttpHeaders({ Authorization: `Bearer ${authToken}` });
    this.http.post<any>(
      apiUrl('chains/join/transfer-request'),
      { token: this.inviteToken },
      { headers }
    ).subscribe({
      next: () => {
        this.transferLoading = false;
        this.showTransferModal = false;
        this.success = true;
        this.successMessage = 'Confirmation email sent. Open it to finish changing chains.';
      },
      error: (err) => {
        this.transferLoading = false;
        this.showTransferModal = false;
        this.error = this.getErrorMessage(err, 'Could not send confirmation email.');
      }
    });
  }

  cancelTransfer() {
    this.showTransferModal = false;
    this.router.navigate(['/dashboard']);
  }

  private confirmTransfer(transferToken: string, authToken: string) {
    const headers = new HttpHeaders({ Authorization: `Bearer ${authToken}` });
    this.http.post<any>(
      apiUrl('chains/join/confirm-transfer'),
      { transferToken },
      { headers }
    ).subscribe({
      next: (res) => {
        localStorage.setItem('supplyChainId', res.chainId);
        localStorage.setItem('supplyChainName', res.name ?? '');
        localStorage.setItem('role', res.role);
        this.success = true;
        this.loading = false;
        setTimeout(() => this.router.navigate(['/dashboard']), 1200);
      },
      error: (err) => {
        this.error = this.getErrorMessage(err, 'Invalid or expired transfer confirmation.');
        this.loading = false;
      }
    });
  }

  private getErrorMessage(err: any, fallback: string): string {
    if (typeof err?.error === 'string') return err.error;
    if (typeof err?.error?.message === 'string') return err.error.message;
    if (typeof err?.error?.title === 'string') return err.error.title;
    if (typeof err?.message === 'string') return err.message;
    return fallback;
  }
}
