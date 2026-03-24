import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BooksService, Book } from '../../../core/services/books.service';

@Component({
  selector: 'app-book-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatInputModule,
    MatSnackBarModule, MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit Book' : 'Add Book' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="book-form">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Title</mat-label>
          <input matInput formControlName="title">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Author</mat-label>
          <input matInput formControlName="author">
        </mat-form-field>

        <mat-form-field appearance="outline" class="half">
          <mat-label>ISBN</mat-label>
          <input matInput formControlName="isbn">
        </mat-form-field>

        <mat-form-field appearance="outline" class="half">
          <mat-label>Genre</mat-label>
          <input matInput formControlName="genre">
        </mat-form-field>

        <mat-form-field appearance="outline" class="half">
          <mat-label>Publisher</mat-label>
          <input matInput formControlName="publisher">
        </mat-form-field>

        <mat-form-field appearance="outline" class="half">
          <mat-label>Published Year</mat-label>
          <input matInput type="number" formControlName="publishedYear">
        </mat-form-field>

        <mat-form-field appearance="outline" class="half">
          <mat-label>Total Copies</mat-label>
          <input matInput type="number" formControlName="totalCopies">
        </mat-form-field>

        <mat-form-field appearance="outline" class="half">
          <mat-label>Available Copies</mat-label>
          <input matInput type="number" formControlName="availableCopies">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Cover Image URL</mat-label>
          <input matInput formControlName="coverImageUrl" placeholder="https://...">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid || saving">
        @if (saving) { <mat-spinner diameter="18"></mat-spinner> }
        @else { {{ isEdit ? 'Save Changes' : 'Add Book' }} }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .book-form { display: flex; flex-wrap: wrap; gap: 0 16px; padding-top: 8px; }
    .full { width: 100%; }
    .half { width: calc(50% - 8px); }
  `]
})
export class BookFormDialogComponent implements OnInit {
  form!: FormGroup;
  saving = false;
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private booksService: BooksService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<BookFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Book | null
  ) {}

  ngOnInit() {
    this.isEdit = !!this.data;
    this.form = this.fb.group({
      title: [this.data?.title ?? '', Validators.required],
      author: [this.data?.author ?? '', Validators.required],
      isbn: [this.data?.isbn ?? '', Validators.required],
      genre: [this.data?.genre ?? ''],
      publisher: [this.data?.publisher ?? ''],
      publishedYear: [this.data?.publishedYear ?? null],
      totalCopies: [this.data?.totalCopies ?? 1, [Validators.required, Validators.min(1)]],
      availableCopies: [this.data?.availableCopies ?? 1, [Validators.required, Validators.min(0)]],
      coverImageUrl: [this.data?.coverImageUrl ?? ''],
      description: [this.data?.description ?? '']
    });
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    const value = this.form.value;
    const onSuccess = () => {
      this.snackBar.open(this.isEdit ? 'Book updated' : 'Book added', 'OK', { duration: 3000 });
      this.dialogRef.close(true);
    };
    const onError = () => {
      this.snackBar.open('Save failed', 'OK', { duration: 3000 });
      this.saving = false;
    };

    if (this.isEdit) {
      this.booksService.update(this.data!.id, value).subscribe({ next: onSuccess, error: onError });
    } else {
      this.booksService.create(value).subscribe({ next: onSuccess, error: onError });
    }
  }
}
