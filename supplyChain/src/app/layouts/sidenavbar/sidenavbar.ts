// 1. Добави OnInit в импортите
import { Component, OnInit } from '@angular/core'; 
import { RouterOutlet, RouterLinkWithHref, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidenavbar',
  imports:[RouterOutlet, RouterLinkWithHref, CommonModule],
  templateUrl: './sidenavbar.html',
  styleUrl: './sidenavbar.css',
})
// 2. Добави implements OnInit
export class Sidenavbar implements OnInit {
  activeLink: string = '';
  isSidebarOpen = false;         
  isCollapsed = false; 

  // 3. Создай променливи за потребителя
  currentUserName: string = 'Guest';
  currentUserEmail: string = '';

  constructor(private router: Router) {}

  // 4. Добави тази функция, която се изпълнява при зареждане
  ngOnInit() {
  this.currentUserName  = localStorage.getItem('fullName') || 'Guest';
  this.currentUserEmail = localStorage.getItem('email') || '';
  this.currentRole      = localStorage.getItem('role') || 'Employee';
}
currentRole: string = 'Employee';
 
// Helpers за template-а:
get isAdmin()      { return ['Admin','SuperAdmin'].includes(this.currentRole); }
get isSuperAdmin() { return this.currentRole === 'SuperAdmin'; }
 
  setActive(link: string) {
    this.activeLink = link;
  }

  isActive(url: string) {
    return this.router.url === url;
  }           

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
  }
  

  logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('fullName');
  localStorage.removeItem('email');
  this.router.navigate(['/login']);
}

}