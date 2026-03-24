import { Component, OnInit, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { BooksService, Book } from '../../../core/services/books.service';
import { ReservationsService } from '../../../core/services/reservations.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-book-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatButtonModule, MatChipsModule, MatSnackBarModule,
    MatProgressSpinnerModule, MatIconModule, MatDividerModule
  ],
  template: `
    <div class="detail-container">
      @if (loading()) {
        <mat-spinner diameter="48"></mat-spinner>
      } @else if (book()) {
        <a mat-button routerLink="/catalog">
          <mat-icon>arrow_back</mat-icon> Back to catalog
        </a>

        <div class="book-layout">
          <div class="cover">
            @if (book()!.coverImageUrl) {
              <img [src]="book()!.coverImageUrl" [alt]="book()!.title">
            } @else {
              <div class="cover-placeholder"><mat-icon>menu_book</mat-icon></div>
            }
          </div>

          <div class="info">
            <h1>{{ book()!.title }}</h1>
            <p class="author">by {{ book()!.author }}</p>

            <div class="meta">
              @if (book()!.genre) { <mat-chip>{{ book()!.genre }}</mat-chip> }
              @if (book()!.publishedYear) { <span class="year">{{ book()!.publishedYear }}</span> }
            </div>

            <mat-divider></mat-divider>

            <div class="copies">
              <span class="copies-label">Availability:</span>
              <span [class.available]="book()!.availableCopies > 0"
                    [class.unavailable]="book()!.availableCopies === 0">
                {{ book()!.availableCopies }} of {{ book()!.totalCopies }} copies available
              </span>
            </div>

            @if (book()!.isbn) {
              <p class="isbn">ISBN: {{ book()!.isbn }}</p>
            }
            @if (book()!.publisher) {
              <p class="publisher">Publisher: {{ book()!.publisher }}</p>
            }
            @if (book()!.description) {
              <p class="description">{{ book()!.description }}</p>
            }

            <div class="actions">
              @if (!auth.isLoggedIn()) {
                <a mat-raised-button color="primary" routerLink="/login">
                  Log in to reserve
                </a>
              } @else if (book()!.availableCopies === 0) {
                <button mat-raised-button color="accent"
                        [disabled]="reserving()"
                        (click)="reserve()">
                  {{ reserving() ? 'Reserving…' : 'Reserve (join waitlist)' }}
                </button>
              } @else {
                <button mat-raised-button color="accent"
                        [disabled]="reserving()"
                        (click)="reserve()">
                  {{ reserving() ? 'Reserving…' : 'Reserve' }}
                </button>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .detail-container { padding: 24px; max-width: 900px; margin: 0 auto; }
    .book-layout { display: flex; gap: 40px; margin-top: 16px; flex-wrap: wrap; }
    .cover { width: 220px; flex-shrink: 0; }
    .cover img { width: 100%; border-radius: 6px; box-shadow: 0 2px 12px rgba(0,0,0,.2); }
    .cover-placeholder { width: 220px; height: 300px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; border-radius: 6px; }
    .cover-placeholder mat-icon { font-size: 80px; width: 80px; height: 80px; color: #ccc; }
    .info { flex: 1; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    .author { font-size: 18px; color: #555; margin: 0 0 16px; }
    .meta { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
    .year { color: #888; font-size: 14px; }
    mat-divider { margin: 16px 0; }
    .copies { margin: 12px 0; font-size: 15px; }
    .copies-label { font-weight: 500; margin-right: 8px; }
    .available { color: #388e3c; font-weight: 500; }
    .unavailable { color: #d32f2f; font-weight: 500; }
    .isbn, .publisher { color: #666; font-size: 13px; margin: 4px 0; }
    .description { margin-top: 16px; line-height: 1.7; color: #444; }
    .actions { margin-top: 24px; }
  `]
})
export class BookDetailComponent implements OnInit {
  id = input.required<string>();
  book = signal<Book | null>(null);
  loading = signal(true);
  reserving = signal(false);

  constructor(
    private books: BooksService,
    public auth: AuthService,
    private reservations: ReservationsService,
    private snack: MatSnackBar
  ) {}

  ngOnInit() {
    this.books.getById(Number(this.id())).subscribe({
      next: b => { this.book.set(b); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  reserve() {
    this.reserving.set(true);
    this.reservations.create(Number(this.id())).subscribe({
      next: () => {
        this.snack.open('Reservation placed successfully!', 'Close', { duration: 3000 });
        this.reserving.set(false);
      },
      error: (err) => {
        this.snack.open(err.error?.message ?? 'Could not reserve. Please try again.', 'Close', { duration: 4000 });
        this.reserving.set(false);
      }
    });
  }
}
