import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'catalog', pathMatch: 'full' },

  // Public
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register/register.component').then(m => m.RegisterComponent)
  },

  // Catalog (public browse, auth required for reserve)
  {
    path: 'catalog',
    loadComponent: () => import('./features/catalog/book-list/book-list.component').then(m => m.BookListComponent)
  },
  {
    path: 'catalog/:id',
    loadComponent: () => import('./features/catalog/book-detail/book-detail.component').then(m => m.BookDetailComponent)
  },

  // Member portal
  {
    path: 'my',
    canActivate: [authGuard],
    children: [
      {
        path: 'checkouts',
        loadComponent: () => import('./features/member/my-checkouts/my-checkouts.component').then(m => m.MyCheckoutsComponent)
      },
      {
        path: 'reservations',
        loadComponent: () => import('./features/member/my-reservations/my-reservations.component').then(m => m.MyReservationsComponent)
      },
      { path: '', redirectTo: 'checkouts', pathMatch: 'full' }
    ]
  },

  // Admin / Staff
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard('Staff')],
    loadComponent: () => import('./features/admin/admin-shell/admin-shell.component').then(m => m.AdminShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'books',
        loadComponent: () => import('./features/admin/manage-books/manage-books.component').then(m => m.ManageBooksComponent)
      },
      {
        path: 'members',
        canActivate: [roleGuard('Admin')],
        loadComponent: () => import('./features/admin/manage-members/manage-members.component').then(m => m.ManageMembersComponent)
      },
      {
        path: 'checkouts',
        loadComponent: () => import('./features/admin/manage-checkouts/manage-checkouts.component').then(m => m.ManageCheckoutsComponent)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  { path: '**', redirectTo: 'catalog' }
];
