import { Component } from '@angular/core';
import { RouterOutlet, RouterLinkWithHref, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidenavbar',
  imports: [RouterOutlet, RouterLinkWithHref, CommonModule],
  templateUrl: './sidenavbar.html',
  styleUrl: './sidenavbar.css',
})
export class Sidenavbar {
  activeLink: string = '';
  isSidebarOpen = false;         
  isCollapsed = false; 

  setActive(link: string) {
    this.activeLink = link;
  }

  constructor(private router: Router) {}

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
