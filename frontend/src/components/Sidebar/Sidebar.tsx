import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  Sun,
  Moon,
  Settings,
  PanelLeftClose,
  FileText,
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  onOpenSettings,
  theme,
  onToggleTheme,
}) => {
  const {
    conversations,
    currentConversationId,
    selectConversation,
    newChat,
    renameConversation,
    deleteConversation,
    searchQuery,
    setSearchQuery,
    backendHealthy,
  } = useChat();
  const { user } = useAuth();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');

  const handleStartRename = (e: React.MouseEvent, id: string, currentTitle: string | null) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(currentTitle || 'New Chat');
  };

  const handleSaveRename = async (e: React.MouseEvent | React.FormEvent, id: string) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      await renameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this conversation?')) {
      await deleteConversation(id);
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) =>
    (c.title || 'New Chat').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group by relative time (Today, Yesterday, Older)
  const groupConversations = () => {
    const today: typeof conversations = [];
    const yesterday: typeof conversations = [];
    const older: typeof conversations = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;

    filteredConversations.forEach((conv) => {
      const convTime = new Date(conv.updated_at || conv.created_at).getTime();
      if (convTime >= todayStart) {
        today.push(conv);
      } else if (convTime >= yesterdayStart) {
        yesterday.push(conv);
      } else {
        older.push(conv);
      }
    });

    return { today, yesterday, older };
  };

  const groups = groupConversations();

  return (
    <aside className={`sidebar-container ${!isOpen ? 'sidebar-collapsed' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        <a href="#" onClick={(e) => { e.preventDefault(); newChat(); }} className="brand-logo">
          <div className="brand-icon">
            <Sparkles size={18} />
          </div>
          <span>Gadsik.ai</span>
          <span className="brand-badge">2.0 RAG</span>
        </a>
        <button
          className="conv-action-btn"
          onClick={onToggle}
          title="Collapse sidebar"
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="sidebar-actions">
        <button className="new-chat-btn" onClick={newChat}>
          <div className="new-chat-btn-left">
            <Plus size={16} />
            <span>New Chat</span>
          </div>
          <span className="shortcut-pill">Ctrl+K</span>
        </button>
      </div>

      {/* Search Conversations */}
      <div className="sidebar-search">
        <Search size={14} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Conversations List */}
      <div className="conversations-list">
        {filteredConversations.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            {searchQuery ? 'No chats match your search' : 'No conversation history yet. Start a new chat!'}
          </div>
        ) : (
          <>
            {groups.today.length > 0 && (
              <>
                <div className="section-label">Today</div>
                {groups.today.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    isActive={conv.id === currentConversationId}
                    isEditing={editingId === conv.id}
                    editTitle={editTitle}
                    setEditTitle={setEditTitle}
                    onSelect={() => selectConversation(conv.id)}
                    onStartRename={(e) => handleStartRename(e, conv.id, conv.title)}
                    onSaveRename={(e) => handleSaveRename(e, conv.id)}
                    onCancelRename={handleCancelRename}
                    onDelete={(e) => handleDelete(e, conv.id)}
                  />
                ))}
              </>
            )}

            {groups.yesterday.length > 0 && (
              <>
                <div className="section-label">Yesterday</div>
                {groups.yesterday.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    isActive={conv.id === currentConversationId}
                    isEditing={editingId === conv.id}
                    editTitle={editTitle}
                    setEditTitle={setEditTitle}
                    onSelect={() => selectConversation(conv.id)}
                    onStartRename={(e) => handleStartRename(e, conv.id, conv.title)}
                    onSaveRename={(e) => handleSaveRename(e, conv.id)}
                    onCancelRename={handleCancelRename}
                    onDelete={(e) => handleDelete(e, conv.id)}
                  />
                ))}
              </>
            )}

            {groups.older.length > 0 && (
              <>
                <div className="section-label">Previous Days</div>
                {groups.older.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conv={conv}
                    isActive={conv.id === currentConversationId}
                    isEditing={editingId === conv.id}
                    editTitle={editTitle}
                    setEditTitle={setEditTitle}
                    onSelect={() => selectConversation(conv.id)}
                    onStartRename={(e) => handleStartRename(e, conv.id, conv.title)}
                    onSaveRename={(e) => handleSaveRename(e, conv.id)}
                    onCancelRename={handleCancelRename}
                    onDelete={(e) => handleDelete(e, conv.id)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="user-profile-btn" onClick={onOpenSettings}>
          <div className="user-info">
            <div className="user-avatar">
              {user?.email ? user.email.charAt(0).toUpperCase() : 'G'}
            </div>
            <div className="user-email">{user?.email || 'Guest User'}</div>
          </div>
          <Settings size={16} color="var(--text-muted)" />
        </button>

        <div className="sidebar-bottom-row">
          <div className="health-badge">
            <div className={`health-dot ${!backendHealthy ? 'disconnected' : ''}`} />
            <span>{backendHealthy ? 'Backend API Connected' : 'API Connecting...'}</span>
          </div>
          <button
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
    </aside>
  );
};

interface ConversationItemProps {
  conv: { id: string; title: string | null };
  isActive: boolean;
  isEditing: boolean;
  editTitle: string;
  setEditTitle: (t: string) => void;
  onSelect: () => void;
  onStartRename: (e: React.MouseEvent) => void;
  onSaveRename: (e: React.MouseEvent | React.FormEvent) => void;
  onCancelRename: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conv,
  isActive,
  isEditing,
  editTitle,
  setEditTitle,
  onSelect,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onDelete,
}) => {
  return (
    <div
      className={`conversation-item ${isActive ? 'active' : ''}`}
      onClick={isEditing ? undefined : onSelect}
    >
      {isEditing ? (
        <form
          onSubmit={onSaveRename}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}
        >
          <input
            autoFocus
            type="text"
            className="rename-input"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
          <button type="submit" className="conv-action-btn" onClick={onSaveRename}>
            <Check size={14} color="#10b981" />
          </button>
          <button type="button" className="conv-action-btn" onClick={onCancelRename}>
            <X size={14} color="#ef4444" />
          </button>
        </form>
      ) : (
        <>
          <div className="conv-title-wrapper">
            {conv.title?.toLowerCase().includes('doc') ? (
              <FileText size={15} color="var(--accent-primary)" />
            ) : (
              <MessageSquare size={15} color="var(--text-muted)" />
            )}
            <span className="conv-title">{conv.title || 'New Chat'}</span>
          </div>
          <div className="conv-actions">
            <button
              className="conv-action-btn"
              title="Rename"
              onClick={onStartRename}
            >
              <Edit2 size={13} />
            </button>
            <button
              className="conv-action-btn delete"
              title="Delete"
              onClick={onDelete}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
