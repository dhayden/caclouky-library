import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule
  ],
  template: `
    <mat-toolbar color="primary">
      <a routerLink="/catalog" class="brand">
        <mat-icon>local_library</mat-icon>
        <span>Caclouky Library</span>
      </a>

      <span class="spacer"></span>

      <a mat-button routerLink="/catalog" routerLinkActive="active-link">Catalog</a>

      @if (auth.isLoggedIn()) {
        <a mat-button routerLink="/my/checkouts" routerLinkActive="active-link">My Checkouts</a>
        <a mat-button routerLink="/my/reservations" routerLinkActive="active-link">My Reservations</a>
      }

      @if (auth.isStaff()) {
        <a mat-button routerLink="/admin" routerLinkActive="active-link">Admin</a>
      }

      @if (auth.isLoggedIn()) {
        <button mat-icon-button [matMenuTriggerFor]="userMenu">
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #userMenu>
          <span mat-menu-item disabled>{{ auth.currentUser()?.firstName }} {{ auth.currentUser()?.lastName }}</span>
          <button mat-menu-item (click)="auth.logout()">
            <mat-icon>logout</mat-icon> Sign out
          </button>
        </mat-menu>
      } @else {
        <a mat-button routerLink="/login">Sign in</a>
      }
    </mat-toolbar>

    <main>
      <router-outlet />
    </main>
  `,
  styles: [`
    mat-toolbar { position: sticky; top: 0; z-index: 100; }
    .brand { display: flex; align-items: center; gap: 8px; text-decoration: none; color: inherit; font-size: 18px; font-weight: 500; margin-right: 16px; }
    .spacer { flex: 1; }
    .active-link { background: rgba(255,255,255,0.15); border-radius: 4px; }
    main { min-height: calc(100vh - 64px); }
  `]
})
export class AppComponent {
  constructor(public auth: AuthService) {}
}
