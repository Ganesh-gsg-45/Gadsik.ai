import { useState } from 'react';
import { api } from '../../api/client';
import type { RiskAnalysisResult, FinanceAnalysisResult } from '../../types';
import './AnalysisReportModal.css';

interface Props {
  token: string;
  documentId: string;
  documentName: string;
  onClose: () => void;
}

type Mode = 'risk' | 'finance';

const scoreColor = (score: number, inverted = false) => {
  const effective = inverted ? 100 - score : score;
  if (effective >= 61) return '#e05252';
  if (effective >= 31) return '#e0a952';
  return '#4caf82';
};

export function AnalysisReportModal({ token, documentId, documentName, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('risk');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riskResult, setRiskResult] = useState<RiskAnalysisResult | null>(null);
  const [financeResult, setFinanceResult] = useState<FinanceAnalysisResult | null>(null);

  const runAnalysis = async (targetMode: Mode) => {
    setMode(targetMode);
    setError(null);

    if (targetMode === 'risk' && riskResult) return;
    if (targetMode === 'finance' && financeResult) return;

    setLoading(true);
    try {
      if (targetMode === 'risk') {
        const result = await api.analyzeDocumentRisks(token, documentId);
        setRiskResult(result);
      } else {
        const result = await api.analyzeDocumentFinance(token, documentId);
        setFinanceResult(result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  // Trigger the initial load on first render
  useState(() => {
    runAnalysis('risk');
  });

  return (
    <div className="analysis-modal-overlay" onClick={onClose}>
      <div className="analysis-modal" onClick={(e) => e.stopPropagation()}>
        <div className="analysis-modal-header">
          <div>
            <h2>Document Analysis</h2>
            <p className="analysis-modal-filename">{documentName}</p>
          </div>
          <button className="analysis-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="analysis-tabs">
          <button
            className={mode === 'risk' ? 'active' : ''}
            onClick={() => runAnalysis('risk')}
          >
            🛡️ Risk Manager
          </button>
          <button
            className={mode === 'finance' ? 'active' : ''}
            onClick={() => runAnalysis('finance')}
          >
            💰 Finance Controller
          </button>
        </div>

        <div className="analysis-modal-body">
          {loading && (
            <div className="analysis-loading">
              <div className="spinner" />
              <p>Analyzing document with AI... this may take 10-20 seconds.</p>
            </div>
          )}

          {error && <div className="analysis-error">⚠️ {error}</div>}

          {!loading && !error && mode === 'risk' && riskResult && (
            <>
              <div className="score-banner" style={{ borderColor: scoreColor(riskResult.overall_risk_score) }}>
                <div className="score-number" style={{ color: scoreColor(riskResult.overall_risk_score) }}>
                  {riskResult.overall_risk_score}
                </div>
                <div className="score-label">
                  <strong>{riskResult.overall_risk_level.toUpperCase()} RISK</strong>
                  <span>out of 100</span>
                </div>
              </div>
              <p className="analysis-summary">{riskResult.summary}</p>
              <div className="findings-list">
                {riskResult.risks.map((risk, i) => (
                  <div key={i} className={`finding-card severity-${risk.severity}`}>
                    <div className="finding-header">
                      <span className="finding-category">{risk.category.toUpperCase()}</span>
                      <span className={`finding-severity severity-badge-${risk.severity}`}>
                        {risk.severity}
                      </span>
                      {risk.page_number && <span className="finding-page">Page {risk.page_number}</span>}
                    </div>
                    <blockquote className="finding-evidence">"{risk.clause_evidence}"</blockquote>
                    <p className="finding-explanation">{risk.explanation}</p>
                    <p className="finding-recommendation">💡 {risk.recommendation}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {!loading && !error && mode === 'finance' && financeResult && (
            <>
              <div className="score-banner" style={{ borderColor: scoreColor(financeResult.financial_health_score, true) }}>
                <div className="score-number" style={{ color: scoreColor(financeResult.financial_health_score, true) }}>
                  {financeResult.financial_health_score}
                </div>
                <div className="score-label">
                  <strong>{financeResult.financial_health_level.toUpperCase()} HEALTH</strong>
                  <span>out of 100</span>
                </div>
              </div>
              <p className="analysis-summary">{financeResult.summary}</p>
              <div className="findings-list">
                {financeResult.financial_terms.map((term, i) => (
                  <div key={i} className={`finding-card impact-${term.impact}`}>
                    <div className="finding-header">
                      <span className="finding-category">{term.category.replace(/_/g, ' ').toUpperCase()}</span>
                      <span className={`finding-severity impact-badge-${term.impact}`}>
                        {term.impact}
                      </span>
                      {term.page_number && <span className="finding-page">Page {term.page_number}</span>}
                    </div>
                    <blockquote className="finding-evidence">"{term.clause_evidence}"</blockquote>
                    <p className="finding-explanation">{term.estimated_impact}</p>
                    <p className="finding-recommendation">💡 {term.recommendation}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
