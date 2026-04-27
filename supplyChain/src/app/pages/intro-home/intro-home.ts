import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

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
    localStorage.setItem('supplyChainId', response.id);
    localStorage.setItem('supplyChainName', response.name);
    localStorage.setItem('role', role);
    this.router.navigate(['/dashboard']);
  }

  createChain() {
    if (!this.createForm.name.trim()) { alert('Chain name is required'); return; }

    this.http.post<any>('http://localhost:5090/api/chains', this.createForm, { headers: this.getHeaders() })
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

    this.http.post<any>('http://localhost:5090/api/chains/join', payload, { headers: this.getHeaders() })
      .subscribe({
        next: (res) => this.saveAndNavigate(res, res.role),
        error: (err) => {
          console.error(err);
          alert(err.error || 'Invalid code or link.');
        }
      });
  }
}