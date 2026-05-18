// В log-in.ts добави OnInit и ActivatedRoute:
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { apiUrl } from '../../services/api.config';

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
  isSubmitting = false;

  inviteToken  = '';
  transferToken = '';
  inviteCode = '';
  inviteLink = '';
  emailLocked  = false;

  constructor(
    private router:      Router,
    private route:       ActivatedRoute,
    private http:        HttpClient,
    private authService: AuthService,
    private cdr:         ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.inviteToken = this.route.snapshot.queryParamMap.get('token') || '';
    this.transferToken = this.route.snapshot.queryParamMap.get('transferToken') || '';
    this.inviteCode = this.route.snapshot.queryParamMap.get('code') || '';
    this.inviteLink = this.route.snapshot.queryParamMap.get('link') || '';
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
      this.cdr.detectChanges();
      return;
    }

    this.isSubmitting = true;
    this.authService.login(this.email, this.password).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        localStorage.setItem('token',         response.token);
        localStorage.setItem('fullName',      response.fullName);
        localStorage.setItem('email',         response.email);
        localStorage.setItem('role',          response.role ?? 'Employee');
        localStorage.setItem('supplyChainId', response.supplyChainId ?? '');

        if (this.transferToken) {
          this.router.navigate(['/join'], {
            queryParams: { transferToken: this.transferToken }
          });
        } else if (this.inviteToken) {
          this.router.navigate(['/join'], {
            queryParams: { token: this.inviteToken }
          });
        } else if (this.inviteCode) {
          this.router.navigate(['/join'], {
            queryParams: { code: this.inviteCode }
          });
        } else if (this.inviteLink) {
          this.router.navigate(['/join'], {
            queryParams: { link: this.inviteLink }
          });
        } else if (!response.supplyChainId) {
          localStorage.removeItem('supplyChainId');
          localStorage.removeItem('supplyChainName');
          this.router.navigate(['/intro'], { queryParams: { join: true } });
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.errorMessage = this.getErrorMessage(err, 'Invalid email or password.');
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  private getErrorMessage(err: any, fallback: string): string {
    if (typeof err?.error === 'string') {
      return err.error;
    }

    if (typeof err?.error?.message === 'string') {
      return err.error.message;
    }

    if (typeof err?.error?.title === 'string') {
      return err.error.title;
    }

    if (typeof err?.message === 'string') {
      return err.message;
    }

    return fallback;
  }
}
