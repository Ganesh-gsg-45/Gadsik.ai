import { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ChatArea } from './components/Chat/ChatArea';
import { DocumentDrawer } from './components/DocumentDrawer/DocumentDrawer';
import { AuthModal } from './components/Auth/AuthModal';
import { SettingsModal } from './components/Settings/SettingsModal';
import './styles/theme.css';
import './styles/markdown.css';
import './App.css';

function MainApp() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDocDrawerOpen, setIsDocDrawerOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Keyboard shortcut: Ctrl+K for new chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        window.location.hash = '#new';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="app-layout">
      {/* Kimi AI Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Workspace */}
      <ChatArea
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenDocDrawer={() => setIsDocDrawerOpen(true)}
      />

      {/* Slide-over Document Drawer */}
      <DocumentDrawer
        isOpen={isDocDrawerOpen}
        onClose={() => setIsDocDrawerOpen(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <MainApp />
      </ChatProvider>
    </AuthProvider>
  );
}
