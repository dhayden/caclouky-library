import client from './client';
import type { Book, BooksResponse, Checkout, Reservation, Member, AuthUser, ChatResponse } from '../types';

export const login = (email: string, password: string) =>
  client.post<{ token: string; user: AuthUser }>('/auth/login', { email, password });

export const register = (data: { firstName: string; lastName: string; email: string; password: string }) =>
  client.post('/auth/register', data);

export const getBooks = (params: { search?: string; genre?: string; page?: number; pageSize?: number }) =>
  client.get<BooksResponse>('/books', { params });

export const getBook = (id: number) => client.get<Book>(`/books/${id}`);
export const getGenres = () => client.get<string[]>('/books/genres');

export const getCheckouts = () => client.get<Checkout[]>('/checkouts');
export const createCheckout = (bookId: number, userId: string, loanDays = 14) =>
  client.post<Checkout>('/checkouts', { bookId, userId, loanDays });
export const returnCheckout = (id: number) => client.put(`/checkouts/${id}/return`, {});

export const getReservations = () => client.get<Reservation[]>('/reservations');
export const createReservation = (bookId: number) => client.post<Reservation>('/reservations', { bookId });
export const cancelReservation = (id: number) => client.put(`/reservations/${id}/cancel`, {});
export const readyReservation = (id: number) => client.put(`/reservations/${id}/ready`, {});
export const fulfillReservation = (id: number) => client.put(`/reservations/${id}/fulfill`, {});

export const getMembers = () => client.get<Member[]>('/members');
export const createMember = (data: object) => client.post('/members', data);
export const updateMember = (id: string, data: object) => client.put(`/members/${id}`, data);
export const deactivateMember = (id: string) => client.put(`/members/${id}/deactivate`, {});

export const chatSearch = (question: string) =>
  client.post<ChatResponse>('/search/chat', { question });

export const getSermonPage = (fileName: string, pageNumber: number) =>
  client.get<{ title: string; fileName: string; pageNumber: number; pageCount: number; text: string }>(
    `/sermon-docs/page/${encodeURIComponent(fileName)}/${pageNumber}`
  );

// Bible
export const getBibleBooks = () => client.get<string[]>('/bible/books');
export const searchBible = (q: string, limit = 30) => client.get<BibleVerse[]>('/bible/search', { params: { q, limit } });
export const getBibleChapter = (book: string, chapter: number) => client.get<BibleVerse[]>(`/bible/${encodeURIComponent(book)}/${chapter}`);
export const getBibleVerses = (book: string, chapter: number, verseStart: number, verseEnd: number) =>
  client.get<BibleVerse[]>(`/bible/${encodeURIComponent(book)}/${chapter}/${verseStart}/${verseEnd}`);

// Search history
export const getSearchHistory = (type?: string) => client.get<SearchHistory[]>('/search-history', { params: { type } });
export const saveSearchHistory = (query: string, type: string) => client.post('/search-history', { query, type });
export const deleteSearchHistory = (id: number) => client.delete(`/search-history/${id}`);
export const clearSearchHistory = () => client.delete('/search-history');
