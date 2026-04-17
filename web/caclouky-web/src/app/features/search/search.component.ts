import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { SermonSearchService, Citation } from '../../core/services/sermon-search.service';

interface Message {
  role: 'user' | 'ai';
  text: string;
  citations?: Citation[];
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatInputModule, MatFormFieldModule,
    MatIconModule, MatProgressSpinnerModule, MatCardModule, MatChipsModule
  ],
  template: `
    <div class="search-page">
      <div class="search-header">
        <mat-icon class="header-icon">auto_stories</mat-icon>
        <div>
          <h1>Sermon Search</h1>
          <p>Ask questions about Bro. Sowders' teachings — powered by AI</p>
        </div>
      </div>

      <div class="chat-container" #chatContainer>
        <div *ngIf="messages.length === 0" class="empty-state">
          <mat-icon>search</mat-icon>
          <p>Ask a question about Bro. Sowders' sermons and teachings</p>
          <div class="suggestions">
            <button mat-stroked-button *ngFor="let s of suggestions" (click)="sendSuggestion(s)">{{s}}</button>
          </div>
        </div>

        <div *ngFor="let msg of messages" class="message" [class.user]="msg.role === 'user'" [class.ai]="msg.role === 'ai'">
          <div class="message-bubble">
            <div *ngIf="msg.role === 'ai'" class="ai-label">
              <mat-icon>smart_toy</mat-icon> AI Answer
            </div>
            <p class="message-text">{{ msg.text }}</p>
            <div *ngIf="msg.citations && msg.citations.length" class="citations">
              <div class="citations-label">Sources</div>
              <div *ngFor="let c of msg.citations" class="citation">
                <mat-icon>picture_as_pdf</mat-icon>
                {{ c.documentTitle }} — Page {{ c.pageNumber }}
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="loading" class="message ai">
          <div class="message-bubble loading-bubble">
            <mat-spinner diameter="20"></mat-spinner>
            <span>Searching sermons...</span>
          </div>
        </div>
      </div>

      <div class="input-row">
        <mat-form-field appearance="outline" class="question-field">
          <input matInput
            [(ngModel)]="question"
            placeholder="Ask a question about the sermons..."
            (keydown.enter)="send()"
            [disabled]="loading" />
        </mat-form-field>
        <button mat-fab color="primary" (click)="send()" [disabled]="loading || !question.trim()">
          <mat-icon>send</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .search-page {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 64px);
      max-width: 860px;
      margin: 0 auto;
      padding: 16px;
    }
    .search-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e0e0e0;
      margin-bottom: 8px;
    }
    .header-icon { font-size: 2rem; width: 2rem; height: 2rem; color: #1976d2; }
    h1 { margin: 0; font-size: 1.4rem; }
    p { margin: 0; color: #666; font-size: 0.88rem; }

    .chat-container {
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      gap: 12px;
      color: #999;
      mat-icon { font-size: 3rem; width: 3rem; height: 3rem; }
    }
    .suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      margin-top: 8px;
    }
    .suggestions button { font-size: 0.82rem; }

    .message { display: flex; }
    .message.user { justify-content: flex-end; }
    .message.ai   { justify-content: flex-start; }

    .message-bubble {
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 0.9rem;
      line-height: 1.6;
    }
    .message.user .message-bubble {
      background: #1976d2;
      color: white;
      border-bottom-right-radius: 4px;
    }
    .message.ai .message-bubble {
      background: white;
      border: 1px solid #e0e0e0;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }

    .ai-label {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.72rem;
      font-weight: 700;
      color: #1976d2;
      margin-bottom: 6px;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    }
    .message-text { margin: 0; white-space: pre-wrap; }

    .citations {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid #eee;
    }
    .citations-label {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #999;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .citation {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.76rem;
      color: #1976d2;
      mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
    }

    .loading-bubble {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #999;
      font-size: 0.85rem;
    }

    .input-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-top: 8px;
      border-top: 1px solid #e0e0e0;
    }
    .question-field { flex: 1; }
  `]
})
export class SearchComponent {
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  question = '';
  loading  = false;
  messages: Message[] = [];

  suggestions = [
    'What did Bro. Sowders teach about long hair?',
    'What did he teach about baptism?',
    'What are his teachings on the church order?'
  ];

  constructor(private svc: SermonSearchService) {}

  sendSuggestion(s: string) {
    this.question = s;
    this.send();
  }

  send() {
    const q = this.question.trim();
    if (!q || this.loading) return;

    this.messages.push({ role: 'user', text: q });
    this.question = '';
    this.loading  = true;
    this.scrollDown();

    this.svc.chat(q).subscribe({
      next: res => {
        this.messages.push({ role: 'ai', text: res.answer, citations: res.citations });
        this.loading = false;
        this.scrollDown();
      },
      error: () => {
        this.messages.push({ role: 'ai', text: 'Sorry, something went wrong. Please try again.' });
        this.loading = false;
        this.scrollDown();
      }
    });
  }

  private scrollDown() {
    setTimeout(() => {
      const el = this.chatContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }
}
