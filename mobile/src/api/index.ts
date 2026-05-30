import client from './client';
import type { Book, BooksResponse, Checkout, Reservation, AuthUser } from '../types';

export const login = (email: string, password: string) =>
  client.post<{ token: string; user: AuthUser }>('/auth/login', { email, password });

export const register = (data: { firstName: string; lastName: string; email: string; password: string }) =>
  client.post('/auth/register', data);

export const getBooks = (params: { search?: string; genre?: string; page?: number; pageSize?: number }) =>
  client.get<BooksResponse>('/books', { params });

export const getBook = (id: number) => client.get<Book>(`/books/${id}`);
export const getGenres = () => client.get<string[]>('/books/genres');

export const getCheckouts = () => client.get<Checkout[]>('/checkouts');
export const returnCheckout = (id: number) => client.put(`/checkouts/${id}/return`, {});

export const getReservations = () => client.get<Reservation[]>('/reservations');
export const createReservation = (bookId: number) => client.post<Reservation>('/reservations', { bookId });
export const cancelReservation = (id: number) => client.put(`/reservations/${id}/cancel`, {});
