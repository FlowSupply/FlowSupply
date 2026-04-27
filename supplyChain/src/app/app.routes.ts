import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { SignUp } from './pages/sign-up/sign-up';
import { LogIn } from './pages/log-in/log-in';
import { IntroHome } from './pages/intro-home/intro-home';
import { Sidenavbar } from './layouts/sidenavbar/sidenavbar';
import { Dashboard } from './pages/dashboard/dashboard';
import { Suppliers } from './pages/suppliers/suppliers';
import { Inventory } from './pages/inventory/inventory';
import { Requests } from './pages/requests/requests';
import { Approvals } from './pages/approvals/approvals';
import { Orders } from './pages/orders/orders';

// Guard: трябва да си логнат
const authGuard = () => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  if (!token) { router.navigate(['/login']); return false; }
  return true;
};

// Guard: ако вече имаш chain → направо към dashboard
const introGuard = () => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  if (!token) { router.navigate(['/login']); return false; }
  const chainId = localStorage.getItem('supplyChainId');
  if (chainId) { router.navigate(['/dashboard']); return false; }
  return true;
};

// Guard по роля
const roleGuard = (allowedRoles: string[]) => () => {
  const router = inject(Router);
  const role = localStorage.getItem('role') || 'Employee';
  if (!allowedRoles.includes(role)) { router.navigate(['/dashboard']); return false; }
  return true;
};

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login',  component: LogIn },
  { path: 'signup', component: SignUp },
  { path: 'intro',  component: IntroHome, canActivate: [introGuard] },

  {
    path: '', component: Sidenavbar,
    canActivate: [authGuard],
    children: [
      { path: '',                 redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',        component: Dashboard },
      { path: 'inventory',        component: Inventory },
      { path: 'purchase-requests',component: Requests },
      { path: 'orders',           component: Orders },

      // Admin + SuperAdmin only
      { path: 'suppliers',  component: Suppliers,  canActivate: [() => roleGuard(['Admin','SuperAdmin'])()]  },
      { path: 'approvals',  component: Approvals,  canActivate: [() => roleGuard(['Admin','SuperAdmin'])()]  },
    ]
  }
];