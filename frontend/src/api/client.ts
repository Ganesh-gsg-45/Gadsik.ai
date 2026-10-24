import type { Conversation, Document, Message, RetrievalResponse, DocumentSummaryResult } from '../types';
import { supabase } from './supabase';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private async fetchWithAuth(url: string, options: RequestInit = {}, token?: string | null): Promise<Response> {
    let activeToken = token || localStorage.getItem('gadsik_token');
    const headers = new Headers(options.headers || {});
    if (activeToken) {
      headers.set('Authorization', `Bearer ${activeToken}`);
    }
    options.headers = headers;

    let res = await fetch(url, options);

    // If unauthorized (401), automatically refresh session and retry once
    if (res.status === 401) {
      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (!error && data.session) {
          activeToken = data.session.access_token;
          localStorage.setItem('gadsik_token', activeToken);
          headers.set('Authorization', `Bearer ${activeToken}`);
          options.headers = headers;
          res = await fetch(url, options);
        }
      } catch {
        // Fall back to original 401 response
      }
    }

    return res;
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
    const res = await this.fetchWithAuth(
      `${API_BASE_URL}/conversations?limit=${limit}&offset=${offset}`,
      {},
      token
    );
    if (!res.ok) throw new Error(`Failed to list conversations: ${res.statusText}`);
    return res.json();
  }

  async createConversation(token: string, title?: string): Promise<Conversation> {
    const res = await this.fetchWithAuth(
      `${API_BASE_URL}/conversations`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || null }),
      },
      token
    );
    if (!res.ok) throw new Error(`Failed to create conversation: ${res.statusText}`);
    return res.json();
  }

  async getConversation(token: string, id: string): Promise<Conversation> {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/conversations/${id}`, {}, token);
    if (!res.ok) throw new Error(`Failed to get conversation: ${res.statusText}`);
    return res.json();
  }

  async updateConversation(token: string, id: string, title: string): Promise<Conversation> {
    const res = await this.fetchWithAuth(
      `${API_BASE_URL}/conversations/${id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      },
      token
    );
    if (!res.ok) throw new Error(`Failed to update conversation: ${res.statusText}`);
    return res.json();
  }

  async deleteConversation(token: string, id: string): Promise<void> {
    const res = await this.fetchWithAuth(
      `${API_BASE_URL}/conversations/${id}`,
      {
        method: 'DELETE',
      },
      token
    );
    if (!res.ok && res.status !== 204) {
      throw new Error(`Failed to delete conversation: ${res.statusText}`);
    }
  }

  // Messages
  async listMessages(token: string, conversationId: string, limit = 100, offset = 0): Promise<Message[]> {
    const res = await this.fetchWithAuth(
      `${API_BASE_URL}/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`,
      {},
      token
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
    const res = await this.fetchWithAuth(
      `${API_BASE_URL}/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          document_id: documentId || null,
        }),
      },
      token
    );
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

    const res = await this.fetchWithAuth(
      `${API_BASE_URL}/documents/upload`,
      {
        method: 'POST',
        body: formData,
      },
      token
    );

    if (!res.ok && res.status !== 202) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to upload document');
    }
    return res.json();
  }

  async listDocuments(token: string, conversationId: string): Promise<Document[]> {
    const res = await this.fetchWithAuth(
      `${API_BASE_URL}/documents?conversation_id=${conversationId}`,
      {},
      token
    );
    if (!res.ok) throw new Error(`Failed to list documents: ${res.statusText}`);
    return res.json();
  }

  async getDocument(token: string, documentId: string): Promise<Document> {
    const res = await this.fetchWithAuth(`${API_BASE_URL}/documents/${documentId}`, {}, token);
    if (!res.ok) throw new Error(`Failed to get document status: ${res.statusText}`);
    return res.json();
  }

  async retrieveFromDocument(
    token: string,
    documentId: string,
    question: string,
    topK = 5
  ): Promise<RetrievalResponse> {
    const res = await this.fetchWithAuth(
      `${API_BASE_URL}/documents/${documentId}/retrieve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, top_k: topK }),
      },
      token
    );
    if (!res.ok) throw new Error(`Failed to retrieve document chunks: ${res.statusText}`);
    return res.json();
  }

  async summarizeDocument(token: string, documentId: string): Promise<DocumentSummaryResult> {
    const res = await this.fetchWithAuth(
      `${API_BASE_URL}/documents/${documentId}/summarize`,
      {
        method: 'POST',
      },
      token
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to summarize document');
    }
    return res.json();
  }
}

export const api = new ApiClient();
