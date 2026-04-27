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
        if (response) {
          // ТУК БЕШЕ ПРОПУСКЪТ! Трябва да запазим токена:
          localStorage.setItem('token', response.token); 
          
          // Запазваме и другите неща
          localStorage.setItem('fullName', response.fullName);
          localStorage.setItem('email', response.email);
        }
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.errorMessage = err.error || 'Invalid email or password.';
      }
    });
  }
}
