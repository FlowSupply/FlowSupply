import { Routes } from '@angular/router';

import { SignUp } from './pages/sign-up/sign-up';
import { LogIn } from './pages/log-in/log-in';
import { Sidenavbar } from './layouts/sidenavbar/sidenavbar';
import { Dashboard } from './pages/dashboard/dashboard';
import { Suppliers } from './pages/suppliers/suppliers';
import { Inventory } from './pages/inventory/inventory';
import { Requests } from './pages/requests/requests';
import { Approvals } from './pages/approvals/approvals';
import { Orders } from './pages/orders/orders';

export const routes: Routes = [
    { path: 'signup', component: SignUp },
    { path: 'signin', component: LogIn},
    { path: '', component: Sidenavbar, 
        children: [
            { path: '', redirectTo: 'dashboard',  pathMatch: 'full'},
            { path: 'dashboard', component: Dashboard},
            { path: 'suppliers', component: Suppliers},
            { path: 'inventory', component: Inventory},
            { path: 'purchase-requests', component: Requests},
            { path: 'approvals', component: Approvals},
            { path: 'orders', component: Orders}
    ]}
];

