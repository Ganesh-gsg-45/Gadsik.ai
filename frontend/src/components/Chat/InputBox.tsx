import React, { useRef, useEffect, useState } from 'react';
import {
  ArrowUp,
  Paperclip,
  Globe,
  FileText,
  X,
  Loader2,
  Sparkles,
  Square,
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import './InputBox.css';

interface InputBoxProps {
  initialValue?: string;
  onSend: (text: string) => void;
  onOpenDocDrawer: () => void;
}

export const InputBox: React.FC<InputBoxProps> = ({
  initialValue = '',
  onSend,
  onOpenDocDrawer,
}) => {
  const {
    activeDocument,
    setActiveDocument,
    uploadDocument,
    isUploading,
    isGenerating,
  } = useChat();

  const [input, setInput] = useState(initialValue);
  const [useSearch, setUseSearch] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialValue) {
      setInput(initialValue);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [initialValue]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!input.trim() || isGenerating) return;
    onSend(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      await uploadDocument(file);
    }
  };

  return (
    <div className="input-capsule-wrapper">
      <div className="input-capsule">
        {/* Attached Document Pill */}
        {activeDocument && (
          <div className="attached-doc-chip" onClick={onOpenDocDrawer} style={{ cursor: 'pointer' }}>
            <div className="doc-chip-left">
              <FileText size={14} />
              <span>{activeDocument.filename}</span>
              <span className={`doc-status-badge ${activeDocument.status}`}>
                {activeDocument.status === 'ready' ? 'Ready ✓' : 'Processing...'}
              </span>
            </div>
            <button
              className="detach-btn"
              title="Detach document from prompt"
              onClick={(e) => {
                e.stopPropagation();
                setActiveDocument(null);
              }}
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          rows={1}
          placeholder={
            activeDocument
              ? `Ask anything about "${activeDocument.filename}" (or general knowledge)...`
              : "Ask Gadsik anything, or attach a PDF to search..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isGenerating}
        />

        {/* Bottom Toolbar */}
        <div className="input-toolbar">
          <div className="toolbar-left">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              className="tool-icon-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Attach PDF for document retrieval"
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 size={14} className="spin" />
              ) : (
                <Paperclip size={14} />
              )}
              <span>{isUploading ? 'Uploading...' : 'Attach PDF'}</span>
            </button>

            <button
              className={`tool-icon-btn ${useSearch ? 'active' : ''}`}
              onClick={() => setUseSearch(!useSearch)}
              title="Web Deep Search mode"
            >
              <Globe size={14} />
              <span>Deep Search</span>
            </button>
          </div>

          <div className="toolbar-right">
            <div className="model-tag">
              <Sparkles size={12} color="var(--accent-primary)" />
              <span>Gemini Flash RAG</span>
            </div>

            <button
              className="send-btn"
              onClick={handleSubmit}
              disabled={!input.trim() || isGenerating}
              title={isGenerating ? 'Generating response...' : 'Send message (Enter)'}
            >
              {isGenerating ? <Square size={14} /> : <ArrowUp size={16} />}
            </button>
          </div>
        </div>
      </div>

      <div className="input-disclaimer">
        Gadsik.ai may produce inaccurate information. Always verify important facts against document citations.
      </div>
    </div>
  );
};
