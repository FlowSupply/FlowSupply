import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
  successMessage      = '';
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
    private authService: AuthService,
    private cdr:    ChangeDetectorRef
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
    this.successMessage = '';

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
      next: () => {
        this.successMessage = 'A verification email has been sent. Open it and confirm your email before signing in.';
        this.password = '';
        this.confirmPassword = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err.error || 'Registration failed.';
      }
    });
  }
}
