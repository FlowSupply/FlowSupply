import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-sign-up',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.css',
})
export class SignUp implements OnInit {
  showPassword = false;
  showConfirmPassword = false;
  errorMessage = '';
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  confirmPassword = '';
  username = '';

  // Invite параметри от URL
  inviteToken: string | null = null;
  emailLocked = false; // дали имейлът е заключен

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Вземи token и email от URL: /signup?token=XXX&email=YYY
    this.inviteToken = this.route.snapshot.queryParamMap.get('token');
    const emailParam = this.route.snapshot.queryParamMap.get('email');

    if (emailParam) {
      this.email = emailParam;
      this.emailLocked = true; // заключи полето
    }
  }

  togglePassword()        { this.showPassword        = !this.showPassword; }
  toggleConfirmPassword() { this.showConfirmPassword = !this.showConfirmPassword; }

  onSubmit() {
    this.errorMessage = '';

    if (!this.firstName || !this.lastName || !this.email || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    const fullName = `${this.firstName} ${this.lastName}`.trim();

    this.authService.register(fullName, this.email, this.password).subscribe({
      next: (response: any) => {
        localStorage.setItem('token',    response.token);
        localStorage.setItem('fullName', response.fullName);
        localStorage.setItem('email',    response.email);
        localStorage.setItem('role',     response.role ?? 'Employee');

        // Ако има invite token → join chain-а преди навигация
        if (this.inviteToken) {
          this.http.post(
            `http://localhost:5000/api/chains/join`,
            { token: this.inviteToken },
            { headers: { Authorization: `Bearer ${response.token}` } }
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
              // Регистрацията мина, но join fail-на — прати към intro
              this.router.navigate(['/intro']);
            }
          });
        } else {
          this.router.navigate(['/intro']);
        }
      },
      error: (err) => {
        this.errorMessage = err.error || 'Възникна грешка при регистрация.';
      }
    });
  }
}