import type { Conversation, Document, Message, RetrievalResponse, RiskAnalysisResult, FinanceAnalysisResult } from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private getHeaders(token?: string | null): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async checkHealth(): Promise<{ status: string; service: string }> {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  }

  async checkDbHealth(): Promise<{ db_status: string; result: number }> {
    const res = await fetch(`${API_BASE_URL}/health/db`);
    if (!res.ok) throw new Error('DB health check failed');
    return res.json();
  }

  // Conversations
  async listConversations(token: string, limit = 50, offset = 0): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE_URL}/conversations?limit=${limit}&offset=${offset}`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error(`Failed to list conversations: ${res.statusText}`);
    return res.json();
  }

  async createConversation(token: string, title?: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({ title: title || null }),
    });
    if (!res.ok) throw new Error(`Failed to create conversation: ${res.statusText}`);
    return res.json();
  }

  async getConversation(token: string, id: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE_URL}/conversations/${id}`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error(`Failed to get conversation: ${res.statusText}`);
    return res.json();
  }

  async updateConversation(token: string, id: string, title: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE_URL}/conversations/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(token),
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error(`Failed to update conversation: ${res.statusText}`);
    return res.json();
  }

  async deleteConversation(token: string, id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/conversations/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(token),
    });
    if (!res.ok && res.status !== 204) {
      throw new Error(`Failed to delete conversation: ${res.statusText}`);
    }
  }

  // Messages
  async listMessages(token: string, conversationId: string, limit = 100, offset = 0): Promise<Message[]> {
    const res = await fetch(
      `${API_BASE_URL}/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`,
      {
        headers: this.getHeaders(token),
      }
    );
    if (!res.ok) throw new Error(`Failed to list messages: ${res.statusText}`);
    return res.json();
  }

  async sendMessage(
    token: string,
    conversationId: string,
    content: string,
    documentId?: string | null
  ): Promise<Message> {
    const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({
        content,
        document_id: documentId || null,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to send message');
    }
    return res.json();
  }

  // Documents
  async uploadDocument(token: string, conversationId: string, file: File): Promise<Document> {
    const formData = new FormData();
    formData.append('conversation_id', conversationId);
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!res.ok && res.status !== 202) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to upload document');
    }
    return res.json();
  }

  async listDocuments(token: string, conversationId: string): Promise<Document[]> {
    const res = await fetch(`${API_BASE_URL}/documents?conversation_id=${conversationId}`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error(`Failed to list documents: ${res.statusText}`);
    return res.json();
  }

  async getDocument(token: string, documentId: string): Promise<Document> {
    const res = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error(`Failed to get document status: ${res.statusText}`);
    return res.json();
  }

  async retrieveFromDocument(
    token: string,
    documentId: string,
    question: string,
    topK = 5
  ): Promise<RetrievalResponse> {
    const res = await fetch(`${API_BASE_URL}/documents/${documentId}/retrieve`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({ question, top_k: topK }),
    });
    if (!res.ok) throw new Error(`Failed to retrieve document chunks: ${res.statusText}`);
    return res.json();
  }

  async analyzeDocumentRisks(token: string, documentId: string): Promise<RiskAnalysisResult> {
    const res = await fetch(`${API_BASE_URL}/documents/${documentId}/analyze-risks`, {
      method: 'POST',
      headers: this.getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to analyze document risks');
    }
    return res.json();
  }

  async analyzeDocumentFinance(token: string, documentId: string): Promise<FinanceAnalysisResult> {
    const res = await fetch(`${API_BASE_URL}/documents/${documentId}/analyze-finance`, {
      method: 'POST',
      headers: this.getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to analyze document finances');
    }
    return res.json();
  }
}

export const api = new ApiClient();

