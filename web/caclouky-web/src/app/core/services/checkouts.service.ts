import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Checkout {
  id: number;
  checkedOutAt: string;
  dueDate: string;
  returnedAt?: string;
  isReturned: boolean;
  lateFee?: number;
  book: { id: number; title: string; author: string };
  user: { id: string; firstName: string; lastName: string; email: string };
}

@Injectable({ providedIn: 'root' })
export class CheckoutsService {
  private readonly apiUrl = `${environment.apiUrl}/checkouts`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<Checkout[]>(this.apiUrl);
  }

  create(bookId: number, userId: string, loanDays = 14) {
    return this.http.post<Checkout>(this.apiUrl, { bookId, userId, loanDays });
  }

  returnBook(checkoutId: number) {
    return this.http.put<{ id: number; returnedAt: string; lateFee?: number }>(
      `${this.apiUrl}/${checkoutId}/return`, {}
    );
  }
}
