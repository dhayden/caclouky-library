import client from './client';
import type { Book, BooksResponse, Checkout, Reservation, Member, SermonDoc, IndexStatus, ChatResponse, BibleVerse, SearchHistory, UserHighlight, UserNote } from '../types';

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

// Bible
export const getBibleBooks = () => client.get<string[]>('/bible/books');
export const searchBible = (q: string, limit = 30) => client.get<BibleVerse[]>('/bible/search', { params: { q, limit } });
export const getBibleChapter = (book: string, chapter: number) => client.get<BibleVerse[]>(`/bible/${encodeURIComponent(book)}/${chapter}`);
export const getBibleVerses = (book: string, chapter: number, verseStart: number, verseEnd: number) =>
  client.get<BibleVerse[]>(`/bible/${encodeURIComponent(book)}/${chapter}/${verseStart}/${verseEnd}`);
export const getBibleCrossReferences = (book: string, chapter: number) =>
  client.get<Record<string, { documentTitle: string; fileName: string; pageNumber: number }[]>>(
    `/bible/${encodeURIComponent(book)}/${chapter}/cross-references`
  );
export const getBibleChapterNotes = (book: string, chapter: number) =>
  client.get<Record<string, { id: number; title: string; content: string; updatedAt: string }[]>>(
    `/bible/${encodeURIComponent(book)}/${chapter}/notes`
  );

// Search history
export const getSearchHistory = (type?: string) => client.get<SearchHistory[]>('/search-history', { params: { type } });
export const saveSearchHistory = (query: string, type: string) => client.post('/search-history', { query, type });
export const deleteSearchHistory = (id: number) => client.delete(`/search-history/${id}`);
export const clearSearchHistory = () => client.delete('/search-history');

// Highlights
export const getHighlights = (sourceType?: string, sourceRef?: string) =>
  client.get<UserHighlight[]>('/highlights', { params: { sourceType, sourceRef } });
export const createHighlight = (sourceType: string, sourceRef: string, selectedText: string, color?: string) =>
  client.post<UserHighlight>('/highlights', { sourceType, sourceRef, selectedText, color });
export const deleteHighlight = (id: number) => client.delete(`/highlights/${id}`);

// Notes
export const getNotes = () => client.get<UserNote[]>('/notes');
export const getNote = (id: number) => client.get<UserNote>(`/notes/${id}`);
export const createNote = (data: { title: string; content: string; sourceType?: string; sourceRef?: string }) =>
  client.post<UserNote>('/notes', data);
export const updateNote = (id: number, data: { title: string; content: string; sourceType?: string; sourceRef?: string }) =>
  client.put<UserNote>(`/notes/${id}`, data);
export const deleteNote = (id: number) => client.delete(`/notes/${id}`);
