import { Component, OnInit, OnDestroy } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SermonSearchService, SermonDoc } from '../../../core/services/sermon-search.service';

@Component({
  selector: 'app-sermon-docs',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule, MatProgressBarModule,
    MatChipsModule, MatSnackBarModule
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

      <p class="hint">Upload PDFs individually below, or drop all PDF files into the <strong>api/sermon-pdfs/</strong> folder on the server and click <strong>Index All</strong>.</p>

      <div class="bulk-row">
        <button mat-stroked-button color="accent" (click)="indexAll()" [disabled]="jobStatus.isRunning || indexingAll">
          <mat-spinner *ngIf="indexingAll" diameter="16" style="display:inline-block;margin-right:6px;"></mat-spinner>
          <mat-icon *ngIf="!indexingAll">auto_fix_high</mat-icon>
          Index All New PDFs from Server Folder
        </button>
        <span *ngIf="indexAllResult && !jobStatus.isRunning" class="index-result">{{ indexAllResult }}</span>
      </div>

      <div *ngIf="jobStatus.isRunning" class="job-progress">
        <div class="job-header">
          <mat-spinner diameter="18"></mat-spinner>
          <span class="job-label">
            Indexing {{ jobStatus.completed }} of {{ jobStatus.total }} PDFs...
            <span *ngIf="jobStatus.currentFile" class="current-file">{{ jobStatus.currentFile }}</span>
          </span>
        </div>
        <mat-progress-bar
          mode="determinate"
          [value]="jobStatus.total > 0 ? (jobStatus.completed / jobStatus.total) * 100 : 0">
        </mat-progress-bar>
        <div *ngIf="jobStatus.failed > 0" class="job-errors">
          {{ jobStatus.failed }} file(s) failed.
        </div>
      </div>

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
    .bulk-row { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .index-result { font-size: 0.85rem; color: #2e7d32; font-weight: 500; }
    .job-progress { background: #f5f5f5; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .job-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .job-label { font-size: 0.9rem; color: #333; }
    .current-file { color: #666; font-size: 0.82rem; margin-left: 6px; }
    .job-errors { margin-top: 8px; font-size: 0.82rem; color: #c62828; }
  `]
})
export class SermonDocsComponent implements OnInit, OnDestroy {
  docs: SermonDoc[] = [];
  columns = ['title', 'pages', 'status', 'uploaded', 'actions'];
  uploading = false;
  indexingAll = false;
  indexAllResult = '';
  busy: Record<number, boolean> = {};
  pollSub: Subscription | null = null;
  jobStatus = { isRunning: false, total: 0, completed: 0, failed: 0, currentFile: '' };

  constructor(private svc: SermonSearchService, private snack: MatSnackBar) {}

  ngOnInit() { this.load(); }

  ngOnDestroy() { this.stopPolling(); }

  load() {
    this.svc.getDocs().subscribe(d => this.docs = d);
  }

  private startPolling() {
    this.stopPolling();
    this.pollSub = interval(2000).pipe(
      switchMap(() => this.svc.getIndexStatus())
    ).subscribe(status => {
      this.jobStatus = {
        isRunning: status.isRunning,
        total: status.total,
        completed: status.completed,
        failed: status.failed,
        currentFile: status.currentFile
      };
      if (!status.isRunning) {
        this.stopPolling();
        this.load();
        if (status.completed > 0) {
          const msg = status.failed > 0
            ? `Indexed ${status.completed} PDF(s). ${status.failed} failed.`
            : `Successfully indexed ${status.completed} PDF(s).`;
          this.snack.open(msg, 'OK', { duration: 5000 });
        }
      }
    });
  }

  private stopPolling() {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
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

  indexAll() {
    this.indexingAll = true;
    this.indexAllResult = '';
    this.svc.indexAll().subscribe({
      next: res => {
        this.indexingAll = false;
        if (res.queued > 0) {
          this.jobStatus = { isRunning: true, total: res.queued, completed: 0, failed: 0, currentFile: '' };
          this.startPolling();
        } else {
          this.indexAllResult = res.message;
        }
      },
      error: () => {
        this.indexingAll = false;
        this.indexAllResult = 'Failed. Check that PDFs are in the sermon-pdfs folder.';
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
