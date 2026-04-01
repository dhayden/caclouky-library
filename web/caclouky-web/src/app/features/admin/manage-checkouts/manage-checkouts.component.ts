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
import { environment } from '../../../../environments/environment';

interface Checkout {
  id: number;
  checkedOutAt: string;
  dueDate: string;
  returnedAt?: string;
  isReturned: boolean;
  lateFee: number;
  book: { id: number; title: string; author: string };
  user: { id: string; firstName: string; lastName: string; email: string };
}

@Component({
  selector: 'app-manage-checkouts',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule, MatButtonModule, MatChipsModule,
    MatIconModule, MatSnackBarModule, MatProgressSpinnerModule, MatTabsModule
  ],
  template: `
    <div class="page">
      <h2>Checkouts</h2>

      @if (loading) {
        <mat-spinner diameter="40"></mat-spinner>
      } @else {
        <mat-tab-group>

          <mat-tab label="Active ({{ active.length }})">
            @if (active.length === 0) {
              <p class="empty">No active checkouts.</p>
            } @else {
              <table mat-table [dataSource]="active" class="mat-elevation-z2">
                <ng-container matColumnDef="member">
                  <th mat-header-cell *matHeaderCellDef>Member</th>
                  <td mat-cell *matCellDef="let c">
                    {{ c.user.firstName }} {{ c.user.lastName }}<br>
                    <span class="sub">{{ c.user.email }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="book">
                  <th mat-header-cell *matHeaderCellDef>Book</th>
                  <td mat-cell *matCellDef="let c"><strong>{{ c.book.title }}</strong></td>
                </ng-container>
                <ng-container matColumnDef="checkedOutAt">
                  <th mat-header-cell *matHeaderCellDef>Checked Out</th>
                  <td mat-cell *matCellDef="let c">{{ c.checkedOutAt | date:'mediumDate' }}</td>
                </ng-container>
                <ng-container matColumnDef="dueDate">
                  <th mat-header-cell *matHeaderCellDef>Due</th>
                  <td mat-cell *matCellDef="let c">
                    <span [class.overdue]="isOverdue(c.dueDate)">{{ c.dueDate | date:'mediumDate' }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let c">
                    <button mat-raised-button color="accent" (click)="returnBook(c)">
                      <mat-icon>assignment_return</mat-icon> Return
                    </button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="activeCols"></tr>
                <tr mat-row *matRowDef="let row; columns: activeCols;"></tr>
              </table>
            }
          </mat-tab>

          <mat-tab label="History">
            @if (returned.length === 0) {
              <p class="empty">No returned checkouts.</p>
            } @else {
              <table mat-table [dataSource]="returned" class="mat-elevation-z2">
                <ng-container matColumnDef="member">
                  <th mat-header-cell *matHeaderCellDef>Member</th>
                  <td mat-cell *matCellDef="let c">{{ c.user.firstName }} {{ c.user.lastName }}</td>
                </ng-container>
                <ng-container matColumnDef="book">
                  <th mat-header-cell *matHeaderCellDef>Book</th>
                  <td mat-cell *matCellDef="let c"><strong>{{ c.book.title }}</strong></td>
                </ng-container>
                <ng-container matColumnDef="checkedOutAt">
                  <th mat-header-cell *matHeaderCellDef>Checked Out</th>
                  <td mat-cell *matCellDef="let c">{{ c.checkedOutAt | date:'mediumDate' }}</td>
                </ng-container>
                <ng-container matColumnDef="returnedAt">
                  <th mat-header-cell *matHeaderCellDef>Returned</th>
                  <td mat-cell *matCellDef="let c">{{ c.returnedAt | date:'mediumDate' }}</td>
                </ng-container>
                <ng-container matColumnDef="lateFee">
                  <th mat-header-cell *matHeaderCellDef>Late Fee</th>
                  <td mat-cell *matCellDef="let c">
                    {{ c.lateFee > 0 ? (c.lateFee | currency) : '—' }}
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="historyCols"></tr>
                <tr mat-row *matRowDef="let row; columns: historyCols;"></tr>
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
    .sub { font-size: 12px; color: #888; }
    .overdue { color: #c62828; font-weight: 500; }
  `]
})
export class ManageCheckoutsComponent implements OnInit {
  loading = true;
  active: Checkout[] = [];
  returned: Checkout[] = [];
  activeCols = ['member', 'book', 'checkedOutAt', 'dueDate', 'actions'];
  historyCols = ['member', 'book', 'checkedOutAt', 'returnedAt', 'lateFee'];

  constructor(private http: HttpClient, private snack: MatSnackBar) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.http.get<Checkout[]>(`${environment.apiUrl}/checkouts`).subscribe({
      next: all => {
        this.active = all.filter(c => !c.isReturned);
        this.returned = all.filter(c => c.isReturned);
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  isOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date();
  }

  returnBook(c: Checkout) {
    this.http.put<{ returnedAt: string; lateFee: number }>(
      `${environment.apiUrl}/checkouts/${c.id}/return`, {}
    ).subscribe({
      next: (res) => {
        const msg = res.lateFee > 0 ? `Returned. Late fee: $${res.lateFee.toFixed(2)}` : 'Book returned successfully.';
        this.snack.open(msg, 'Close', { duration: 4000 });
        this.load();
      },
      error: (err) => this.snack.open(err.error?.message ?? 'Return failed.', 'Close', { duration: 4000 })
    });
  }
}
