import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MembersService, Member } from '../../../core/services/members.service';
import { MemberFormDialogComponent } from './member-form-dialog.component';

@Component({
  selector: 'app-manage-members',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatTooltipModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatDialogModule
  ],
  template: `
    <div class="members-container">
      <div class="header-row">
        <h2>Members</h2>
        <button mat-raised-button color="primary" (click)="openAdd()">
          <mat-icon>person_add</mat-icon> Add Member
        </button>
      </div>

      @if (loading()) {
        <div class="loading-center"><mat-spinner diameter="48"></mat-spinner></div>
      } @else {
        <table mat-table [dataSource]="members()" class="members-table">

          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Name</th>
            <td mat-cell *matCellDef="let m">{{ m.lastName }}, {{ m.firstName }}</td>
          </ng-container>

          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>Email</th>
            <td mat-cell *matCellDef="let m">{{ m.email }}</td>
          </ng-container>

          <ng-container matColumnDef="phone">
            <th mat-header-cell *matHeaderCellDef>Phone</th>
            <td mat-cell *matCellDef="let m">{{ m.phone || '—' }}</td>
          </ng-container>

          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef>Role</th>
            <td mat-cell *matCellDef="let m">
              <mat-chip-set>
                @for (r of m.roles; track r) {
                  <mat-chip [color]="roleColor(r)" highlighted>{{ r }}</mat-chip>
                }
              </mat-chip-set>
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let m">
              <span [class.active-badge]="m.isActive" [class.inactive-badge]="!m.isActive">
                {{ m.isActive ? 'Active' : 'Inactive' }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="memberSince">
            <th mat-header-cell *matHeaderCellDef>Member Since</th>
            <td mat-cell *matCellDef="let m">{{ m.memberSince | date:'mediumDate' }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let m">
              <button mat-icon-button matTooltip="Edit" (click)="openEdit(m)">
                <mat-icon>edit</mat-icon>
              </button>
              @if (m.isActive) {
                <button mat-icon-button matTooltip="Deactivate" color="warn" (click)="deactivate(m)">
                  <mat-icon>person_off</mat-icon>
                </button>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"></tr>
        </table>
      }
    </div>
  `,
  styles: [`
    .members-container { padding: 24px; }
    .header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    h2 { margin: 0; }
    .members-table { width: 100%; }
    .loading-center { display: flex; justify-content: center; padding: 80px; }
    .active-badge { color: #388e3c; font-weight: 500; font-size: 13px; }
    .inactive-badge { color: #d32f2f; font-weight: 500; font-size: 13px; }
  `]
})
export class ManageMembersComponent implements OnInit {
  members = signal<Member[]>([]);
  loading = signal(false);
  cols = ['name', 'email', 'phone', 'role', 'status', 'memberSince', 'actions'];

  constructor(
    private membersService: MembersService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.membersService.getAll().subscribe({
      next: m => { this.members.set(m); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openAdd() {
    this.dialog.open(MemberFormDialogComponent, { data: null, width: '560px' })
      .afterClosed().subscribe(ok => { if (ok) this.load(); });
  }

  openEdit(member: Member) {
    this.dialog.open(MemberFormDialogComponent, { data: member, width: '560px' })
      .afterClosed().subscribe(ok => { if (ok) this.load(); });
  }

  deactivate(member: Member) {
    if (!confirm(`Deactivate ${member.firstName} ${member.lastName}?`)) return;
    this.membersService.deactivate(member.id).subscribe({
      next: () => { this.snackBar.open('Member deactivated', 'OK', { duration: 3000 }); this.load(); },
      error: () => this.snackBar.open('Failed to deactivate', 'OK', { duration: 3000 })
    });
  }

  roleColor(role: string): string {
    if (role === 'Admin') return 'accent';
    if (role === 'Minister') return 'primary';
    return '';
  }
}
