import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { X, Sparkles, FileText, Loader2, Zap } from 'lucide-react';
import { api } from '../../api/client';
import type { DocumentSummaryResult } from '../../types';
import './DocumentSummaryModal.css';

interface Props {
  token: string;
  documentId: string;
  documentName: string;
  onClose: () => void;
}

export const DocumentSummaryModal: React.FC<Props> = ({
  token,
  documentId,
  documentName,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DocumentSummaryResult | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.summarizeDocument(token, documentId);
        if (isMounted) setData(res);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to summarize document');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchSummary();
    return () => {
      isMounted = false;
    };
  }, [token, documentId]);

  return (
    <div className="doc-summary-overlay" onClick={onClose}>
      <div className="doc-summary-modal" onClick={(e) => e.stopPropagation()}>
        <div className="doc-summary-header">
          <div className="summary-title-group">
            <FileText size={18} color="var(--accent-primary)" />
            <span className="summary-filename">{documentName}</span>
          </div>
          <button className="summary-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="doc-summary-content">
          {loading && (
            <div className="summary-loading-state">
              <Loader2 className="summary-spinner" size={28} />
              <p>Analyzing document structure and synthesizing overview...</p>
            </div>
          )}

          {error && (
            <div className="summary-error-state">
              <p>⚠️ {error}</p>
            </div>
          )}

          {!loading && !error && data && (
            <div className="summary-body">
              <div className="summary-badge-bar">
                <span className="summary-badge">
                  <Sparkles size={13} color="var(--accent-primary)" />
                  RAG Document Synthesis
                </span>
                {data.tokens_used > 0 && (
                  <span className="summary-badge">
                    <Zap size={13} color="#f59e0b" />
                    {data.tokens_used} tokens
                  </span>
                )}
              </div>
              <div className="summary-markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {data.summary}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
