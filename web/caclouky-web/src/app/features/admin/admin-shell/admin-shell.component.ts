import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavModule, MatListModule, MatIconModule],
  template: `
    <mat-sidenav-container class="admin-container">
      <mat-sidenav mode="side" opened class="admin-nav">
        <mat-nav-list>
          <a mat-list-item routerLink="dashboard" routerLinkActive="active-link">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>Dashboard</span>
          </a>
          <a mat-list-item routerLink="books" routerLinkActive="active-link">
            <mat-icon matListItemIcon>library_books</mat-icon>
            <span matListItemTitle>Books</span>
          </a>
          <a mat-list-item routerLink="reservations" routerLinkActive="active-link">
            <mat-icon matListItemIcon>bookmark</mat-icon>
            <span matListItemTitle>Reservations</span>
          </a>
          <a mat-list-item routerLink="checkouts" routerLinkActive="active-link">
            <mat-icon matListItemIcon>assignment_return</mat-icon>
            <span matListItemTitle>Checkouts</span>
          </a>
          <a mat-list-item routerLink="members" routerLinkActive="active-link">
            <mat-icon matListItemIcon>people</mat-icon>
            <span matListItemTitle>Members</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content class="admin-content">
        <router-outlet />
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .admin-container { height: calc(100vh - 64px); }
    .admin-nav { width: 220px; }
    .admin-content { padding: 0; }
    .active-link { background: rgba(0,0,0,0.08); }
  `]
})
export class AdminShellComponent {}
