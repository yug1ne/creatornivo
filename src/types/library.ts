export interface SavedPrompt {
  id: string;
  userId: string;
  title: string;
  content: string;
  templateId: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Generation {
  id: string;
  userId: string;
  templateId: string | null;
  prompt: string;
  result: string;
  model: string;
  tokensUsed: number;
  createdAt: Date;
}