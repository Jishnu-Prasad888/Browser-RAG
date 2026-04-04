import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  SendHorizontal,
  Copy,
  Check,
  Sun,
  Moon,
  Sparkles,
  Menu,
  Plus,
  Trash2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: number;
  title: string;
  created_at: string;
}

const API_BASE = "/api";

/* ─────────────────────────────────────────────────────────────────────────────
   CODE BLOCK
───────────────────────────────────────────────────────────────────────────── */
const CodeBlock = ({
  language,
  className,
  children,
  ...props
}: {
  language: string;
  className?: string;
  children: React.ReactNode;
  [k: string]: unknown;
}) => {
  const [copied, setCopied] = useState(false);

  const text =
    typeof children === "string"
      ? children
      : Array.isArray(children)
        ? children.join("")
        : String(children);

  const copy = () =>
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });

  return (
    <div className="code-block-wrap">
      <div className="code-block-header">
        <span className="code-lang">{language || "code"}</span>
        <button className="code-copy-btn" onClick={copy}>
          {copied ? <Check size={10} /> : <Copy size={10} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <code className={`code-content ${className ?? ""}`} {...props}>
        {children}
      </code>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   MESSAGE BUBBLE
───────────────────────────────────────────────────────────────────────────── */
const MessageBubble = ({ message }: { message: Message }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const copy = () =>
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });

  return (
    <div className={`msg-row ${isUser ? "user" : "assistant"}`}>
      {/* Role label */}
      <div className="msg-label">
        {!isUser && <span className="msg-label-dot" />}
        {isUser ? "You" : "Assistant"}
      </div>

      <div className="msg-bubble-wrap">
        {isUser ? (
          <div className="chat-user">
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {message.content}
            </p>
          </div>
        ) : (
          <div className="chat-ai">
            <div className="prose-chat">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  code(props) {
                    const { className, children } = props;
                    const match = /language-(\S+)/.exec(className || "");
                    return match ? (
                      <CodeBlock language={match[1]} className={className}>
                        {children}
                      </CodeBlock>
                    ) : (
                      <code className={className}>{children}</code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Copy action for AI messages */}
        {!isUser && (
          <div className="msg-actions">
            <button className="msg-action-btn" onClick={copy}>
              {copied ? <Check size={10} /> : <Copy size={10} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   THINKING INDICATOR
───────────────────────────────────────────────────────────────────────────── */
const ThinkingIndicator = () => (
  <div className="thinking-wrap">
    <div
      className="msg-label"
      style={{ paddingLeft: "4px", marginBottom: "5px" }}
    >
      <span className="msg-label-dot" />
      Assistant
    </div>
    <div className="thinking-bubble">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="thinking-dot"
          style={{ animation: `blink 1.35s ease-in-out ${i * 0.22}s infinite` }}
        />
      ))}
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────────────────────────────────────────── */
const SUGGESTIONS = [
  "Summarise a recent article",
  "Help me write a cover letter",
  "Debug my Python code",
  "Explain quantum entanglement",
  "Draft a project proposal",
  "Compare REST vs GraphQL",
];

const EmptyState = ({ onSuggest }: { onSuggest: (s: string) => void }) => (
  <div className="empty-state">
    <div className="empty-logo">
      <Sparkles size={22} strokeWidth={1.8} />
    </div>
    <h2 className="empty-title">What's on your mind?</h2>
    <p className="empty-sub">
      Ask anything — from deep research to quick answers, I'm here.
    </p>
    <div className="empty-chips">
      {SUGGESTIONS.map((s) => (
        <button key={s} className="empty-chip" onClick={() => onSuggest(s)}>
          {s}
        </button>
      ))}
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   ALERT BOX
───────────────────────────────────────────────────────────────────────────── */
const AlertBox = ({
  title,
  msg,
  onClose,
}: {
  title: string;
  msg: string;
  onClose?: () => void;
}) => (
  <div className="alert-overlay" onClick={onClose}>
    <div className="alert-card" onClick={(e) => e.stopPropagation()}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "13px" }}>
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            flexShrink: 0,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AlertTriangle size={17} color="#ef4444" />
        </div>

        <div style={{ flex: 1 }}>
          <div
            className="accent-bar"
            style={{ background: "#ef4444", marginBottom: "9px" }}
          />
          <h2
            style={{
              fontFamily: "'Instrument Serif', serif",
              fontSize: "1.05rem",
              fontWeight: 400,
              fontStyle: "italic",
              color: "var(--text-primary)",
              margin: "0 0 5px",
              lineHeight: 1.25,
            }}
          >
            {title}
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.84rem",
              margin: 0,
              lineHeight: 1.55,
            }}
          >
            {msg}
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              padding: "4px",
              cursor: "pointer",
              color: "var(--text-muted)",
              borderRadius: "7px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--text-primary)";
              (e.currentTarget as HTMLButtonElement).style.background =
                "var(--bg-active)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                "var(--text-muted)";
              (e.currentTarget as HTMLButtonElement).style.background = "none";
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "10px",
            borderRadius: "10px",
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-active)",
            color: "var(--text-primary)",
            fontSize: "0.8rem",
            fontWeight: 600,
            letterSpacing: "0.04em",
            cursor: "pointer",
            fontFamily: "'Syne', sans-serif",
            transition: "all 0.17s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--accent-glow)";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "var(--border-focus)";
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--accent-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--bg-active)";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "var(--border-subtle)";
            (e.currentTarget as HTMLButtonElement).style.color =
              "var(--text-primary)";
          }}
        >
          Dismiss
        </button>
      )}
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   SIDEBAR
───────────────────────────────────────────────────────────────────────────── */
interface SidebarProps {
  currentConversationId: number | null;
  onConversationSelect: (id: number) => void;
  onNewConversation: () => void;
  onConversationDeleted: () => void;
  refreshTrigger: number;
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  onConversationDeleted,
  refreshTrigger,
  isOpen,
  onToggle,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  useEffect(() => {
    fetchConversations();
  }, [refreshTrigger]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/conversations`);
      const data = await res.json();
      setConversations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (id: number) => {
    try {
      await fetch(`${API_BASE}/conversations/${id}`, { method: "DELETE" });
      if (currentConversationId === id) onNewConversation();
      onConversationDeleted();
    } catch (e) {
      console.error(e);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? "open" : ""}`}
        onClick={onToggle}
      />

