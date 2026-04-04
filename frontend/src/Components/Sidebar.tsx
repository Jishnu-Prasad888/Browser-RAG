import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Conversation {
  id: number;
  title: string;
  created_at: string;
}

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
      const response = await fetch("/api/conversations");
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (id: number) => {
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (currentConversationId === id) onNewConversation();
      onConversationDeleted();
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? "open" : ""}`}
        onClick={onToggle}
      />

      {/* Sidebar rail */}
      <div className="sidebar-rail">
        <div className={`sidebar-panel ${isOpen ? "open" : ""}`}>
          {/* Header */}
          <div
            style={{
              padding: "28px 20px 20px",
              borderBottom: "1px solid var(--border-subtle)",
              flexShrink: 0,
            }}
          >
            <div style={{ marginBottom: "4px" }}>
              <div className="accent-bar" style={{ marginBottom: "12px" }} />
              <p
                style={{
                  fontFamily: "'Instrument Serif', serif",
                  fontSize: "1.35rem",
                  fontWeight: 400,
                  fontStyle: "italic",
                  color: "var(--text-primary)",
                  margin: 0,
                  lineHeight: 1.15,
                  letterSpacing: "-0.01em",
                }}
              >
                Threads
              </p>
              <p
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  margin: "4px 0 0",
                }}
              >
                {conversations.length} conversation
                {conversations.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* New Chat Button */}
          <div style={{ padding: "14px 14px 8px" }}>
            <button
              onClick={() => {
                onNewConversation();
                onToggle();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "9px",
                width: "100%",
                padding: "11px 14px",
                borderRadius: "11px",
                border: "1px solid var(--border-subtle)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: "0.82rem",
                fontWeight: 600,
                letterSpacing: "0.02em",
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
              onMouseEnter={(e) => {
                const t = e.currentTarget;
                t.style.background = "var(--accent-glow)";
                t.style.borderColor = "var(--border-focus)";
                t.style.color = "var(--accent-primary)";
              }}
              onMouseLeave={(e) => {
                const t = e.currentTarget;
                t.style.background = "transparent";
                t.style.borderColor = "var(--border-subtle)";
                t.style.color = "var(--text-secondary)";
              }}
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>New thread</span>
            </button>
          </div>

          {/* Conversation List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 10px 20px" }}>
            {loading ? (
              <div style={{ padding: "20px 8px" }}>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      height: "52px",
                      borderRadius: "10px",
                      background: "var(--border-subtle)",
                      marginBottom: "6px",
                      animation: "pulse 1.6s ease-in-out infinite",
                      animationDelay: `${i * 0.1}s`,
                    }}
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
                  size={22}
                  style={{ margin: "0 auto 10px", opacity: 0.3 }}
                />
                <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 500 }}>
                  No threads yet
                </p>
                <p style={{ margin: "4px 0 0", fontSize: "0.72rem" }}>
                  Start a new conversation
                </p>
              </div>
            ) : (
              conversations.map((conv, idx) => (
                <div
                  key={conv.id}
                  className="sidebar-item"
                  onMouseEnter={() => setHoveredId(conv.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => {
                    onConversationSelect(conv.id);
                    onToggle();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 11px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    marginBottom: "2px",
                    background:
                      currentConversationId === conv.id
                        ? "var(--bg-active)"
                        : hoveredId === conv.id
                          ? "var(--bg-surface-hover)"
                          : "transparent",
                    border:
                      currentConversationId === conv.id
                        ? "1px solid var(--border-subtle)"
                        : "1px solid transparent",
                    animation: `msgFadeIn 0.22s ease both`,
                    animationDelay: `${idx * 0.03}s`,
                  }}
                >
                  {/* Active indicator */}
                  <div
                    style={{
                      width: "3px",
                      height: "28px",
                      borderRadius: "2px",
                      background:
                        currentConversationId === conv.id
                          ? "var(--accent-primary)"
                          : "transparent",
                      flexShrink: 0,
                      marginRight: "10px",
                      transition: "background 0.2s",
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.82rem",
                        fontWeight:
                          currentConversationId === conv.id ? 600 : 400,
                        color:
                          currentConversationId === conv.id
                            ? "var(--text-primary)"
                            : "var(--text-secondary)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        lineHeight: 1.3,
                      }}
                    >
                      {conv.title}
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                        fontWeight: 500,
                      }}
                    >
                      {formatDate(conv.created_at)}
                    </p>
                  </div>
                  {(hoveredId === conv.id ||
                    currentConversationId === conv.id) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                      style={{
                        flexShrink: 0,
                        background: "none",
                        border: "none",
                        padding: "4px 5px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        marginLeft: "4px",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "#ef4444";
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "rgba(239,68,68,0.1)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "var(--text-muted)";
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "none";
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Toggle tab */}
        <button
          className="sidebar-toggle"
          onClick={onToggle}
          title={isOpen ? "Close sidebar" : "Open sidebar"}
          style={{ background: "none", border: "none", padding: 0 }}
        >
          {isOpen ? (
            <ChevronLeft size={12} strokeWidth={2.5} />
          ) : (
            <ChevronRight size={12} strokeWidth={2.5} />
          )}
        </button>
      </div>
    </>
  );
};

export default Sidebar;
