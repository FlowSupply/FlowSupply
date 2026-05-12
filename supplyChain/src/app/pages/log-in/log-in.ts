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
      localStorage.setItem('token',    response.token);
      localStorage.setItem('fullName', response.fullName);
      localStorage.setItem('email',    response.email);
      localStorage.setItem('role',     response.role ?? 'Employee');
      localStorage.setItem('supplyChainId', response.supplyChainId ?? '');

      if (this.inviteToken) {
        // Върни се към /join — там JoinChain компонентът ще довърши join-а
        this.router.navigate(['/join'], {
          queryParams: { token: this.inviteToken }
        });
      } else if (!response.supplyChainId) {
        this.router.navigate(['/intro'], { queryParams: { join: true } });
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