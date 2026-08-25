import React from 'react';
import {
  X,
  Settings,
  LogOut,
  User,
  ShieldCheck,
  Server,
  Database,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../api/client';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
}) => {
  const { user, signOut } = useAuth();

  if (!isOpen) return null;

  const handleSignOut = async () => {
    await signOut();
    onClose();
    onOpenAuth();
  };

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-header">
          <div className="settings-title">
            <Settings size={18} color="var(--accent-primary)" />
            <span>Preferences & System Status</span>
          </div>
          <button
            className="drawer-close-btn"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* User Account */}
        <div className="settings-section">
          <div className="settings-section-title">Account</div>
          {user ? (
            <div className="settings-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <User size={16} color="var(--accent-primary)" />
                <span>{user.email}</span>
              </div>
              <button
                className="signout-btn"
                onClick={handleSignOut}
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="settings-row">
              <span>Not logged in</span>
              <button
                className="signout-btn"
                style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                onClick={() => { onClose(); onOpenAuth(); }}
              >
                Sign In
              </button>
            </div>
          )}
        </div>

        {/* System Architecture */}
        <div className="settings-section">
          <div className="settings-section-title">Backend Architecture</div>

          <div className="settings-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Server size={15} />
              <span>FastAPI Backend</span>
            </div>
            <span className="settings-val">{API_BASE_URL}</span>
          </div>

          <div className="settings-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Database size={15} color="#34d399" />
              <span>Vector Store</span>
            </div>
            <span className="settings-val">ChromaDB Persistent (MiniLM)</span>
          </div>

          <div className="settings-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Cpu size={15} color="#8b5cf6" />
              <span>Primary LLM</span>
            </div>
            <span className="settings-val">Google Gemini Flash</span>
          </div>

          <div className="settings-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <ShieldCheck size={15} color="#f59e0b" />
              <span>Rate Limits</span>
            </div>
            <span className="settings-val">30 msgs/min • 10 uploads/min</span>
          </div>
        </div>
      </div>
    </div>
  );
};
