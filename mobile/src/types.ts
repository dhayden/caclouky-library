export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

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
  isRestricted: boolean;
}

export interface BooksResponse {
  total: number;
  page: number;
  pageSize: number;
  books: Book[];
}

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

export interface Reservation {
  id: number;
  reservedAt: string;
  availableAt?: string;
  status: 'Pending' | 'Ready' | 'Fulfilled' | 'Cancelled';
  book: { id: number; title: string; author: string };
  user: { id: string; firstName: string; lastName: string };
}

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  memberSince: string;
  isActive: boolean;
  roles: string[];
}

export interface Citation {
  documentTitle: string;
  fileName: string;
  pageNumber: number;
  snippet: string;
  sermonDate?: string | null;
  sectionTitle?: string | null;
}

export interface TextSearchResult {
  documentTitle: string;
  fileName: string;
  pageNumber: number;
  snippet: string;
  sermonDate?: string | null;
  sectionTitle?: string | null;
}

export interface ScriptureRef {
  reference: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
  scriptures: ScriptureRef[];
}

export interface BibleVerse {
  id: number;
  bookNumber: number;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface SearchHistory {
  id: number;
  query: string;
  type: string;
  createdAt: string;
}

export interface UserHighlight {
  id: number;
  sourceType: string;
  sourceRef: string;
  selectedText: string;
  color: string;
  createdAt: string;
}

export interface NoteFolder {
  id: number;
  name: string;
  color?: string;
  createdAt: string;
  noteCount: number;
}

export interface UserNote {
  id: number;
  title: string;
  content: string;
  sourceType?: string;
  sourceRef?: string;
  folderId?: number;
  createdAt: string;
  updatedAt: string;
}
