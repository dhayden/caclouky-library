import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Reservation {
  id: number;
  reservedAt: string;
  availableAt?: string;
  status: 'Pending' | 'Ready' | 'Fulfilled' | 'Cancelled';
  book: { id: number; title: string; author: string };
  user: { id: string; firstName: string; lastName: string };
}

@Injectable({ providedIn: 'root' })
export class ReservationsService {
  private readonly apiUrl = `${environment.apiUrl}/reservations`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<Reservation[]>(this.apiUrl);
  }

  create(bookId: number) {
    return this.http.post<Reservation>(this.apiUrl, { bookId });
  }

  cancel(id: number) {
    return this.http.put<void>(`${this.apiUrl}/${id}/cancel`, {});
  }

  markReady(id: number) {
    return this.http.put<void>(`${this.apiUrl}/${id}/ready`, {});
  }
}
