import React, { useState } from "react";
import { SendHorizontal } from "lucide-react";
import AlertBox from "./Alert";
import MessageList from "./Messages"; // Import the new component

interface Message {
  role: "user" | "assistant";
  content: string;
}

const API_BASE = "/api";

export default function QueryBox() {
  const placeholder = "Search Something ...";
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const currentConversationId = 1;

  const sendQuery = async () => {
    if (!query.trim() || !currentConversationId || isLoading) return;

    const userMessage = query.trim();
    setQuery("");
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: currentConversationId,
          message: userMessage,
        }),
      });

      if (!response.ok) {
        setShowAlert(true);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [...prev.slice(0, -1)]);
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuery();
    }
  };

  return (
    <div className="w-full">
      {/* Message List Component */}
      <MessageList messages={messages} />

      {/* Input Box */}
      <div className="relative flex items-center mt-4">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          rows={1}
          className="w-full resize-none rounded-2xl border border-gray-300 bg-gray-800 text-white p-3 pr-12 focus:outline-none focus:border-gray-500 placeholder-gray-400"
        />
        <button
          onClick={sendQuery}
          disabled={isLoading}
          className="absolute right-2 p-2 text-gray-300 hover:text-white disabled:opacity-50"
        >
          <SendHorizontal size={22} color="white" />
        </button>
      </div>

      {/* Alert Box */}
      {showAlert && (
        <AlertBox
          title="Error Connecting to Server !!!"
          msg="Sorry, I encountered an error. Please make sure the backend server is running and try again."
          onClose={() => setShowAlert(false)}
        />
      )}
    </div>
  );
}
