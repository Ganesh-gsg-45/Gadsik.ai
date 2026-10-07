import React, { useRef, useState } from 'react';
import {
  X,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import type { RetrievedChunk, Document as ContractDocument } from '../../types';
import { DocumentSummaryModal } from '../DocumentSummary/DocumentSummaryModal';
import './DocumentDrawer.css';

interface DocumentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentDrawer: React.FC<DocumentDrawerProps> = ({ isOpen, onClose }) => {
  const { documents, activeDocument, setActiveDocument, uploadDocument, isUploading } = useChat();
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // RAG Tester state
  const [testQuery, setTestQuery] = useState('');
  const [retrievedChunks, setRetrievedChunks] = useState<RetrievedChunk[]>([]);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [selectedDocForSummary, setSelectedDocForSummary] = useState<ContractDocument | null>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      await uploadDocument(file);
    }
  };

  const handleTestRetrieval = async () => {
    if (!token || !activeDocument || !testQuery.trim()) return;
    setIsRetrieving(true);
    try {
      const res = await api.retrieveFromDocument(token, activeDocument.id, testQuery, 4);
      setRetrievedChunks(res.results);
    } catch (err) {
      console.error('Retrieval test failed:', err);
    } finally {
      setIsRetrieving(false);
    }
  };

  return (
    <div className="doc-drawer-overlay" onClick={onClose}>
      <div className="doc-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="doc-drawer-header">
          <div className="doc-drawer-title">
            <FileText size={18} color="var(--accent-primary)" />
            <span>Document Knowledge Base</span>
          </div>
          <button className="drawer-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="doc-drawer-body">
          {/* Upload Box */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <div
            className="drawer-upload-box"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud size={24} color="var(--accent-primary)" />
            <div className="drawer-upload-text">
              {isUploading ? 'Uploading & Indexing PDF...' : 'Upload PDF Document'}
            </div>
            <div className="drawer-upload-subtext">
              Indexed into semantic vector embeddings for intelligent RAG Q&A
            </div>
          </div>

          {/* List of Documents */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.6rem', textTransform: 'uppercase' }}>
              Attached Documents ({documents.length})
            </div>

            {documents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '13px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
                No documents uploaded in this chat yet.
              </div>
            ) : (
              <div className="doc-cards-list">
                {documents.map((doc) => {
                  const isActive = activeDocument?.id === doc.id;
                  return (
                    <div key={doc.id} className={`doc-card ${isActive ? 'active' : ''}`}>
                      <div className="doc-card-top">
                        <div className="doc-card-info">
                          <div className="doc-file-icon">
                            <FileText size={16} />
                          </div>
                          <div>
                            <div className="doc-filename">{doc.filename}</div>
                            <div className="doc-meta">
                              {new Date(doc.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <span className={`doc-badge ${doc.status}`}>
                          {doc.status === 'ready' && <CheckCircle2 size={11} style={{ display: 'inline', marginRight: '3px' }} />}
                          {doc.status === 'processing' && <Clock size={11} style={{ display: 'inline', marginRight: '3px' }} />}
                          {doc.status === 'failed' && <AlertCircle size={11} style={{ display: 'inline', marginRight: '3px' }} />}
                          {doc.status}
                        </span>
                      </div>

                      <div className="doc-card-actions">
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Collection: {doc.chroma_collection_id ? 'Indexed ✓' : 'Pending'}
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="analyze-doc-btn"
                            onClick={() => setSelectedDocForSummary(doc)}
                            disabled={doc.status !== 'ready'}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              background: '#2c2c35',
                              border: '1px solid #444',
                              color: '#ccc',
                              borderRadius: '4px',
                              cursor: doc.status === 'ready' ? 'pointer' : 'not-allowed',
                            }}
                          >
                            📖 Overview
                          </button>
                          <button
                            className={`select-doc-btn ${isActive ? 'selected' : ''}`}
                            onClick={() => setActiveDocument(isActive ? null : doc)}
                            disabled={doc.status !== 'ready'}
                          >
                            {isActive ? 'Active for Q&A ✓' : 'Use in Chat'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RAG Vector Retrieval Playground */}
          {activeDocument && activeDocument.status === 'ready' && (
            <div className="rag-tester-box">
              <div className="tester-title">
                <Sparkles size={14} color="var(--accent-primary)" />
                <span>Test ChromaDB Semantic Search</span>
              </div>

              <div className="tester-input-group">
                <input
                  type="text"
                  className="tester-input"
                  placeholder="Type search query to inspect chunks..."
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTestRetrieval()}
                />
                <button
                  className="tester-btn"
                  onClick={handleTestRetrieval}
                  disabled={isRetrieving || !testQuery.trim()}
                >
                  {isRetrieving ? 'Searching...' : 'Search'}
                </button>
              </div>

              {retrievedChunks.length > 0 && (
                <div className="chunks-result-list">
                  {retrievedChunks.map((chunk, i) => (
                    <div key={i} className="chunk-item">
                      <div className="chunk-header">
                        <span>Page {chunk.page_number}</span>
                        <span>Distance: {chunk.distance?.toFixed(3)}</span>
                      </div>
                      <p>{chunk.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {/* Modal Document Summary */}
        {selectedDocForSummary && (
          <DocumentSummaryModal
            token={token || ''}
            documentId={selectedDocForSummary.id}
            documentName={selectedDocForSummary.filename}
            onClose={() => setSelectedDocForSummary(null)}
          />
        )}
      </div>
    </div>
  );
};

