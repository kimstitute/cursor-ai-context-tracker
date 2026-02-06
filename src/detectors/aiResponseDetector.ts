import * as vscode from 'vscode';
import * as fs from 'fs';
import { CursorDB } from '../cursor/cursorDB';
import { Bubble } from '../cursor/types';
import { FileChangeTracker } from '../core/fileChangeTracker';

export class AIResponseDetector {
  private cursorDB: CursorDB;
  private fileChangeTracker: FileChangeTracker;
  private pollingInterval: NodeJS.Timeout | null = null;
  private fileWatcher: vscode.FileSystemWatcher | null = null;
  private isProcessing: boolean = false;
  private lastProcessedBubbleId: string | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(cursorDB: CursorDB, fileChangeTracker: FileChangeTracker) {
    this.cursorDB = cursorDB;
    this.fileChangeTracker = fileChangeTracker;
  }

  public startPolling(): void {
    console.log('[AIResponseDetector] Starting polling (5s interval)...');
    
    this.checkForNewResponses();
    
    this.pollingInterval = setInterval(() => {
      this.checkForNewResponses();
    }, 5000);

    this.setupFileWatcher();
  }

  public stopPolling(): void {
    console.log('[AIResponseDetector] Stopping polling...');
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    if (this.fileWatcher) {
      this.fileWatcher.dispose();
      this.fileWatcher = null;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private setupFileWatcher(): void {
    const dbPath = this.cursorDB.getDbPath();
    if (!fs.existsSync(dbPath)) {
      console.log('[AIResponseDetector] DB file not found, skipping file watcher');
      return;
    }

    try {
      const dbUri = vscode.Uri.file(dbPath);
      this.fileWatcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(dbUri, '*')
      );

      this.fileWatcher.onDidChange(() => {
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
          console.log('[AIResponseDetector] DB file changed, checking for new responses...');
          this.checkForNewResponses();
        }, 500);
      });

      console.log('[AIResponseDetector] File watcher set up successfully');
    } catch (error) {
      console.error('[AIResponseDetector] Failed to set up file watcher:', error);
    }
  }

  private async checkForNewResponses(): Promise<void> {
    if (this.isProcessing) {
      console.log('[AIResponseDetector] Already processing, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      await this.checkForNewResponsesWithRetry();
    } catch (error) {
      console.error('[AIResponseDetector] Error checking for new responses:', error);
    } finally {
      this.cursorDB.close();
      this.isProcessing = false;
    }
  }

  private async checkForNewResponsesWithRetry(maxRetries: number = 3): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.cursorDB.initialize();
        
        const latestAIBubble = await this.cursorDB.getLatestAIBubble();

        if (!latestAIBubble) {
          console.log('[AIResponseDetector] No AI bubbles found');
          return;
        }

        if (this.lastProcessedBubbleId === latestAIBubble.bubbleId) {
          return;
        }
        
        console.log(`[AIResponseDetector] 🔍 New bubble detected!`);
        console.log(`  - Latest: ${latestAIBubble.bubbleId.substring(0, 16)}...`);
        console.log(`  - Previous: ${this.lastProcessedBubbleId ? this.lastProcessedBubbleId.substring(0, 16) + '...' : 'none'}`);

        console.log(`[AIResponseDetector] ✅ New AI response detected: ${latestAIBubble.bubbleId}`);
        await this.processAIBubble(latestAIBubble);
        
        this.lastProcessedBubbleId = latestAIBubble.bubbleId;
        return;

      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof Error && error.message.includes('malformed')) {
          console.log(`[AIResponseDetector] DB malformed (attempt ${attempt}/${maxRetries}), retrying in ${attempt * 200}ms...`);
          
          this.cursorDB.close();
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, attempt * 200));
            continue;
          }
        }
        
        throw error;
      }
    }

    if (lastError) {
      throw lastError;
    }
  }

  private async processAIBubble(bubble: Bubble): Promise<void> {
    const timestamp = new Date(bubble.createdAt).toISOString();
    const preview = bubble.text.substring(0, 60).replace(/\n/g, ' ');
    
    console.log(`[AIResponseDetector] 📨 Processing bubble: ${bubble.bubbleId.substring(0, 8)}... at ${timestamp}`);
    console.log(`[AIResponseDetector]    Preview: "${preview}..."`);

    const userBubbles = await this.getUserBubblesForComposer(bubble.composerId);
    if (userBubbles.length > 0) {
      const latestUserBubble = userBubbles[userBubbles.length - 1];
      const userPrompt = latestUserBubble.text.substring(0, 60).replace(/\n/g, ' ');
      console.log(`[AIResponseDetector]    User prompt: "${userPrompt}..."`);
    }

    const responseTime = bubble.createdAt;
    this.fileChangeTracker.setAIActiveWindow(responseTime, 10000);

    const changedFiles = this.fileChangeTracker.getChangedFiles(responseTime, 10000);
    
    if (changedFiles.length > 0) {
      console.log(`[AIResponseDetector] 📁 Changed files (${changedFiles.length}):`);
      changedFiles.forEach((file, index) => {
        const fileName = file.split(/[\\/]/).pop() || file;
        console.log(`  ${index + 1}. ${fileName}`);
      });
    } else {
      console.log(`[AIResponseDetector] 📁 No files changed in ±10s window`);
    }

    const stats = this.fileChangeTracker.getStats();
    console.log(`[AIResponseDetector] 📊 Stats: ${stats.totalFiles} files tracked, ${stats.totalChanges} changes total`);

    vscode.window.showInformationMessage(
      `✅ AI response: ${changedFiles.length} file(s) changed`
    );
  }

  private async getUserBubblesForComposer(composerId: string): Promise<Bubble[]> {
    try {
      const allBubbles = await this.cursorDB.getBubblesForComposer(composerId);
      return allBubbles.filter(b => b.type === 'user');
    } catch (error) {
      console.error('[AIResponseDetector] Failed to get user bubbles:', error);
      return [];
    }
  }

  public getLastProcessedBubbleId(): string | null {
    return this.lastProcessedBubbleId;
  }

  public resetProcessedBubbleId(): void {
    console.log('[AIResponseDetector] Resetting last processed bubble ID');
    this.lastProcessedBubbleId = null;
  }
}
