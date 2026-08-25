import React, { useRef, useState } from 'react';
import {
  Sparkles,
  FileText,
  UploadCloud,
  Cpu,
  Search,
  Code,
  BookOpen,
  ArrowUpRight,
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import './EmptyState.css';

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onSelectPrompt }) => {
  const { uploadDocument, isUploading } = useChat();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      await uploadDocument(file);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      await uploadDocument(file);
    }
  };

  const samplePrompts = [
    {
      icon: <BookOpen size={17} />,
      title: 'Summarize Document & Key Takeaways',
      desc: 'Ask for a structured breakdown with citations from the uploaded PDF',
      prompt: 'Summarize the main concepts and takeaways from the uploaded document, and list the key algorithms covered.',
    },
    {
      icon: <Cpu size={17} />,
      title: 'Compare Machine Learning Models',
      desc: 'Deep dive into Supervised vs Unsupervised learning methods',
      prompt: 'Compare Supervised vs Unsupervised learning models in detail. What are the key trade-offs and real-world use cases?',
    },
    {
      icon: <Search size={17} />,
      title: 'How RAG & Vector Embeddings Work',
      desc: 'Explain chunking, ChromaDB, and similarity search simply',
      prompt: 'Explain how Retrieval-Augmented Generation (RAG) works under the hood with embeddings, chunking, and ChromaDB vector search.',
    },
    {
      icon: <Code size={17} />,
      title: 'Generate Python Code & Architecture',
      desc: 'Build an async FastAPI router with JWT authentication',
      prompt: 'Write a Python FastAPI async endpoint that handles background document processing and stores metadata in PostgreSQL.',
    },
  ];

  return (
    <div className="empty-state-container">
      {/* Hero Sparkle */}
      <div className="empty-sparkle-hero">
        <div className="sparkle-icon-wrapper">
          <Sparkles size={32} />
        </div>
      </div>

      <h1 className="empty-title">What can I help with today?</h1>
      <p className="empty-subtitle">
        Gadsik.ai is your RAG intelligence companion. Upload PDFs for instant citation-backed answers, ask deep coding questions, or explore complex topics.
      </p>

      {/* PDF Dropzone Banner */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <div
        className={`pdf-dropzone-hero ${isDragging ? 'dragging' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="dropzone-left">
          <div className="dropzone-icon">
            <FileText size={22} />
          </div>
          <div>
            <div className="dropzone-title">
              {isUploading ? 'Uploading & indexing document...' : 'Upload PDF Document'}
            </div>
            <div className="dropzone-desc">
              Drop your PDF here for full-text semantic chunking, embeddings & citations
            </div>
          </div>
        </div>
        <button className="dropzone-btn" disabled={isUploading}>
          <UploadCloud size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
          {isUploading ? 'Processing...' : 'Browse PDF'}
        </button>
      </div>

      {/* Suggestion Prompts Grid */}
      <div className="prompts-grid">
        {samplePrompts.map((p, idx) => (
          <div
            key={idx}
            className="prompt-card"
            onClick={() => onSelectPrompt(p.prompt)}
          >
            <div className="prompt-card-header">
              <div className="prompt-icon-badge">{p.icon}</div>
              <ArrowUpRight size={16} className="prompt-arrow" />
            </div>
            <div className="prompt-card-title">{p.title}</div>
            <div className="prompt-card-desc">{p.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
