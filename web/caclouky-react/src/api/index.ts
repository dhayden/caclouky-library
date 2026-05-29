import client from './client';
import type { Book, BooksResponse, Checkout, Reservation, Member, SermonDoc, IndexStatus, ChatResponse } from '../types';

// Auth
export const login = (email: string, password: string) =>
  client.post<{ token: string; user: import('../types').AuthUser }>('/auth/login', { email, password });

export const register = (data: { firstName: string; lastName: string; email: string; password: string }) =>
  client.post('/auth/register', data);

// Books
export const getBooks = (params: { search?: string; genre?: string; page?: number; pageSize?: number }) =>
  client.get<BooksResponse>('/books', { params });

export const getBook = (id: number) => client.get<Book>(`/books/${id}`);
export const getGenres = () => client.get<string[]>('/books/genres');
export const createBook = (data: Partial<Book>) => client.post<Book>('/books', data);
export const updateBook = (id: number, data: Partial<Book>) => client.put<Book>(`/books/${id}`, { id, ...data });
export const deleteBook = (id: number) => client.delete(`/books/${id}`);

// Checkouts
export const getCheckouts = () => client.get<Checkout[]>('/checkouts');
export const createCheckout = (bookId: number, userId: string, loanDays = 14) =>
  client.post<Checkout>('/checkouts', { bookId, userId, loanDays });
export const returnCheckout = (id: number) => client.put(`/checkouts/${id}/return`, {});

// Reservations
export const getReservations = () => client.get<Reservation[]>('/reservations');
export const createReservation = (bookId: number) => client.post<Reservation>('/reservations', { bookId });
export const cancelReservation = (id: number) => client.put(`/reservations/${id}/cancel`, {});
export const readyReservation = (id: number) => client.put(`/reservations/${id}/ready`, {});
export const fulfillReservation = (id: number) => client.put(`/reservations/${id}/fulfill`, {});

// Members
export const getMembers = () => client.get<Member[]>('/members');
export const getMember = (id: string) => client.get<Member>(`/members/${id}`);
export const createMember = (data: object) => client.post('/members', data);
export const updateMember = (id: string, data: object) => client.put(`/members/${id}`, data);
export const deactivateMember = (id: string) => client.put(`/members/${id}/deactivate`, {});

// Sermon Docs
export const getSermonDocs = () => client.get<SermonDoc[]>('/sermon-docs');
export const uploadSermonDoc = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return client.post<SermonDoc>('/sermon-docs/upload', form);
};
export const reindexSermonDoc = (id: number) => client.post(`/sermon-docs/${id}/reindex`, {});
export const deleteSermonDoc = (id: number) => client.delete(`/sermon-docs/${id}`);
export const indexAllSermonDocs = () => client.post<{ message: string; queued: number }>('/sermon-docs/index-all', {});
export const getIndexStatus = () => client.get<IndexStatus>('/sermon-docs/index-status');

// Search
export const chatSearch = (question: string) =>
  client.post<ChatResponse>('/search/chat', { question });
