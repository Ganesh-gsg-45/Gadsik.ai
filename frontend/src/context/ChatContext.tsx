import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import type { Conversation, Document, Message } from '../types';
import { useAuth } from './AuthContext';

interface ChatContextType {
  conversations: Conversation[];
  currentConversationId: string | null;
  currentConversation: Conversation | null;
  messages: Message[];
  documents: Document[];
  activeDocument: Document | null;
  isGenerating: boolean;
  isUploading: boolean;
  searchQuery: string;
  backendHealthy: boolean;
  setSearchQuery: (query: string) => void;
  selectConversation: (id: string) => Promise<void>;
  newChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  uploadDocument: (file: File) => Promise<Document | null>;
  setActiveDocument: (doc: Document | null) => void;
  refreshConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDocument, setActiveDocument] = useState<Document | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [backendHealthy, setBackendHealthy] = useState<boolean>(false);

  // Check health periodically
  useEffect(() => {
    const check = async () => {
      try {
        await api.checkHealth();
        setBackendHealthy(true);
      } catch {
        setBackendHealthy(false);
      }
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  const refreshConversations = useCallback(async () => {
    if (!token) return;
    try {
      const list = await api.listConversations(token);
      setConversations(list);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      refreshConversations();
    } else {
      setConversations([]);
      setMessages([]);
      setDocuments([]);
      setActiveDocument(null);
      setCurrentConversationId(null);
    }
  }, [token, refreshConversations]);

  const selectConversation = async (id: string) => {
    if (!token) return;
    setCurrentConversationId(id);
    try {
      const [fetchedMessages, fetchedDocs] = await Promise.all([
        api.listMessages(token, id),
        api.listDocuments(token, id),
      ]);
      setMessages(fetchedMessages);
      setDocuments(fetchedDocs);
      const readyDoc = fetchedDocs.find((d) => d.status === 'ready') || fetchedDocs[0] || null;
      setActiveDocument(readyDoc);
    } catch (err) {
      console.error('Failed to load conversation details:', err);
    }
  };

  const newChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setDocuments([]);
    setActiveDocument(null);
  };

  const renameConversation = async (id: string, title: string) => {
    if (!token) return;
    try {
      const updated = await api.updateConversation(token, id, title);
      setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      console.error('Failed to rename conversation:', err);
      throw err;
    }
  };

  const deleteConversation = async (id: string) => {
    if (!token) return;
    try {
      await api.deleteConversation(token, id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversationId === id) {
        newChat();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      throw err;
    }
  };

  const pollDocumentStatus = async (documentId: string) => {
    if (!token) return;
    const maxAttempts = 150;
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const doc = await api.getDocument(token, documentId);
        setDocuments((prev) => prev.map((d) => (d.id === documentId ? doc : d)));

        if (doc.status === 'ready' || doc.status === 'failed' || attempts >= maxAttempts) {
          clearInterval(interval);
          if (doc.status === 'ready') {
            setActiveDocument(doc);
          }
        }
      } catch (err) {
        console.error('Polling document error:', err);
        clearInterval(interval);
      }
    }, 2000);
  };

  const uploadDocument = async (file: File): Promise<Document | null> => {
    if (!token) return null;
    setIsUploading(true);
    try {
      let convId = currentConversationId;

      // If in new chat, create a conversation first
      if (!convId) {
        const title = `Doc: ${file.name.replace('.pdf', '')}`;
        const newConv = await api.createConversation(token, title);
        convId = newConv.id;
        setCurrentConversationId(convId);
        setConversations((prev) => [newConv, ...prev]);
      }

      const uploadedDoc = await api.uploadDocument(token, convId, file);
      setDocuments((prev) => [uploadedDoc, ...prev]);
      setActiveDocument(uploadedDoc);

      // Start polling for background chunking & embedding completion
      pollDocumentStatus(uploadedDoc.id);

      return uploadedDoc;
    } catch (err) {
      console.error('Upload document failed:', err);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!token || !content.trim()) return;

    let convId = currentConversationId;
    setIsGenerating(true);

    try {
      // Create conversation if starting fresh
      if (!convId) {
        const title = content.length > 30 ? `${content.slice(0, 30)}...` : content;
        const newConv = await api.createConversation(token, title);
        convId = newConv.id;
        setCurrentConversationId(convId);
        setConversations((prev) => [newConv, ...prev]);
      }

      // Optimistic user message
      const optimisticMsg: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: convId,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      // Call API
      const assistantMsg = await api.sendMessage(
        token,
        convId,
        content,
        activeDocument?.id || null
      );

      // Replace optimistic message & add assistant response
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== optimisticMsg.id);
        return [...filtered, optimisticMsg, assistantMsg];
      });

      // Refresh conversations list to update order/updated_at
      refreshConversations();
    } catch (err: any) {
      console.error('Send message failed:', err);
      // Append error message from assistant
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        conversation_id: convId || 'error',
        role: 'assistant',
        content: `⚠️ **Error:** ${err.message || 'Something went wrong while processing your query. Please check your network or try again.'}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  const currentConversation = conversations.find((c) => c.id === currentConversationId) || null;

  return (
    <ChatContext.Provider
      value={{
        conversations,
        currentConversationId,
        currentConversation,
        messages,
        documents,
        activeDocument,
        isGenerating,
        isUploading,
        searchQuery,
        backendHealthy,
        setSearchQuery,
        selectConversation,
        newChat,
        sendMessage,
        renameConversation,
        deleteConversation,
        uploadDocument,
        setActiveDocument,
        refreshConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};
