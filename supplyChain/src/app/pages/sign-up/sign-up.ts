import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sign-up',
  imports: [CommonModule, FormsModule],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.css',
})
export class SignUp {
    showPassword = false;
    showConfirmPassword = false
    errorMessage : string = '';

    constructor(private router: Router) {}

    togglePassword() {
        this.showPassword = !this.showPassword;
    }

    toggleConfirmPassword() {
        this.showConfirmPassword = !this.showConfirmPassword;
    }

    checkPasswordsMatch(){
        const password = document.querySelector('input[name="password"]') as HTMLInputElement;
        const confirmPassword = document.querySelector('input[name="confirm-password"]') as HTMLInputElement;
        
        if(password.value != "" && confirmPassword.value != ""){
            if(password.value != confirmPassword.value){
                this.errorMessage = 'Passwords do not match';
            } else {
                this.router.navigate(['/dashboard']);
            }
        }   
    }

}
