// В log-in.ts добави OnInit и ActivatedRoute:
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-log-in',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './log-in.html',
  styleUrl: './log-in.css',
})
export class LogIn implements OnInit {
  email       = '';
  password    = '';
  errorMessage = '';
  showPassword = false;

  inviteToken  = '';
  emailLocked  = false;

  constructor(
    private router:      Router,
    private route:       ActivatedRoute,
    private http:        HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.inviteToken = this.route.snapshot.queryParamMap.get('token') || '';
    const emailParam = this.route.snapshot.queryParamMap.get('email') || '';
    if (emailParam) {
      this.email       = decodeURIComponent(emailParam);
      this.emailLocked = true;
    }
  }

  togglePassword() { this.showPassword = !this.showPassword; }

  onSubmit() {
    this.errorMessage = '';
    if (!this.email || !this.password) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    this.authService.login(this.email, this.password).subscribe({
      next: (response: any) => {
        localStorage.setItem('token',         response.token);
        localStorage.setItem('fullName',      response.fullName);
        localStorage.setItem('email',         response.email);
        localStorage.setItem('role',          response.role ?? 'Employee');
        localStorage.setItem('supplyChainId', response.supplyChainId ?? '');

        // Ако има invite token → влез в chain-а
        if (this.inviteToken) {
          const headers = new HttpHeaders({ 'Authorization': `Bearer ${response.token}` });
          this.http.post<any>(
            'http://localhost:5090/api/chains/join',
            { token: this.inviteToken },
            { headers }
          ).subscribe({
            next: (res) => {
              localStorage.setItem('supplyChainId',   res.chainId);
              localStorage.setItem('supplyChainName', res.name ?? '');
              localStorage.setItem('role',            res.role);
              this.router.navigate(['/dashboard']);
            },
            error: () => this.router.navigate(['/dashboard'])
          });
        } else if (!response.supplyChainId) {
          this.errorMessage = 'Your account is not linked to a supply chain. Contact your administrator.';
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.errorMessage = err.error || 'Invalid email or password.';
      }
    });
  }
}