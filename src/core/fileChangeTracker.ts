import * as vscode from 'vscode';
import * as path from 'path';
import { FileChange, TimeWindow } from '../cursor/types';

export class FileChangeTracker {
  private recentChanges = new Map<string, FileChange[]>();
  private aiActiveWindow: TimeWindow | null = null;
  private watcher: vscode.FileSystemWatcher | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;

  private readonly MEMORY_RETENTION_MS = 30000; // 30초
  private readonly CLEANUP_INTERVAL_MS = 5000;   // 5초마다 정리

  private readonly IGNORE_PATTERNS = [
    /node_modules/,
    /\.git/,
    /\.vscode/,
    /dist/,
    /out/,
    /build/,
    /\.next/,
    /coverage/,
    /\.DS_Store/,
    /\.env/,
    /package-lock\.json/,
    /yarn\.lock/,
    /\.lock$/
  ];

  public start(): void {
    console.log('[FileChangeTracker] Starting file change tracking...');

    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      console.log('[FileChangeTracker] No workspace folder found, skipping...');
      return;
    }

    this.watcher = vscode.workspace.createFileSystemWatcher(
      '**/*',
      false, // onCreate
      false, // onChange
      false  // onDelete
    );

    this.watcher.onDidCreate((uri) => {
      this.recordChange({
        path: uri.fsPath,
        timestamp: Date.now(),
        type: 'create'
      });
    });

    this.watcher.onDidChange((uri) => {
      this.recordChange({
        path: uri.fsPath,
        timestamp: Date.now(),
        type: 'change'
      });
    });

    this.watcher.onDidDelete((uri) => {
      this.recordChange({
        path: uri.fsPath,
        timestamp: Date.now(),
        type: 'delete'
      });
    });

    this.startCleanupTimer();

    console.log('[FileChangeTracker] ✅ File watcher started successfully');
  }

  public stop(): void {
    console.log('[FileChangeTracker] Stopping file change tracking...');

    if (this.watcher) {
      this.watcher.dispose();
      this.watcher = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.recentChanges.clear();
    console.log('[FileChangeTracker] ✅ File watcher stopped');
  }

  public recordChange(change: FileChange): void {
    if (this.shouldIgnore(change.path)) {
      return;
    }

    const normalizedPath = this.normalizePath(change.path);
    
    if (!this.recentChanges.has(normalizedPath)) {
      this.recentChanges.set(normalizedPath, []);
    }

    const changes = this.recentChanges.get(normalizedPath)!;
    changes.push(change);

    console.log(`[FileChangeTracker] Recorded ${change.type}: ${path.basename(normalizedPath)} at ${new Date(change.timestamp).toISOString()}`);
  }

  public setAIActiveWindow(responseTime: number, windowMs: number = 5000): void {
    this.aiActiveWindow = {
      start: responseTime - windowMs,
      end: responseTime + windowMs
    };

    console.log(`[FileChangeTracker] AI active window set: ${new Date(this.aiActiveWindow.start).toISOString()} ~ ${new Date(this.aiActiveWindow.end).toISOString()}`);

    setTimeout(() => {
      this.aiActiveWindow = null;
      console.log('[FileChangeTracker] AI active window cleared');
    }, windowMs * 2);
  }

  public getChangedFiles(responseTime: number, windowMs: number = 5000): string[] {
    const windowStart = responseTime - windowMs;
    const windowEnd = responseTime + windowMs;

    console.log(`[FileChangeTracker] 🔍 Searching for changes in window:`);
    console.log(`  - Response time: ${new Date(responseTime).toISOString()}`);
    console.log(`  - Window: ${new Date(windowStart).toISOString()} ~ ${new Date(windowEnd).toISOString()}`);

    const changedFiles: Set<string> = new Set();

    for (const [filePath, changes] of this.recentChanges.entries()) {
      for (const change of changes) {
        if (change.timestamp >= windowStart && change.timestamp <= windowEnd) {
          changedFiles.add(filePath);
          console.log(`  ✅ Match: ${path.basename(filePath)} at ${new Date(change.timestamp).toISOString()} (${change.type})`);
          break;
        }
      }
    }

    console.log(`[FileChangeTracker] Found ${changedFiles.size} changed files in window`);
    return Array.from(changedFiles);
  }

  public getRecentChanges(): Map<string, FileChange[]> {
    return new Map(this.recentChanges);
  }

  public clearOldChanges(): void {
    const now = Date.now();
    const cutoffTime = now - this.MEMORY_RETENTION_MS;
    let totalRemoved = 0;

    for (const [filePath, changes] of this.recentChanges.entries()) {
      const filteredChanges = changes.filter(c => c.timestamp >= cutoffTime);
      
      if (filteredChanges.length === 0) {
        this.recentChanges.delete(filePath);
        totalRemoved++;
      } else if (filteredChanges.length !== changes.length) {
        this.recentChanges.set(filePath, filteredChanges);
      }
    }

    if (totalRemoved > 0) {
      console.log(`[FileChangeTracker] Cleaned up ${totalRemoved} old file entries`);
    }
  }

  private shouldIgnore(filePath: string): boolean {
    const normalizedPath = this.normalizePath(filePath);
    
    for (const pattern of this.IGNORE_PATTERNS) {
      if (pattern.test(normalizedPath)) {
        return true;
      }
    }

    return false;
  }

  private normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.clearOldChanges();
    }, this.CLEANUP_INTERVAL_MS);
  }

  public getStats(): { totalFiles: number; totalChanges: number; oldestChange: number | null } {
    let totalChanges = 0;
    let oldestChange: number | null = null;

    for (const changes of this.recentChanges.values()) {
      totalChanges += changes.length;
      
      for (const change of changes) {
        if (oldestChange === null || change.timestamp < oldestChange) {
          oldestChange = change.timestamp;
        }
      }
    }

    return {
      totalFiles: this.recentChanges.size,
      totalChanges,
      oldestChange
    };
  }
}
