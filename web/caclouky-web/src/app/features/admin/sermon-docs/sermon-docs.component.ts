import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SermonSearchService, SermonDoc } from '../../../core/services/sermon-search.service';

@Component({
  selector: 'app-sermon-docs',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule, MatChipsModule, MatSnackBarModule
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <h2>Sermon PDF Management</h2>
        <button mat-raised-button color="primary" (click)="fileInput.click()">
          <mat-icon>upload_file</mat-icon> Upload PDF
        </button>
        <input #fileInput type="file" accept=".pdf" hidden (change)="onFileSelected($event)" />
      </div>

      <p class="hint">Upload Bro. Sowders' sermon PDFs. Each file is automatically indexed for AI search after upload.</p>

      <div *ngIf="uploading" class="upload-progress">
        <mat-spinner diameter="24"></mat-spinner>
        <span>Uploading and indexing — this may take a minute...</span>
      </div>

      <table mat-table [dataSource]="docs" class="docs-table">
        <ng-container matColumnDef="title">
          <th mat-header-cell *matHeaderCellDef>Document</th>
          <td mat-cell *matCellDef="let d">
            <div class="doc-name">{{ d.title }}</div>
            <div class="doc-file">{{ d.fileName }}</div>
          </td>
        </ng-container>

        <ng-container matColumnDef="pages">
          <th mat-header-cell *matHeaderCellDef>Pages</th>
          <td mat-cell *matCellDef="let d">{{ d.pageCount }}</td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let d">
            <mat-chip *ngIf="d.isIndexed" color="primary" highlighted>Indexed</mat-chip>
            <mat-chip *ngIf="!d.isIndexed">Pending</mat-chip>
          </td>
        </ng-container>

        <ng-container matColumnDef="uploaded">
          <th mat-header-cell *matHeaderCellDef>Uploaded</th>
          <td mat-cell *matCellDef="let d">{{ d.uploadedAt | date:'mediumDate' }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let d">
            <button mat-icon-button title="Re-index" (click)="reindex(d)" [disabled]="busy[d.id]">
              <mat-icon>refresh</mat-icon>
            </button>
            <button mat-icon-button color="warn" title="Delete" (click)="delete(d)" [disabled]="busy[d.id]">
              <mat-icon>delete</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns;"></tr>

        <tr *matNoDataRow>
          <td [colSpan]="columns.length" class="no-data">No sermon PDFs uploaded yet.</td>
        </tr>
      </table>
    </div>
  `,
  styles: [`
    .page { padding: 24px; }
    .page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
    h2 { margin: 0; flex: 1; }
    .hint { color: #666; font-size: 0.88rem; margin-bottom: 20px; }
    .upload-progress { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; color: #555; }
    .docs-table { width: 100%; }
    .doc-name { font-weight: 500; }
    .doc-file { font-size: 0.78rem; color: #999; }
    .no-data { text-align: center; padding: 32px; color: #999; }
  `]
})
export class SermonDocsComponent implements OnInit {
  docs: SermonDoc[] = [];
  columns = ['title', 'pages', 'status', 'uploaded', 'actions'];
  uploading = false;
  busy: Record<number, boolean> = {};

  constructor(private svc: SermonSearchService, private snack: MatSnackBar) {}

  ngOnInit() { this.load(); }

  load() {
    this.svc.getDocs().subscribe(d => this.docs = d);
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploading = true;
    this.svc.upload(file).subscribe({
      next: doc => {
        this.uploading = false;
        this.snack.open(`"${doc.title}" uploaded and indexed.`, 'OK', { duration: 4000 });
        this.load();
      },
      error: () => {
        this.uploading = false;
        this.snack.open('Upload failed. Please try again.', 'OK', { duration: 4000 });
      }
    });
  }

  reindex(doc: SermonDoc) {
    this.busy[doc.id] = true;
    this.svc.reindex(doc.id).subscribe({
      next: () => {
        this.busy[doc.id] = false;
        this.snack.open(`"${doc.title}" re-indexed.`, 'OK', { duration: 3000 });
        this.load();
      },
      error: () => { this.busy[doc.id] = false; }
    });
  }

  delete(doc: SermonDoc) {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    this.busy[doc.id] = true;
    this.svc.delete(doc.id).subscribe({
      next: () => {
        this.busy[doc.id] = false;
        this.snack.open(`"${doc.title}" deleted.`, 'OK', { duration: 3000 });
        this.load();
      },
      error: () => { this.busy[doc.id] = false; }
    });
  }
}
