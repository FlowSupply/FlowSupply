import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword {
  token = '';
  newPassword = '';
  confirmPassword = '';
  errorMessage = '';
  successMessage = '';
  isSubmitting = false;
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!this.token) {
      this.errorMessage = 'Invalid or missing password reset link.';
    }
  }

  toggleNewPassword() { this.showNewPassword = !this.showNewPassword; }
  toggleConfirmPassword() { this.showConfirmPassword = !this.showConfirmPassword; }

  onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.token) {
      this.errorMessage = 'Invalid or missing password reset link.';
      this.cdr.detectChanges();
      return;
    }

    if (!this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'Please fill in all fields.';
      this.cdr.detectChanges();
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMessage = 'New password must be at least 6 characters.';
      this.cdr.detectChanges();
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      this.cdr.detectChanges();
      return;
    }

    this.isSubmitting = true;
    this.authService.resetPassword(this.token, this.newPassword).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.successMessage = response.message || 'Password reset successfully. You can now sign in.';
        this.newPassword = '';
        this.confirmPassword = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = this.getErrorMessage(err, 'Password reset failed.');
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
