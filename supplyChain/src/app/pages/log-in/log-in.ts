import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-log-in',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './log-in.html',
  styleUrl: './log-in.css',
})
export class LogIn implements OnInit {
  showPassword = false;
  errorMessage = '';

  email = '';
  password = '';

  // Invite параметри от URL
  inviteToken: string | null = null;
  emailLocked = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Вземи token и email от URL: /signin?token=XXX&email=YYY
    this.inviteToken = this.route.snapshot.queryParamMap.get('token');
    const emailParam = this.route.snapshot.queryParamMap.get('email');

    if (emailParam) {
      this.email = emailParam;
      this.emailLocked = true;
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

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

        // Ако има invite token → join chain-а след login
        if (this.inviteToken) {
          this.http.post(
            'http://localhost:5000/api/chains/join',
            { token: this.inviteToken },
            {
              headers: {
                'Authorization': `Bearer ${response.token}`,
                'Content-Type': 'application/json'
              }
            }
          ).subscribe({
            next: (joinRes: any) => {
              if (joinRes?.supplyChainId) {
                localStorage.setItem('supplyChainId', joinRes.supplyChainId);
              }
              if (joinRes?.role) {
                localStorage.setItem('role', joinRes.role);
              }
              if (joinRes?.name) {
                localStorage.setItem('chainName', joinRes.name);
              }
              this.router.navigate(['/dashboard']);
            },
            error: (joinErr: any) => {
              console.error('Join failed:', joinErr);
              // Login мина, но join fail-на — прати към dashboard ако има chain
              if (response.supplyChainId) {
                this.router.navigate(['/dashboard']);
              } else {
                this.router.navigate(['/intro']);
              }
            }
          });
          return;
        }

        // Нормален login без покана
        if (!response.supplyChainId) {
          this.router.navigate(['/intro']);
          return;
        }

        this.router.navigate(['/dashboard']);
      },
      error: (err: any) => {
        this.errorMessage = err.error || 'Невалиден имейл или парола.';
      }
    });
  }
}