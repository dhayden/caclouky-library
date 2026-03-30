import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

interface Checkout {
  id: number;
  checkedOutAt: string;
  dueDate: string;
  returnedAt?: string;
  isReturned: boolean;
  lateFee: number;
  book: { id: number; title: string; author: string };
}

@Component({
  selector: 'app-my-checkouts',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule, MatChipsModule, MatIconModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page">
      <h2>My Checkouts</h2>

      @if (loading) {
        <mat-spinner diameter="40"></mat-spinner>
      } @else if (checkouts.length === 0) {
        <p class="empty">You have no checkouts.</p>
      } @else {
        <table mat-table [dataSource]="checkouts" class="mat-elevation-z2">

          <ng-container matColumnDef="book">
            <th mat-header-cell *matHeaderCellDef>Book</th>
            <td mat-cell *matCellDef="let c">
              <strong>{{ c.book.title }}</strong><br>
              <span class="author">{{ c.book.author }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="checkedOutAt">
            <th mat-header-cell *matHeaderCellDef>Checked Out</th>
            <td mat-cell *matCellDef="let c">{{ c.checkedOutAt | date:'mediumDate' }}</td>
          </ng-container>

          <ng-container matColumnDef="dueDate">
            <th mat-header-cell *matHeaderCellDef>Due Date</th>
            <td mat-cell *matCellDef="let c">
              <span [class.overdue]="!c.isReturned && isOverdue(c.dueDate)">
                {{ c.dueDate | date:'mediumDate' }}
                @if (!c.isReturned && isOverdue(c.dueDate)) { <mat-icon inline>warning</mat-icon> }
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let c">
              @if (c.isReturned) {
                <mat-chip class="status-returned">Returned {{ c.returnedAt | date:'mediumDate' }}</mat-chip>
              } @else if (isOverdue(c.dueDate)) {
                <mat-chip class="status-overdue">Overdue</mat-chip>
              } @else {
                <mat-chip class="status-active">Active</mat-chip>
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
    .overdue { color: #c62828; font-weight: 500; display: flex; align-items: center; gap: 4px; }
    .status-active   { background: #e8f5e9 !important; color: #2e7d32 !important; }
    .status-overdue  { background: #ffebee !important; color: #c62828 !important; }
    .status-returned { background: #f5f5f5 !important; color: #757575 !important; }
  `]
})
export class MyCheckoutsComponent implements OnInit {
  checkouts: Checkout[] = [];
  loading = true;
  columns = ['book', 'checkedOutAt', 'dueDate', 'status'];

  constructor(private http: HttpClient, private auth: AuthService) {}

  isOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date();
  }

  ngOnInit() {
    this.http.get<Checkout[]>(`${environment.apiUrl}/checkouts`).subscribe({
      next: c => { this.checkouts = c; this.loading = false; },
      error: () => this.loading = false
    });
  }
}
