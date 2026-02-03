export interface Composer {
  composerId: string;
  conversationId: string;
  createdAt: number;
  updatedAt?: number;
}

export interface Bubble {
  bubbleId: string;
  composerId: string;
  type: 'user' | 'assistant';
  text: string;
  createdAt: number;
  modelType?: string;
  selections?: { text: string; file?: string }[];
}

export interface AICodeMetadata {
  prompt: string;
  aiResponse: string;
  timestamp: number;
  commitHash?: string;
  filePath: string;
  lineRanges: { start: number; end: number }[];
  composerId: string;
  bubbleId: string;
  modelType?: string;
  userSelections?: { text: string; file?: string }[];
}
