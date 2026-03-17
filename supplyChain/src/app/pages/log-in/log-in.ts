import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-log-in',
  imports: [ CommonModule],
  templateUrl: './log-in.html',
  styleUrl: './log-in.css',
})
export class LogIn {
  showPassword = false;
  errorMessage='';

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}
