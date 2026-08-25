import React, { useRef, useEffect, useState } from 'react';
import {
  PanelLeftOpen,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { EmptyState } from './EmptyState';
import { MessageItem, ThinkingMessage } from './MessageItem';
import { InputBox } from './InputBox';
import './ChatArea.css';

interface ChatAreaProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenDocDrawer: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  isSidebarOpen,
  onToggleSidebar,
  onOpenDocDrawer,
}) => {
  const {
    messages,
    currentConversation,
    documents,
    isGenerating,
    sendMessage,
    newChat,
  } = useChat();

  const [promptText, setPromptText] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  const handleSelectPrompt = (prompt: string) => {
    setPromptText(prompt);
  };

  const handleSend = async (text: string) => {
    setPromptText('');
    await sendMessage(text);
  };

  return (
    <main className="chat-area-container">
      {/* Top Header */}
      <header className="chat-header">
        <div className="chat-header-left">
          {!isSidebarOpen && (
            <button
              className="sidebar-toggle-btn"
              onClick={onToggleSidebar}
              title="Open sidebar"
            >
              <PanelLeftOpen size={19} />
            </button>
          )}

          <div className="header-title-pill">
            <span>{currentConversation?.title || 'New Chat'}</span>
            <span className="model-pill-badge">Gemini Flash</span>
          </div>
        </div>

        <div className="chat-header-right">
          {documents.length > 0 && (
            <button
              className="header-action-btn"
              onClick={onOpenDocDrawer}
              title="View attached documents & RAG status"
            >
              <Layers size={14} color="var(--accent-primary)" />
              <span>Docs</span>
              <span className="doc-count-badge">{documents.length}</span>
            </button>
          )}

          {messages.length > 0 && (
            <button
              className="header-action-btn"
              onClick={newChat}
              title="Start a new chat session"
            >
              <Sparkles size={14} />
              <span>New</span>
            </button>
          )}
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="messages-scroll-view" ref={scrollRef}>
        {messages.length === 0 ? (
          <EmptyState onSelectPrompt={handleSelectPrompt} />
        ) : (
          <div className="messages-list-wrapper">
            {messages.map((msg) => (
              <MessageItem key={msg.id} message={msg} />
            ))}

            {isGenerating && <ThinkingMessage />}
          </div>
        )}
      </div>

      {/* Floating Capsule Input Box */}
      <InputBox
        initialValue={promptText}
        onSend={handleSend}
        onOpenDocDrawer={onOpenDocDrawer}
      />
    </main>
  );
};
