import client from './client';
import type { Book, BooksResponse, Checkout, Reservation, Member, AuthUser, ChatResponse, TextSearchResult, NoteFolder, UserNote, UserHighlight, BibleVerse, SearchHistory } from '../types';

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

export const textSearch = (query: string) =>
  client.post<{ results: TextSearchResult[] }>('/search/text', { query });

export const getScriptureTeaching = (book: string, chapter: number, verse: number) =>
  client.get<{ reference: string; teaching: string; generatedAt: string; fromStore: boolean }>(
    '/search/scripture-teaching', { params: { book, chapter, verse } }
  );

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

// Highlights
export const getHighlights = (sourceType?: string, sourceRef?: string) =>
  client.get<UserHighlight[]>('/highlights', { params: { sourceType, sourceRef } });
export const createHighlight = (sourceType: string, sourceRef: string, selectedText: string, color?: string) =>
  client.post<UserHighlight>('/highlights', { sourceType, sourceRef, selectedText, color });
export const deleteHighlight = (id: number) => client.delete(`/highlights/${id}`);

// Notes
export const getNotes = (folderId?: number) =>
  client.get<UserNote[]>('/notes', { params: folderId != null ? { folderId } : {} });
export const createNote = (data: { title: string; content: string; sourceType?: string; sourceRef?: string; folderId?: number }) =>
  client.post<UserNote>('/notes', data);
export const updateNote = (id: number, data: { title: string; content: string; sourceType?: string; sourceRef?: string; folderId?: number }) =>
  client.put<UserNote>(`/notes/${id}`, data);
export const deleteNote = (id: number) => client.delete(`/notes/${id}`);

// Note Folders
export const getNoteFolders = () => client.get<NoteFolder[]>('/note-folders');
export const createNoteFolder = (name: string, color?: string) => client.post<NoteFolder>('/note-folders', { name, color });
export const updateNoteFolder = (id: number, name: string, color?: string) => client.put<NoteFolder>(`/note-folders/${id}`, { name, color });
export const deleteNoteFolder = (id: number) => client.delete(`/note-folders/${id}`);
