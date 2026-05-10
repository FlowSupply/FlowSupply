import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  email = '';
  errorMessage = '';
  successMessage = '';
  isSubmitting = false;

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.email.trim()) {
      this.errorMessage = 'Please enter your email.';
      this.cdr.detectChanges();
      return;
    }

    this.isSubmitting = true;
    this.authService.forgotPassword(this.email).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.successMessage = response.message || 'If an account exists for this email, a reset link has been sent.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = this.getErrorMessage(err, 'Password reset request failed.');
        this.cdr.detectChanges();
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
