import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sign-up',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.css',
})
export class SignUp implements OnInit {
  showPassword        = false;
  showConfirmPassword = false;
  errorMessage        = '';
  firstName   = '';
  lastName    = '';
  email       = '';
  password    = '';
  confirmPassword = '';

  // From invite link
  inviteToken  = '';
  emailLocked  = false;

  constructor(
    private router: Router,
    private route:  ActivatedRoute,
    private http:   HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Вземи token и email от URL ако идва от покана
    this.inviteToken = this.route.snapshot.queryParamMap.get('token') || '';
    const emailParam = this.route.snapshot.queryParamMap.get('email') || '';
    if (emailParam) {
      this.email      = decodeURIComponent(emailParam);
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
        localStorage.removeItem('supplyChainId'); 
        localStorage.removeItem('supplyChainName');

        // Ако има invite token → влез в chain-а
        if (this.inviteToken) {
          const headers = new HttpHeaders({
            'Authorization': `Bearer ${response.token}`
          });
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
            error: (err) => {
              console.error('Join chain error:', err);
              // Токенът може да е изтекъл — прати към intro
              this.router.navigate(['/intro']);
            }
          });
        } else {
          // Нормална регистрация без покана → intro
          this.router.navigate(['/intro']);
        }
      },
      error: (err) => {
        this.errorMessage = err.error || 'Registration failed.';
      }
    });
  }
}