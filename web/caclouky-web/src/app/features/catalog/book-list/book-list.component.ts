import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { BooksService, Book, BookSearchResult } from '../../../core/services/books.service';

@Component({
  selector: 'app-book-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatCardModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatChipsModule, MatPaginatorModule,
    MatProgressSpinnerModule, MatIconModule
  ],
  template: `
    <div class="catalog-container">
      <h1>Library Catalog</h1>

      <!-- Search bar -->
      <div class="search-bar">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Search books, authors, ISBN…</mat-label>
          <input matInput [formControl]="searchCtrl">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="genre-field">
          <mat-label>Genre</mat-label>
          <mat-select [formControl]="genreCtrl">
            <mat-option value="">All genres</mat-option>
            @for (g of genres(); track g) {
              <mat-option [value]="g">{{ g }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Results -->
      @if (loading()) {
        <div class="loading-center">
          <mat-spinner diameter="48"></mat-spinner>
        </div>
      } @else {
        <div class="book-grid">
          @for (book of result()?.books; track book.id) {
            <mat-card class="book-card" [routerLink]="['/catalog', book.id]">
              <div class="cover-placeholder">
                @if (book.coverImageUrl) {
                  <img [src]="book.coverImageUrl" [alt]="book.title">
                } @else {
                  <mat-icon>menu_book</mat-icon>
                }
              </div>
              <mat-card-content>
                <h3 class="book-title">{{ book.title }}</h3>
                <p class="book-author">{{ book.author }}</p>
                @if (book.genre) {
                  <mat-chip-set>
                    <mat-chip>{{ book.genre }}</mat-chip>
                  </mat-chip-set>
                }
                <p class="availability"
                   [class.available]="book.availableCopies > 0"
                   [class.unavailable]="book.availableCopies === 0">
                  {{ book.availableCopies > 0 ? book.availableCopies + ' available' : 'Not available' }}
                </p>
              </mat-card-content>
            </mat-card>
          }
        </div>

        @if (!result()?.books?.length) {
          <p class="no-results">No books found. Try a different search.</p>
        }

        <mat-paginator
          [length]="result()?.total ?? 0"
          [pageSize]="pageSize"
          [pageSizeOptions]="[12, 24, 48]"
          (page)="onPage($event)">
        </mat-paginator>
      }
    </div>
  `,
  styles: [`
    .catalog-container { padding: 24px; max-width: 1200px; margin: 0 auto; }
    h1 { margin-bottom: 24px; }
    .search-bar { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
    .search-field { flex: 1; min-width: 240px; }
    .genre-field { width: 200px; }
    .book-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
    .book-card { cursor: pointer; transition: box-shadow .2s; }
    .book-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.15); }
    .cover-placeholder { height: 180px; background: #f5f5f5; display: flex; align-items: center; justify-content: center; }
    .cover-placeholder img { width: 100%; height: 100%; object-fit: cover; }
    .cover-placeholder mat-icon { font-size: 64px; width: 64px; height: 64px; color: #ccc; }
    .book-title { font-weight: 500; margin: 0 0 4px; font-size: 15px; line-height: 1.3; }
    .book-author { color: #666; font-size: 13px; margin: 0 0 8px; }
    .availability { font-size: 12px; font-weight: 500; margin: 8px 0 0; }
    .available { color: #388e3c; }
    .unavailable { color: #d32f2f; }
    .loading-center { display: flex; justify-content: center; padding: 80px; }
    .no-results { text-align: center; color: #666; padding: 60px 0; }
  `]
})
export class BookListComponent implements OnInit {
  searchCtrl = new FormControl('');
  genreCtrl = new FormControl('');
  result = signal<BookSearchResult | null>(null);
  genres = signal<string[]>([]);
  loading = signal(false);
  pageSize = 12;
  currentPage = 1;

  constructor(private books: BooksService) {}

  ngOnInit() {
    this.loadGenres();
    this.load();

    this.searchCtrl.valueChanges.pipe(debounceTime(350), distinctUntilChanged())
      .subscribe(() => { this.currentPage = 1; this.load(); });

    this.genreCtrl.valueChanges
      .subscribe(() => { this.currentPage = 1; this.load(); });
  }

  load() {
    this.loading.set(true);
    this.books.getAll({
      search: this.searchCtrl.value ?? undefined,
      genre: this.genreCtrl.value ?? undefined,
      page: this.currentPage,
      pageSize: this.pageSize
    }).subscribe({
      next: r => { this.result.set(r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  loadGenres() {
    this.books.getGenres().subscribe(g => this.genres.set(g));
  }

  onPage(e: PageEvent) {
    this.currentPage = e.pageIndex + 1;
    this.pageSize = e.pageSize;
    this.load();
  }
}
