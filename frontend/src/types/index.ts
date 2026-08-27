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

export interface RiskItem {
  category: 'compliance' | 'legal' | 'financial';
  clause_evidence: string;
  page_number: number | null;
  severity: 'high' | 'medium' | 'low';
  explanation: string;
  recommendation: string;
}

export interface RiskAnalysisResult {
  document_id: string;
  overall_risk_score: number;
  overall_risk_level: 'low' | 'medium' | 'high';
  summary: string;
  risks: RiskItem[];
  tokens_used: number;
}

export interface FinancialTerm {
  category: 'settlement_terms' | 'fee_structure' | 'penalties_and_chargebacks' | 'cash_flow_impact';
  clause_evidence: string;
  page_number: number | null;
  impact: 'favorable' | 'neutral' | 'unfavorable';
  estimated_impact: string;
  recommendation: string;
}

export interface FinanceAnalysisResult {
  document_id: string;
  financial_health_score: number;
  financial_health_level: 'poor' | 'moderate' | 'good';
  summary: string;
  financial_terms: FinancialTerm[];
  tokens_used: number;
}
