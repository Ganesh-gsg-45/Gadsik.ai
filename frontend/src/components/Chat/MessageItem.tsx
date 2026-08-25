import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Zap,
} from 'lucide-react';
import type { Message } from '../../types';
import { useAuth } from '../../context/AuthContext';
import './MessageItem.css';
import '../../styles/markdown.css';

interface MessageItemProps {
  message: Message;
  onRegenerate?: () => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onRegenerate }) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const isAssistant = message.role === 'assistant';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to format text
  const renderFormattedText = (content: string) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');

            if (className?.includes('language-') || codeString.includes('\n')) {
              return <CodeBlock language={language || 'code'} code={codeString} />;
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p>{children}</p>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <div className={`message-row ${message.role}`}>
      {/* Avatar */}
      <div className={`message-avatar ${message.role}`}>
        {isAssistant ? (
          <Sparkles size={18} />
        ) : (
          <span>{user?.email ? user.email.charAt(0).toUpperCase() : 'U'}</span>
        )}
      </div>

      {/* Body */}
      <div className="message-body">
        {isAssistant ? (
          <div className="assistant-content-wrapper">
            <div className="markdown-content">
              {renderFormattedText(message.content)}
            </div>

            {/* Action Bar */}
            <div className="message-actions-bar">
              <button className="msg-action-btn" onClick={handleCopy} title="Copy response">
                {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {onRegenerate && (
                <button className="msg-action-btn" onClick={onRegenerate} title="Regenerate">
                  <RotateCcw size={13} />
                  <span>Retry</span>
                </button>
              )}

              {/* Real token counter if available */}
              {message.tokens_used ? (
                <div className="token-badge" title="Real tokens consumed via Gemini API">
                  <Zap size={11} color="#f59e0b" />
                  <span>{message.tokens_used} tokens</span>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="user-bubble">{message.content}</div>
        )}
      </div>
    </div>
  );
};

// Code block with top copy button
const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-header">
        <span>{language}</span>
        <button className="code-copy-btn" onClick={handleCopyCode}>
          {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
};

export const ThinkingMessage: React.FC = () => {
  return (
    <div className="message-row assistant">
      <div className="message-avatar assistant">
        <Sparkles size={18} />
      </div>
      <div className="message-body">
        <div className="thinking-indicator">
          <div className="thinking-dots">
            <div className="thinking-dot" />
            <div className="thinking-dot" />
            <div className="thinking-dot" />
          </div>
          <span>Retrieving document embeddings & synthesizing answer...</span>
        </div>
      </div>
    </div>
  );
};
