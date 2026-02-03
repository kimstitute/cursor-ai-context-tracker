import * as vscode from 'vscode';
import { CursorDB } from './cursor/cursorDB';

export async function activate(context: vscode.ExtensionContext) {
  console.log('[AI Context Tracker] POC - Activating extension...');

  try {
    const cursorDB = new CursorDB();
    
    console.log('[POC] Step 1: Initializing Cursor DB...');
    await cursorDB.initialize();
    console.log(`[POC] ✅ DB Path: ${cursorDB.getDbPath()}`);

    console.log('[POC] Step 2: Reading composers...');
    const composers = await cursorDB.getAllComposers();
    console.log(`[POC] ✅ Found ${composers.length} composers`);

    if (composers.length > 0) {
      const latestComposer = composers[composers.length - 1];
      console.log(`[POC] Latest composer: ${latestComposer.composerId}`);

      console.log('[POC] Step 3: Reading bubbles...');
      const bubbles = await cursorDB.getBubblesForComposer(latestComposer.composerId);
      console.log(`[POC] ✅ Found ${bubbles.length} bubbles`);

      if (bubbles.length > 0) {
        console.log('[POC] Step 4: Sample bubble data:');
        const sampleBubble = bubbles[0];
        console.log(`[POC]   - Type: ${sampleBubble.type}`);
        console.log(`[POC]   - Text (first 100 chars): ${sampleBubble.text.substring(0, 100)}...`);
        console.log(`[POC]   - Created: ${new Date(sampleBubble.createdAt).toISOString()}`);
      }

      console.log('[POC] Step 5: Getting latest AI bubble...');
      const latestAIBubble = await cursorDB.getLatestAIBubble();
      if (latestAIBubble) {
        console.log(`[POC] ✅ Latest AI response found`);
        console.log(`[POC]   - Bubble ID: ${latestAIBubble.bubbleId}`);
        console.log(`[POC]   - Text (first 200 chars): ${latestAIBubble.text.substring(0, 200)}...`);
      } else {
        console.log('[POC] ℹ️ No AI bubbles found');
      }
    }

    cursorDB.close();

    vscode.window.showInformationMessage(
      `[POC] ✅ Cursor DB 접근 검증 완료! Composers: ${composers.length}개`
    );

    console.log('[POC] ========================================');
    console.log('[POC] Day 1-2 완료: Cursor DB 접근 검증 성공');
    console.log('[POC] ========================================');

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[POC] ❌ Error:', errorMsg);
    vscode.window.showErrorMessage(`[POC] Cursor DB 접근 실패: ${errorMsg}`);
  }
}

export function deactivate() {
  console.log('[AI Context Tracker] POC - Deactivating extension');
}
