import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MembersService, Member } from '../../../core/services/members.service';

@Component({
  selector: 'app-member-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatInputModule,
    MatSelectModule, MatSnackBarModule, MatProgressSpinnerModule, MatCheckboxModule
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit Member' : 'Add Member' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="member-form">
        <mat-form-field appearance="outline" class="half">
          <mat-label>First Name</mat-label>
          <input matInput formControlName="firstName">
        </mat-form-field>

        <mat-form-field appearance="outline" class="half">
          <mat-label>Last Name</mat-label>
          <input matInput formControlName="lastName">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email">
        </mat-form-field>

        @if (!isEdit) {
          <mat-form-field appearance="outline" class="full">
            <mat-label>Password</mat-label>
            <input matInput type="password" formControlName="password">
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="half">
          <mat-label>Phone</mat-label>
          <input matInput formControlName="phone">
        </mat-form-field>

        <mat-form-field appearance="outline" class="half">
          <mat-label>Role</mat-label>
          <mat-select formControlName="role">
            <mat-option value="GeneralAssembly">General Assembly</mat-option>
            <mat-option value="Minister">Minister</mat-option>
            <mat-option value="Admin">Admin</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Address</mat-label>
          <input matInput formControlName="address">
        </mat-form-field>

        <div class="full">
          <mat-checkbox formControlName="isActive" color="primary">Active member</mat-checkbox>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid || saving">
        @if (saving) { <mat-spinner diameter="18"></mat-spinner> }
        @else { {{ isEdit ? 'Save Changes' : 'Add Member' }} }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .member-form { display: flex; flex-wrap: wrap; gap: 0 16px; padding-top: 8px; min-width: 480px; }
    .full { width: 100%; }
    .half { width: calc(50% - 8px); }
  `]
})
export class MemberFormDialogComponent implements OnInit {
  form!: FormGroup;
  saving = false;
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private membersService: MembersService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<MemberFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Member | null
  ) {}

  ngOnInit() {
    this.isEdit = !!this.data;
    const currentRole = this.data?.roles?.[0] ?? 'GeneralAssembly';
    this.form = this.fb.group({
      firstName: [this.data?.firstName ?? '', Validators.required],
      lastName: [this.data?.lastName ?? '', Validators.required],
      email: [this.data?.email ?? '', [Validators.required, Validators.email]],
      ...(!this.isEdit ? { password: ['', [Validators.required, Validators.minLength(6)]] } : {}),
      phone: [this.data?.phone ?? ''],
      address: [this.data?.address ?? ''],
      role: [currentRole, Validators.required],
      isActive: [this.data?.isActive ?? true]
    });
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.value;

    const onSuccess = () => {
      this.snackBar.open(this.isEdit ? 'Member updated' : 'Member added', 'OK', { duration: 3000 });
      this.dialogRef.close(true);
    };
    const onError = (err: any) => {
      const msg = err?.error?.[0]?.description ?? 'Save failed';
      this.snackBar.open(msg, 'OK', { duration: 4000 });
      this.saving = false;
    };

    if (this.isEdit) {
      this.membersService.update(this.data!.id, {
        firstName: v.firstName, lastName: v.lastName, email: v.email,
        phone: v.phone, address: v.address, role: v.role, isActive: v.isActive
      }).subscribe({ next: onSuccess, error: onError });
    } else {
      this.membersService.create({
        firstName: v.firstName, lastName: v.lastName, email: v.email,
        password: v.password, phone: v.phone, address: v.address,
        role: v.role, isActive: v.isActive
      }).subscribe({ next: onSuccess, error: onError });
    }
  }
}
