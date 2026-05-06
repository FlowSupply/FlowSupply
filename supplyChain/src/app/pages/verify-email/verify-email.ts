import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-email',
  imports: [CommonModule, RouterLink],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css',
})
export class VerifyEmail implements OnInit {
  isLoading = true;
  isSuccess = false;
  message = 'Verifying your email...';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!token) {
      this.isLoading = false;
      this.message = 'Verification token is missing.';
      this.cdr.detectChanges();
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.isSuccess = true;
        this.message = response.message || 'Email verified successfully.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.isSuccess = false;
        this.message = this.getErrorMessage(err, 'Email verification failed.');
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
