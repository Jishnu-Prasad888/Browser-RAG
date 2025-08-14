// src/App.tsx
import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: number;
  title: string;
}

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConv, setCurrentConv] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typingText, setTypingText] = useState("");

  useEffect(() => {
    fetch("http://localhost:8000/api/conversations")
      .then((res) => res.json())
      .then(setConversations);
  }, []);

  useEffect(() => {
    if (currentConv !== null) {
      fetch(`http://localhost:8000/api/messages/${currentConv}`)
        .then((res) => res.json())
        .then(setMessages);
    }
  }, [currentConv]);

  const newConversation = async () => {
    const res = await fetch("http://localhost:8000/api/conversations", {
      method: "POST",
    });
    const data = await res.json();
    setConversations([
      { id: data.id, title: "New Conversation" },
      ...conversations,
    ]);
    setCurrentConv(data.id);
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!input.trim() || currentConv === null) return;
    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");

    const res = await fetch("http://localhost:8000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: currentConv, message: input }),
    });

    const data = await res.json();
    typeWriterEffect(data.response);
  };

  const typeWriterEffect = (text: string) => {
    setTypingText("");
    let i = 0;
    const interval = setInterval(() => {
      setTypingText((prev) => prev + text[i]);
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        setMessages((prev) => [...prev, { role: "assistant", content: text }]);
        setTypingText("");
      }
    }, 20);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white p-4 flex flex-col">
        <button
          onClick={newConversation}
          className="bg-green-500 p-2 rounded mb-4"
        >
          + New Chat
        </button>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setCurrentConv(conv.id)}
              className={`p-2 rounded mb-2 cursor-pointer ${
                currentConv === conv.id ? "bg-gray-600" : "hover:bg-gray-700"
              }`}
            >
              {conv.title}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-gray-100">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`mb-2 flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`rounded-lg p-3 max-w-prose ${
                  m.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-black border"
                }`}
              >
                {m.role === "assistant" ? (
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          {typingText && (
            <div className="mb-2 flex justify-start">
              <div className="rounded-lg p-3 max-w-prose bg-white text-black border">
                <ReactMarkdown>{typingText}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        {currentConv !== null && (
          <div className="p-4 bg-white flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 border rounded-lg p-2"
            />
            <button
              onClick={sendMessage}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
