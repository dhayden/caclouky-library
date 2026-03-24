import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/login']);
};

export const roleGuard = (requiredRole: 'Admin' | 'Staff'): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowed = requiredRole === 'Staff' ? auth.isStaff() : auth.isAdmin();
  if (allowed) return true;
  return router.createUrlTree(['/']);
};
