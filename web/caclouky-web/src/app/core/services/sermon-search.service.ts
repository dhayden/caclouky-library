import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface SermonDoc {
  id: number;
  title: string;
  fileName: string;
  pageCount: number;
  uploadedAt: string;
  isIndexed: boolean;
  indexedAt: string | null;
}

export interface Citation {
  documentTitle: string;
  fileName: string;
  pageNumber: number;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
}

@Injectable({ providedIn: 'root' })
export class SermonSearchService {
  private readonly base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  getDocs() {
    return this.http.get<SermonDoc[]>(`${this.base}/sermon-docs`);
  }

  upload(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<SermonDoc>(`${this.base}/sermon-docs/upload`, form);
  }

  reindex(id: number) {
    return this.http.post<void>(`${this.base}/sermon-docs/${id}/reindex`, {});
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.base}/sermon-docs/${id}`);
  }

  chat(question: string) {
    return this.http.post<ChatResponse>(`${this.base}/search/chat`, { question });
  }
}
