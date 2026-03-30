import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReservationsService, Reservation } from '../../../core/services/reservations.service';

@Component({
  selector: 'app-my-reservations',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule, MatButtonModule, MatChipsModule,
    MatIconModule, MatSnackBarModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page">
      <h2>My Reservations</h2>

      @if (loading) {
        <mat-spinner diameter="40"></mat-spinner>
      } @else if (reservations.length === 0) {
        <p class="empty">You have no reservations yet.</p>
      } @else {
        <table mat-table [dataSource]="reservations" class="mat-elevation-z2">

          <ng-container matColumnDef="book">
            <th mat-header-cell *matHeaderCellDef>Book</th>
            <td mat-cell *matCellDef="let r">
              <strong>{{ r.book.title }}</strong><br>
              <span class="author">{{ r.book.author }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let r">
              <mat-chip [class]="'status-' + r.status.toLowerCase()">{{ r.status }}</mat-chip>
            </td>
          </ng-container>

          <ng-container matColumnDef="reservedAt">
            <th mat-header-cell *matHeaderCellDef>Reserved On</th>
            <td mat-cell *matCellDef="let r">{{ r.reservedAt | date:'mediumDate' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let r">
              @if (r.status === 'Pending' || r.status === 'Ready') {
                <button mat-button color="warn" (click)="cancel(r)">Cancel</button>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns;"></tr>
        </table>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 900px; margin: 0 auto; }
    h2 { margin-bottom: 24px; }
    .empty { color: #888; }
    table { width: 100%; }
    .author { font-size: 12px; color: #888; }
    .status-pending  { background: #fff3e0 !important; color: #e65100 !important; }
    .status-ready    { background: #e8f5e9 !important; color: #2e7d32 !important; }
    .status-fulfilled { background: #e3f2fd !important; color: #1565c0 !important; }
    .status-cancelled { background: #fafafa !important; color: #9e9e9e !important; }
  `]
})
export class MyReservationsComponent implements OnInit {
  reservations: Reservation[] = [];
  loading = true;
  columns = ['book', 'status', 'reservedAt', 'actions'];

  constructor(private svc: ReservationsService, private snack: MatSnackBar) {}

  ngOnInit() {
    this.svc.getAll().subscribe({
      next: r => { this.reservations = r; this.loading = false; },
      error: () => this.loading = false
    });
  }

  cancel(r: Reservation) {
    this.svc.cancel(r.id).subscribe({
      next: () => {
        r.status = 'Cancelled';
        this.snack.open('Reservation cancelled.', 'Close', { duration: 3000 });
      },
      error: (err) => {
        this.snack.open(err.error?.message ?? 'Could not cancel.', 'Close', { duration: 4000 });
      }
    });
  }
}
