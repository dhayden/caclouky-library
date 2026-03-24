import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { CheckoutsService, Checkout } from '../../../core/services/checkouts.service';
import { ReservationsService, Reservation } from '../../../core/services/reservations.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatChipsModule
  ],
  template: `
    <div class="dashboard">
      <h2>Dashboard</h2>

      <!-- Stat cards -->
      <div class="stats-row">
        <mat-card class="stat-card">
          <mat-icon color="primary">check_circle</mat-icon>
          <div>
            <p class="stat-value">{{ activeCheckouts().length }}</p>
            <p class="stat-label">Active checkouts</p>
          </div>
        </mat-card>
        <mat-card class="stat-card overdue-card">
          <mat-icon color="warn">warning</mat-icon>
          <div>
            <p class="stat-value warn">{{ overdueCheckouts().length }}</p>
            <p class="stat-label">Overdue</p>
          </div>
        </mat-card>
        <mat-card class="stat-card">
          <mat-icon color="accent">bookmark</mat-icon>
          <div>
            <p class="stat-value">{{ pendingReservations().length }}</p>
            <p class="stat-label">Pending reservations</p>
          </div>
        </mat-card>
      </div>

      <!-- Overdue checkouts -->
      @if (overdueCheckouts().length) {
        <mat-card class="section-card">
          <mat-card-header>
            <mat-card-title>Overdue checkouts</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <table mat-table [dataSource]="overdueCheckouts()" class="full-width">
              <ng-container matColumnDef="member">
                <th mat-header-cell *matHeaderCellDef>Member</th>
                <td mat-cell *matCellDef="let c">{{ c.user.firstName }} {{ c.user.lastName }}</td>
              </ng-container>
              <ng-container matColumnDef="book">
                <th mat-header-cell *matHeaderCellDef>Book</th>
                <td mat-cell *matCellDef="let c">{{ c.book.title }}</td>
              </ng-container>
              <ng-container matColumnDef="due">
                <th mat-header-cell *matHeaderCellDef>Due date</th>
                <td mat-cell *matCellDef="let c">
                  <span class="overdue-date">{{ c.dueDate | date:'mediumDate' }}</span>
                </td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let c">
                  <a mat-button [routerLink]="['/admin/checkouts']">Manage</a>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="['member','book','due','actions']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['member','book','due','actions']"></tr>
            </table>
          </mat-card-content>
        </mat-card>
      }

      <!-- Pending reservations ready to notify -->
      @if (pendingReservations().length) {
        <mat-card class="section-card">
          <mat-card-header>
            <mat-card-title>Pending reservations</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <table mat-table [dataSource]="pendingReservations()" class="full-width">
              <ng-container matColumnDef="member">
                <th mat-header-cell *matHeaderCellDef>Member</th>
                <td mat-cell *matCellDef="let r">{{ r.user.firstName }} {{ r.user.lastName }}</td>
              </ng-container>
              <ng-container matColumnDef="book">
                <th mat-header-cell *matHeaderCellDef>Book</th>
                <td mat-cell *matCellDef="let r">{{ r.book.title }}</td>
              </ng-container>
              <ng-container matColumnDef="since">
                <th mat-header-cell *matHeaderCellDef>Reserved</th>
                <td mat-cell *matCellDef="let r">{{ r.reservedAt | date:'mediumDate' }}</td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let r">
                  <button mat-button color="primary" (click)="markReady(r)">Mark ready</button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="['member','book','since','actions']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['member','book','since','actions']"></tr>
            </table>
          </mat-card-content>
        </mat-card>
      }

      <!-- Quick nav -->
      <div class="quick-nav">
        <a mat-raised-button routerLink="/admin/books"><mat-icon>library_books</mat-icon> Manage books</a>
        <a mat-raised-button routerLink="/admin/checkouts"><mat-icon>assignment_return</mat-icon> Manage checkouts</a>
        <a mat-raised-button routerLink="/admin/members"><mat-icon>people</mat-icon> Manage members</a>
      </div>
    </div>
  `,
  styles: [`
    .dashboard { padding: 24px; max-width: 1100px; margin: 0 auto; }
    .stats-row { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .stat-card { display: flex; gap: 16px; align-items: center; padding: 20px; flex: 1; min-width: 160px; }
    .stat-card mat-icon { font-size: 36px; width: 36px; height: 36px; }
    .stat-value { font-size: 28px; font-weight: 500; margin: 0; }
    .stat-label { font-size: 13px; color: #666; margin: 0; }
    .warn { color: #d32f2f; }
    .section-card { margin-bottom: 24px; }
    .full-width { width: 100%; }
    .overdue-date { color: #d32f2f; font-weight: 500; }
    .quick-nav { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; }
    .quick-nav a mat-icon { margin-right: 8px; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  checkouts = signal<Checkout[]>([]);
  reservations = signal<Reservation[]>([]);

  activeCheckouts = () => this.checkouts().filter(c => !c.isReturned);
  overdueCheckouts = () => this.checkouts().filter(c =>
    !c.isReturned && new Date(c.dueDate) < new Date()
  );
  pendingReservations = () => this.reservations().filter(r => r.status === 'Pending');

  constructor(
    private checkoutsService: CheckoutsService,
    private reservationsService: ReservationsService
  ) {}

  ngOnInit() {
    this.checkoutsService.getAll().subscribe(c => this.checkouts.set(c));
    this.reservationsService.getAll().subscribe(r => this.reservations.set(r));
  }

  markReady(r: Reservation) {
    this.reservationsService.markReady(r.id).subscribe(() => {
      this.reservations.update(list =>
        list.map(x => x.id === r.id ? { ...x, status: 'Ready' as const } : x)
      );
    });
  }
}