      <div className="sidebar-rail">
        <div className={`sidebar-panel ${isOpen ? "open" : ""}`}>
          {/* Header */}
          <div className="sidebar-header">
            <div className="accent-bar" style={{ marginBottom: "10px" }} />
            <p className="sidebar-title">Threads</p>
            <p className="sidebar-count">
              {conversations.length} conversation
              {conversations.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* New chat button */}
          <div style={{ padding: "12px 12px 6px" }}>
            <button
              className="sidebar-new-btn"
              onClick={() => {
                onNewConversation();
                onToggle();
              }}
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>New thread</span>
            </button>
          </div>

          {/* Conversation list */}
          <div className="sidebar-list">
            {loading ? (
              <div style={{ padding: "8px 2px" }}>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="skeleton"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div
                style={{
                  padding: "40px 12px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                <MessageSquare
                  size={20}
                  style={{
                    margin: "0 auto 10px",
                    opacity: 0.3,
                    display: "block",
                  }}
                />
                <p style={{ margin: 0, fontSize: "0.79rem", fontWeight: 500 }}>
                  No threads yet
                </p>
                <p style={{ margin: "3px 0 0", fontSize: "0.7rem" }}>
                  Start a new conversation
                </p>
              </div>
            ) : (
              conversations.map((conv, idx) => (
                <div
                  key={conv.id}
                  className={`sidebar-item ${currentConversationId === conv.id ? "active" : ""}`}
                  style={{ animationDelay: `${idx * 0.025}s` }}
                  onMouseEnter={() => setHoveredId(conv.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => {
                    onConversationSelect(conv.id);
                    onToggle();
                  }}
                >
                  <div
                    className="sidebar-item-indicator"
                    style={{
                      background:
                        currentConversationId === conv.id
                          ? "var(--accent-primary)"
                          : "transparent",
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="sidebar-item-title">{conv.title}</p>
                    <p className="sidebar-item-date">
                      {formatDate(conv.created_at)}
                    </p>
                  </div>
                  {(hoveredId === conv.id ||
                    currentConversationId === conv.id) && (
                    <button
                      className="sidebar-delete-btn"
                      style={{ opacity: 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Toggle tab — inside panel so it slides with the panel */}
          <button
            className="sidebar-toggle-tab"
            onClick={onToggle}
            title={isOpen ? "Close sidebar" : "Open sidebar"}
          >
            {isOpen ? (
              <ChevronLeft size={11} strokeWidth={2.5} />
            ) : (
              <ChevronRight size={11} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN CHAT INTERFACE
───────────────────────────────────────────────────────────────────────────── */
const ChatInterface: React.FC = () => {
  // ── Theme ──────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  // ── State ──────────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<
    number | null
  >(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ── Auto-resize textarea ───────────────────────────────────────────────────
  const handleQueryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setQuery(v);
    setCharCount(v.length);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  };

  // ── Load messages for a conversation ──────────────────────────────────────
  const loadConversationMessages = useCallback(async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/conversations/${id}/messages`);
      const data = await res.json();
      setMessages(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleConversationSelect = (id: number) => {
    setCurrentConversationId(id);
    loadConversationMessages(id);
    setSidebarOpen(false);
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
  };

  // ── Send ───────────────────────────────────────────────────────────────────
  const sendQuery = async () => {
    if (!query.trim() || isLoading) return;

    const userMessage = query.trim();
    setQuery("");
    setCharCount(0);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: currentConversationId,
          message: userMessage,
        }),
      });

      if (!res.ok) {
        setShowAlert(true);
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data.conversation_id && !currentConversationId) {
        setCurrentConversationId(data.conversation_id);
        setRefreshTrigger((n) => n + 1);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => prev.slice(0, -1));
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuery();
    }
  };

  const handleSuggest = (s: string) => {
    setQuery(s);
    setCharCount(s.length);
    textareaRef.current?.focus();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      {/* Sidebar */}
      <Sidebar
        currentConversationId={currentConversationId}
        onConversationSelect={handleConversationSelect}
        onNewConversation={handleNewConversation}
        onConversationDeleted={() => setRefreshTrigger((n) => n + 1)}
        refreshTrigger={refreshTrigger}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
      />

      {/* Main area */}
      <div className="main-area">
        {/* Header */}
        <div className="chat-header">
          <button
            className="header-menu-btn"
            onClick={() => setSidebarOpen((o) => !o)}
            title="Toggle sidebar"
          >
            <Menu size={18} />
          </button>

          <div className="header-title">
            <div className="header-pip" />
            <h1>{messages.length > 0 ? "Conversation" : "New Thread"}</h1>
          </div>

          <button
            className="header-icon-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>

        {/* Messages */}
        <div className="messages-scroll" ref={scrollRef}>
          {messages.length === 0 && !isLoading ? (
            <EmptyState onSuggest={handleSuggest} />
          ) : (
            <div className="messages-inner">
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}
              {isLoading && <ThinkingIndicator />}
              <div ref={messagesEndRef} style={{ height: "1px" }} />
            </div>
          )}
        </div>

        {/* Floating input */}
        <div className="input-float-wrap">
          <div className="input-float">
            <div className="input-row">
              <textarea
                ref={textareaRef}
                className="input-textarea"
                value={query}
                onChange={handleQueryChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything…"
                rows={1}
              />
              <button
                className={`send-btn ${query.trim() && !isLoading ? "active" : "inactive"}`}
                onClick={sendQuery}
                disabled={isLoading || !query.trim()}
                title="Send message"
              >
                <SendHorizontal size={15} />
              </button>
            </div>

            <div className="input-hint-bar">
              <p className="input-hint">
                <kbd>↵</kbd> send · <kbd>⇧↵</kbd> new line
              </p>
              {charCount > 0 && (
                <span
                  className={`char-count ${charCount > 3800 ? "warn" : ""}`}
                >
                  {charCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Alert */}
      {showAlert && (
        <AlertBox
          title="Connection failed"
          msg="Could not reach the server. Make sure the backend is running and try again."
          onClose={() => setShowAlert(false)}
        />
      )}
    </div>
  );
};

export default ChatInterface;
