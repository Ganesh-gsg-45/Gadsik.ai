export interface User {
  id: string;
  email: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: any;
  tool_results?: any;
  created_at: string;
  tokens_used?: number;
  retrieved_chunks?: {
    chunk_id: string;
    text: string;
    page_number: number;
    distance?: number;
  }[];
}

export interface Document {
  id: string;
  user_id: string;
  conversation_id?: string | null;
  filename: string;
  storage_path: string;
  chroma_collection_id?: string | null;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  error_message?: string | null;
  created_at: string;
}

export interface RetrievedChunk {
  chunk_id: string;
  text: string;
  page_number: number;
  distance: number;
}

export interface RetrievalResponse {
  question: string;
  document_id: string;
  results: RetrievedChunk[];
}

export interface DocumentSummaryResult {
  document_id: string;
  filename: string;
  summary: string;
  tokens_used: number;
}

