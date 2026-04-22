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

  // 3. Създай променливи за потребителя
  currentUserName: string = 'Guest';
  currentUserEmail: string = '';

  constructor(private router: Router) {}

  // 4. Добави тази функция, която се изпълнява при зареждане
  ngOnInit() {
    this.currentUserName = localStorage.getItem('fullName') || 'Guest';
    this.currentUserEmail = localStorage.getItem('email') || '';
  }

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
}