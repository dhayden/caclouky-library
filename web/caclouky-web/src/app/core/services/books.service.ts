import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Book {
  id: number;
  isbn: string;
  title: string;
  author: string;
  genre?: string;
  publisher?: string;
  publishedYear?: number;
  description?: string;
  coverImageUrl?: string;
  totalCopies: number;
  availableCopies: number;
}

export interface BookSearchResult {
  total: number;
  page: number;
  pageSize: number;
  books: Book[];
}

export interface BookSearchParams {
  search?: string;
  genre?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class BooksService {
  private readonly apiUrl = `${environment.apiUrl}/books`;

  constructor(private http: HttpClient) {}

  getAll(params: BookSearchParams = {}) {
    let httpParams = new HttpParams();
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.genre) httpParams = httpParams.set('genre', params.genre);
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);
    return this.http.get<BookSearchResult>(this.apiUrl, { params: httpParams });
  }

  getById(id: number) {
    return this.http.get<Book>(`${this.apiUrl}/${id}`);
  }

  getGenres() {
    return this.http.get<string[]>(`${this.apiUrl}/genres`);
  }

  create(book: Partial<Book>) {
    return this.http.post<Book>(this.apiUrl, book);
  }

  update(id: number, book: Partial<Book>) {
    return this.http.put<void>(`${this.apiUrl}/${id}`, { id, ...book });
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
