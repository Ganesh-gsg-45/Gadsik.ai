import React, { useState } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './AuthModal.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signUp, signInWithTestAccount, error, clearError, isLoading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      onClose();
    } catch {
      // Error handled in AuthContext
    }
  };

  const handleFastTestLogin = async () => {
    try {
      await signInWithTestAccount();
      onClose();
    } catch {
      // Error handled in AuthContext
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="auth-modal-header">
          <div className="auth-logo-icon">
            <Sparkles size={24} />
          </div>
          <div className="auth-title">
            {isSignUp ? 'Create your account' : 'Welcome to Gadsik.ai'}
          </div>
          <div className="auth-subtitle">
            Sign in with Supabase Authentication to sync chats & documents
          </div>
        </div>

        {error && <div className="auth-error-box">{error}</div>}

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label">Email address</label>
            <input
              type="email"
              className="auth-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { clearError(); setEmail(e.target.value); }}
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <input
              type="password"
              className="auth-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { clearError(); setPassword(e.target.value); }}
              required
            />
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Authenticating...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="fast-login-divider">or quick access</div>

        {/* 1-Click Test Login */}
        <button
          type="button"
          className="fast-test-btn"
          onClick={handleFastTestLogin}
          disabled={isLoading}
        >
          <Zap size={16} color="#f59e0b" />
          <span>Login with Test Account (Ganesh)</span>
        </button>

        <div className="auth-toggle-link">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <span onClick={() => { clearError(); setIsSignUp(!isSignUp); }}>
            {isSignUp ? 'Sign in' : 'Sign up'}
          </span>
        </div>
      </div>
    </div>
  );
};
