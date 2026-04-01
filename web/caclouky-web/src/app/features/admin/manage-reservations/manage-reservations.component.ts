import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { HttpClient } from '@angular/common/http';
import { ReservationsService, Reservation } from '../../../core/services/reservations.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-manage-reservations',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule, MatButtonModule, MatChipsModule,
    MatIconModule, MatSnackBarModule, MatProgressSpinnerModule, MatTabsModule
  ],
  template: `
    <div class="page">
      <h2>Reservation Queue</h2>

      @if (loading) {
        <mat-spinner diameter="40"></mat-spinner>
      } @else {
        <mat-tab-group>

          <mat-tab label="Pending ({{ pending.length }})">
            @if (pending.length === 0) {
              <p class="empty">No pending reservations.</p>
            } @else {
              <table mat-table [dataSource]="pending" class="mat-elevation-z2">
                <ng-container matColumnDef="member">
                  <th mat-header-cell *matHeaderCellDef>Member</th>
                  <td mat-cell *matCellDef="let r">{{ r.user.firstName }} {{ r.user.lastName }}</td>
                </ng-container>
                <ng-container matColumnDef="book">
                  <th mat-header-cell *matHeaderCellDef>Book</th>
                  <td mat-cell *matCellDef="let r"><strong>{{ r.book.title }}</strong></td>
                </ng-container>
                <ng-container matColumnDef="reservedAt">
                  <th mat-header-cell *matHeaderCellDef>Reserved</th>
                  <td mat-cell *matCellDef="let r">{{ r.reservedAt | date:'mediumDate' }}</td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let r">
                    <button mat-stroked-button color="primary" (click)="markReady(r)">
                      <mat-icon>check_circle</mat-icon> Mark Ready
                    </button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="pendingCols"></tr>
                <tr mat-row *matRowDef="let row; columns: pendingCols;"></tr>
              </table>
            }
          </mat-tab>

          <mat-tab label="Ready for Pickup ({{ ready.length }})">
            @if (ready.length === 0) {
              <p class="empty">No reservations ready for pickup.</p>
            } @else {
              <table mat-table [dataSource]="ready" class="mat-elevation-z2">
                <ng-container matColumnDef="member">
                  <th mat-header-cell *matHeaderCellDef>Member</th>
                  <td mat-cell *matCellDef="let r">{{ r.user.firstName }} {{ r.user.lastName }}</td>
                </ng-container>
                <ng-container matColumnDef="book">
                  <th mat-header-cell *matHeaderCellDef>Book</th>
                  <td mat-cell *matCellDef="let r"><strong>{{ r.book.title }}</strong></td>
                </ng-container>
                <ng-container matColumnDef="availableAt">
                  <th mat-header-cell *matHeaderCellDef>Ready Since</th>
                  <td mat-cell *matCellDef="let r">{{ r.availableAt | date:'mediumDate' }}</td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let r">
                    <button mat-raised-button color="primary" (click)="processCheckout(r)">
                      <mat-icon>shopping_bag</mat-icon> Process Checkout
                    </button>
                    <button mat-button color="warn" (click)="cancel(r)" style="margin-left:8px">Cancel</button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="readyCols"></tr>
                <tr mat-row *matRowDef="let row; columns: readyCols;"></tr>
              </table>
            }
          </mat-tab>

        </mat-tab-group>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px; }
    h2 { margin-bottom: 16px; }
    .empty { color: #888; padding: 24px 0; }
    table { width: 100%; margin-top: 16px; }
  `]
})
export class ManageReservationsComponent implements OnInit {
  loading = true;
  pending: Reservation[] = [];
  ready: Reservation[] = [];
  pendingCols = ['member', 'book', 'reservedAt', 'actions'];
  readyCols = ['member', 'book', 'availableAt', 'actions'];

  constructor(
    private svc: ReservationsService,
    private http: HttpClient,
    private snack: MatSnackBar
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.svc.getAll().subscribe({
      next: all => {
        this.pending = all.filter(r => r.status === 'Pending');
        this.ready = all.filter(r => r.status === 'Ready');
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  markReady(r: Reservation) {
    this.svc.markReady(r.id).subscribe({
      next: () => { this.snack.open('Marked as ready for pickup.', 'Close', { duration: 3000 }); this.load(); },
      error: () => this.snack.open('Failed to update.', 'Close', { duration: 3000 })
    });
  }

  processCheckout(r: Reservation) {
    this.http.post(`${environment.apiUrl}/checkouts`, { bookId: r.book.id, userId: r.user.id }).subscribe({
      next: () => {
        // Mark reservation fulfilled
        this.http.put(`${environment.apiUrl}/reservations/${r.id}/fulfill`, {}).subscribe();
        this.snack.open(`Checkout processed for ${r.user.firstName} ${r.user.lastName}.`, 'Close', { duration: 4000 });
        this.load();
      },
      error: (err) => this.snack.open(err.error?.message ?? 'Checkout failed.', 'Close', { duration: 4000 })
    });
  }

  cancel(r: Reservation) {
    this.svc.cancel(r.id).subscribe({
      next: () => { this.snack.open('Reservation cancelled.', 'Close', { duration: 3000 }); this.load(); },
      error: () => this.snack.open('Failed to cancel.', 'Close', { duration: 3000 })
    });
  }
}
