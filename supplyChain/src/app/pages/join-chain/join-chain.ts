import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { apiUrl } from '../../services/api.config';

interface AdminCandidate {
  userId: number;
  fullName: string;
  email: string;
}

@Component({
  selector: 'app-join-chain',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
            Are you sure you want to leave it and move to
            <strong>{{ targetChainName }}</strong>?
          </p>

          <div class="handoff" *ngIf="requiresSuperAdminTransfer">
            <p class="modal-note">
              You are the SuperAdmin in your current chain. Choose an existing admin who will become SuperAdmin before you leave.
            </p>

            <label class="select-label" for="new-super-admin">New SuperAdmin</label>
            <select
              id="new-super-admin"
              class="select"
              [(ngModel)]="selectedNewSuperAdminUserId"
              [disabled]="transferLoading || adminCandidates.length === 0">
              <option [ngValue]="null">Select an admin</option>
              <option *ngFor="let admin of adminCandidates" [ngValue]="admin.userId">
                {{ admin.fullName }} ({{ admin.email }})
              </option>
            </select>

            <div class="join-error small" *ngIf="adminCandidates.length === 0">
              This chain has no other admins. Promote someone to Admin first, then try joining again.
            </div>
          </div>

          <p class="modal-note">
            After confirmation we will send you an email. The move is completed only after you open the link in that email.
          </p>

          <div class="modal-actions">
            <button class="btn-secondary" type="button" (click)="cancelTransfer()" [disabled]="transferLoading">
              Stay here
            </button>
            <button
              class="btn-primary"
              type="button"
              (click)="requestTransfer()"
              [disabled]="transferLoading || (requiresSuperAdminTransfer && !selectedNewSuperAdminUserId)">
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
    .join-error.small { font-size: 13px; margin-top: 8px; }
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
      width: min(520px, 100%);
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

    .handoff {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 14px;
      margin: 16px 0;
      background: #fafafa;
    }

    .select-label {
      display: block;
      font-size: 13px;
      font-weight: 700;
      color: #374151;
      margin-bottom: 6px;
    }

    .select {
      width: 100%;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 10px 12px;
      background: #ffffff;
      color: #111827;
      font: inherit;
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
  successMessage = 'Success! Redirecting...';
  showTransferModal = false;
  transferLoading = false;
  inviteToken = '';
  inviteCode = '';
  inviteLink = '';
  currentChainName = 'current chain';
  targetChainName = 'new chain';
  requiresSuperAdminTransfer = false;
  adminCandidates: AdminCandidate[] = [];
  selectedNewSuperAdminUserId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    const code = this.route.snapshot.queryParamMap.get('code');
    const link = this.route.snapshot.queryParamMap.get('link');
    const transferToken = this.route.snapshot.queryParamMap.get('transferToken');
    const email = this.route.snapshot.queryParamMap.get('email') || '';

    if (!token && !code && !link && !transferToken) {
      this.error = 'Invalid join link.';
      this.loading = false;
      return;
    }

    const authToken = localStorage.getItem('token');
    if (!authToken) {
      this.router.navigate(['/login'], {
        queryParams: transferToken ? { transferToken, email } : { token, code, link, email }
      });
      return;
    }

    if (transferToken) {
      this.confirmTransfer(transferToken, authToken);
      return;
    }

    this.inviteToken = token || '';
    this.inviteCode = code || '';
    this.inviteLink = link || '';
    this.tryJoin(authToken);
  }

  requestTransfer() {
    const authToken = localStorage.getItem('token');
    if (!authToken) {
      this.error = 'Invalid join link.';
      this.showTransferModal = false;
      return;
    }

    if (this.requiresSuperAdminTransfer && !this.selectedNewSuperAdminUserId) {
      this.error = 'Choose an admin to become SuperAdmin first.';
      return;
    }

    this.transferLoading = true;
    const headers = new HttpHeaders({ Authorization: `Bearer ${authToken}` });
    this.http.post<any>(
      apiUrl('chains/join/transfer-request'),
      this.buildJoinPayload(),
      { headers }
    ).subscribe({
      next: () => {
        this.transferLoading = false;
        this.showTransferModal = false;
        this.success = true;
        this.successMessage = 'We sent a confirmation email. Open it to finish moving to the new chain.';
      },
      error: (err) => {
        this.transferLoading = false;
        this.error = this.getErrorMessage(err, 'Could not send the confirmation email.');
      }
    });
  }

  cancelTransfer() {
    this.showTransferModal = false;
    this.router.navigate(['/dashboard']);
  }

  private tryJoin(authToken: string) {
    const headers = new HttpHeaders({ Authorization: `Bearer ${authToken}` });

    this.http.post<any>(
      apiUrl('chains/join'),
      this.buildJoinPayload(),
      { headers }
    ).subscribe({
      next: (res) => {
        this.applyJoinedChain(res);
        this.success = true;
        this.loading = false;
        setTimeout(() => this.router.navigate(['/dashboard']), 1200);
      },
      error: (err) => {
        if (err.status === 409 && err.error?.code === 'ChainTransferRequired') {
          this.currentChainName = err.error.currentChainName || this.currentChainName;
          this.targetChainName = err.error.targetChainName || this.targetChainName;
          this.requiresSuperAdminTransfer = !!err.error.requiresSuperAdminTransfer;
          this.adminCandidates = err.error.adminCandidates || [];
          this.selectedNewSuperAdminUserId = this.adminCandidates[0]?.userId ?? null;
          this.loading = false;
          this.showTransferModal = true;
          return;
        }

        this.error = this.getErrorMessage(err, 'Invalid or expired join link.');
        this.loading = false;
      }
    });
  }

  private confirmTransfer(transferToken: string, authToken: string) {
    const headers = new HttpHeaders({ Authorization: `Bearer ${authToken}` });
    this.http.post<any>(
      apiUrl('chains/join/confirm-transfer'),
      { transferToken },
      { headers }
    ).subscribe({
      next: (res) => {
        this.applyJoinedChain(res);
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

  private buildJoinPayload() {
    const currentChainId = localStorage.getItem('supplyChainId') || null;
    return {
      token: this.inviteToken || null,
      code: this.inviteCode || null,
      link: this.inviteLink || null,
      newSuperAdminUserId: this.selectedNewSuperAdminUserId,
      currentChainId
    };
  }

  private applyJoinedChain(res: any) {
    localStorage.setItem('supplyChainId', res.chainId ?? res.id);
    localStorage.setItem('supplyChainName', res.name ?? '');
    localStorage.setItem('role', res.role);
  }

  private getErrorMessage(err: any, fallback: string): string {
    if (typeof err?.error === 'string') return err.error;
    if (typeof err?.error?.message === 'string') return err.error.message;
    if (typeof err?.error?.title === 'string') return err.error.title;
    if (typeof err?.message === 'string') return err.message;
    return fallback;
  }
}
