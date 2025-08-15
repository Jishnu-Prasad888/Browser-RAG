import React, { useState, useEffect } from "react";
import { Plus, Trash2, MessageSquare } from "lucide-react";

interface Conversation {
  id: number;
  title: string;
  created_at: string;
}

interface SidebarProps {
  currentConversationId: number | null;
  onConversationSelect: (id: number) => void;
  onNewConversation: () => void;
  onConversationDeleted: () => void; // NEW
  refreshTrigger: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  onConversationDeleted, // NEW
  refreshTrigger,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

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

      if (currentConversationId === id) {
        onNewConversation(); // reset to new convo if current one deleted
      }

      onConversationDeleted(); // triggers parent to bump refreshTrigger
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  return (
    <div className="w-64 h-screen bg-gray-900 text-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={onNewConversation}
          className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-gray-700 transition-colors"
        >
          <Plus size={16} />
          <span>New chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center">Loading...</div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`flex items-center justify-between p-3 hover:bg-gray-800 cursor-pointer ${
                currentConversationId === conv.id ? "bg-gray-800" : ""
              }`}
            >
              <div
                className="flex items-center gap-2 flex-1"
                onClick={() => onConversationSelect(conv.id)}
              >
                <MessageSquare size={16} />
                <span className="truncate">{conv.title}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
                className="text-gray-400 hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Sidebar;
