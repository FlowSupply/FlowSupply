import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { apiUrl } from '../../services/api.config';

@Component({
  selector: 'app-intro-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './intro-home.html',
  styleUrls: ['./intro-home.css'],
})
export class IntroHome {
  private http   = inject(HttpClient);
  private router = inject(Router);

  isCreateModalOpen = false;
  isJoinModalOpen   = false;
  joinTab: 'code' | 'link' = 'code';

  createForm = { name: '', industry: '', description: '', visibility: 'private' };
  joinForm   = { code: '', link: '' };

  openCreateModal() { this.isCreateModalOpen = true; }
  openJoinModal()   { this.isJoinModalOpen   = true; }

  closeModals() {
    this.isCreateModalOpen = false;
    this.isJoinModalOpen   = false;
    this.createForm = { name: '', industry: '', description: '', visibility: 'private' };
    this.joinForm   = { code: '', link: '' };
  }

  private getHeaders() {
    return new HttpHeaders({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });
  }

  private saveAndNavigate(response: any, role: string) {
    localStorage.setItem('supplyChainId', response.chainId ?? response.id);
    localStorage.setItem('supplyChainName', response.name ?? '');
    localStorage.setItem('role', role);
    this.router.navigate(['/dashboard']);
  }

  createChain() {
    if (!this.createForm.name.trim()) { alert('Chain name is required'); return; }

    this.http.post<any>(apiUrl('chains'), this.createForm, { headers: this.getHeaders() })
      .subscribe({
        next: (res) => this.saveAndNavigate(res, res.role),
        error: (err) => { console.error(err); alert('Failed to create chain.'); }
      });
  }

  joinChain() {
    const payload = this.joinTab === 'code'
      ? { code: this.joinForm.code }
      : { link: this.joinForm.link };

    const value = this.joinTab === 'code' ? this.joinForm.code : this.joinForm.link;
    if (!value.trim()) { alert(`${this.joinTab === 'code' ? 'Code' : 'Link'} is required`); return; }

    const currentChainId = localStorage.getItem('supplyChainId');
    if (currentChainId && currentChainId.trim()) {
      this.router.navigate(['/join'], { queryParams: payload });
      return;
    }

    this.http.post<any>(apiUrl('chains/join'), payload, { headers: this.getHeaders() })
      .subscribe({
        next: (res) => this.saveAndNavigate(res, res.role),
        error: (err) => {
          if (err.status === 409 && err.error?.code === 'ChainTransferRequired') {
            this.router.navigate(['/join'], { queryParams: payload });
            return;
          }

          console.error(err);
          alert(this.getErrorMessage(err, 'Invalid code or link.'));
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
