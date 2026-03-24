import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BooksService, Book } from '../../../core/services/books.service';
import { BookFormDialogComponent } from './book-form-dialog.component';

@Component({
  selector: 'app-manage-books',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatTableModule, MatButtonModule, MatIconModule, MatInputModule,
    MatDialogModule, MatSnackBarModule, MatCardModule, MatTooltipModule
  ],
  template: `
    <div class="manage-books">
      <div class="header">
        <h2>Manage Books</h2>
        <button mat-raised-button color="primary" (click)="openForm()">
          <mat-icon>add</mat-icon> Add Book
        </button>
      </div>

      <table mat-table [dataSource]="books()" class="full-width">

        <ng-container matColumnDef="cover">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let b">
            <img *ngIf="b.coverImageUrl" [src]="b.coverImageUrl" [alt]="b.title" class="cover-thumb">
            <mat-icon *ngIf="!b.coverImageUrl" class="no-cover">menu_book</mat-icon>
          </td>
        </ng-container>

        <ng-container matColumnDef="title">
          <th mat-header-cell *matHeaderCellDef>Title</th>
          <td mat-cell *matCellDef="let b">
            <strong>{{ b.title }}</strong><br>
            <small class="author">{{ b.author }}</small>
          </td>
        </ng-container>

        <ng-container matColumnDef="isbn">
          <th mat-header-cell *matHeaderCellDef>ISBN</th>
          <td mat-cell *matCellDef="let b">{{ b.isbn }}</td>
        </ng-container>

        <ng-container matColumnDef="genre">
          <th mat-header-cell *matHeaderCellDef>Genre</th>
          <td mat-cell *matCellDef="let b">{{ b.genre }}</td>
        </ng-container>

        <ng-container matColumnDef="copies">
          <th mat-header-cell *matHeaderCellDef>Copies</th>
          <td mat-cell *matCellDef="let b">
            {{ b.availableCopies }} / {{ b.totalCopies }}
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let b">
            <button mat-icon-button matTooltip="Edit" (click)="openForm(b)">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button color="warn" matTooltip="Delete" (click)="delete(b)">
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>

      @if (books().length === 0) {
        <p class="empty">No books found.</p>
      }
    </div>
  `,
  styles: [`
    .manage-books { padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .full-width { width: 100%; }
    .cover-thumb { width: 40px; height: 56px; object-fit: cover; border-radius: 2px; }
    .no-cover { color: #ccc; }
    .author { color: #666; }
    .empty { text-align: center; padding: 32px; color: #999; }
  `]
})
export class ManageBooksComponent implements OnInit {
  books = signal<Book[]>([]);
  columns = ['cover', 'title', 'isbn', 'genre', 'copies', 'actions'];

  constructor(
    private booksService: BooksService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.booksService.getAll({ pageSize: 100 }).subscribe(r => this.books.set(r.books));
  }

  openForm(book?: Book) {
    const ref = this.dialog.open(BookFormDialogComponent, {
      width: '560px',
      data: book ?? null
    });
    ref.afterClosed().subscribe(saved => {
      if (saved) this.load();
    });
  }

  delete(book: Book) {
    if (!confirm(`Delete "${book.title}"?`)) return;
    this.booksService.delete(book.id).subscribe({
      next: () => {
        this.snackBar.open('Book deleted', 'OK', { duration: 3000 });
        this.load();
      },
      error: () => this.snackBar.open('Delete failed', 'OK', { duration: 3000 })
    });
  }
}
