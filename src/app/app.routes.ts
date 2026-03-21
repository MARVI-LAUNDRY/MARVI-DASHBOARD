import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { DashboardLayoutComponent } from './features/dashboard/dashboard-layout.component';
import { HomeComponent } from './features/dashboard/home/home.component';
import { ModuleListComponent } from './features/dashboard/module-list/module-list.component';
import { ConfigurationComponent } from './features/dashboard/configuration/configuration.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'home', component: HomeComponent },
      { path: 'orders', component: ModuleListComponent },
      { path: 'purchases', component: ModuleListComponent },
      { path: 'clients', component: ModuleListComponent },
      { path: 'providers', component: ModuleListComponent },
      { path: 'products', component: ModuleListComponent },
      { path: 'services', component: ModuleListComponent },
      { path: 'users', component: ModuleListComponent },
      { path: 'configuration', component: ConfigurationComponent },
      { path: '', pathMatch: 'full', redirectTo: 'home' }
    ]
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard/home' },
  { path: '**', redirectTo: 'login' }
];
