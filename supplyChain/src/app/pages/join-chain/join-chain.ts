import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-join-chain',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="min-height:100vh; display:flex; align-items:center; justify-content:center; background:#f8f5ff;">
      <div style="text-align:center; padding: 40px;">
        <div *ngIf="loading" style="color:#7c3aed; font-size:18px;">Присъединяване към chain...</div>
        <div *ngIf="error"   style="color:#ef4444; font-size:16px;">{{ error }}</div>
        <div *ngIf="success" style="color:#16a34a; font-size:16px;">Успешно! Пренасочване...</div>
      </div>
    </div>
  `
})
export class JoinChain implements OnInit {
  loading = true;
  error   = '';
  success = false;

  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    private http:   HttpClient
  ) {}

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    const email = this.route.snapshot.queryParamMap.get('email') || '';

    if (!token) {
      this.error   = 'Invalid link.';
      this.loading = false;
      return;
    }

    const authToken = localStorage.getItem('token');

    // Няма логнат потребител → прати към login или signup
    if (!authToken) {
      // Проверяваме дали имейлът има акаунт чрез signup route
      // Backend-ът е записал email в invite-а — пращаме към login
      // с token и email като параметри
      this.router.navigate(['/login'], {
        queryParams: { token, email }
      });
      return;
    }

    // Има логнат потребител → опитай да се присъедини директно
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${authToken}` });

    this.http.post<any>(
      'http://localhost:5090/api/chains/join',
      { token },
      { headers }
    ).subscribe({
      next: (res) => {
        localStorage.setItem('supplyChainId',   res.chainId);
        localStorage.setItem('supplyChainName', res.name ?? '');
        localStorage.setItem('role',            res.role);
        this.success = true;
        this.loading = false;
        setTimeout(() => this.router.navigate(['/dashboard']), 1200);
      },
      error: (err) => {
        this.error   = err.error || 'Invalid or expired link.';
        this.loading = false;
      }
    });
  }
}