import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-log-in',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './log-in.html',
  styleUrl: './log-in.css',
})
export class LogIn {
  showPassword = false;
  errorMessage = '';

  email = '';
  password = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

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
    
      if (!response.supplyChainId) {
        // Акаунтът съществува но няма chain — отиди към intro да създадеш
        this.router.navigate(['/intro']);
        return;
      }
    
      this.router.navigate(['/dashboard']);
    },
    });
  }
}
