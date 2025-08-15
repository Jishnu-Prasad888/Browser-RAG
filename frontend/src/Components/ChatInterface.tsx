import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./Sidebar";
import MessageList from "./Messages";
import { SendHorizontal, Copy, Check } from "lucide-react";
import AlertBox from "./Alert";
import Markdown from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import hljs from "highlight.js/lib/core";
import latex from "highlight.js/lib/languages/latex";
import "highlight.js/styles/github-dark.css";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const ChatInterfaceComponent: React.FC = () => {
  hljs.registerLanguage("latex", latex);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentConversationId, setCurrentConversationId] = useState<
    number | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create a new conversation when component mounts or when requested
  useEffect(() => {
    if (!currentConversationId) {
      createNewConversation();
    }
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    }
  }, [currentConversationId]);

  const handleConversationDeleted = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const createNewConversation = async () => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
      });
      const data = await response.json();
      setCurrentConversationId(data.id);
      setMessages([]);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error creating conversation:", error);
      setShowAlert(true);
    }
  };

  const loadMessages = async (conversationId: number) => {
    try {
      const response = await fetch(`/api/messages/${conversationId}`);
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error("Error loading messages:", error);
      setShowAlert(true);
    }
  };

  const sendQuery = async () => {
    if (!query.trim() || !currentConversationId || isLoading) return;

    const userMessage = query.trim();
    setQuery("");
    setIsLoading(true);

    // Optimistically update UI
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: currentConversationId,
          message: userMessage,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.slice(0, -1)); // Remove failed message
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

  const EnhancedMessageList = ({ messages }: { messages: Message[] }) => {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const copyToClipboard = (text: string, index: number) => {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      });
    };

    return (
      <div className="space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg ${
              message.role === "user"
                ? "bg-blue-900/30 ml-auto max-w-[90%]"
                : "bg-gray-800/50 mr-auto max-w-[90%] relative"
            }`}
          >
            <div className="flex items-start">
              <div className="flex-1">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\S+)/.exec(className || "");
                      const language = match ? match[1] : "text"; // fallback if no language
                      return !inline ? (
                        <div className="bg-gray-900 rounded-md overflow-hidden my-2">
                          <div className="px-4 py-1 text-xs text-gray-400 bg-gray-800">
                            {language}
                          </div>
                          <code
                            className={`${className} block overflow-x-auto p-4`}
                            {...props}
                          >
                            {children}
                          </code>
                        </div>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
              {message.role === "assistant" && (
                <button
                  onClick={() => copyToClipboard(message.content, index)}
                  className="ml-2 text-gray-400 hover:text-white transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedIndex === index ? (
                    <Check size={16} className="text-green-400" />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    );
  };

  return (
    <div className="w-full h-screen flex bg-gray-900 text-gray-100">
      {/* Sidebar with glassmorphism */}
      <div className="bg-gray-500/60 backdrop-blur-3xl backdrop-brightness-100">
        <Sidebar
          currentConversationId={currentConversationId}
          onConversationSelect={(id) => setCurrentConversationId(id)}
          onNewConversation={createNewConversation}
          refreshTrigger={refreshTrigger}
          onConversationDeleted={handleConversationDeleted}
        />
      </div>

      {/* Main chat area with glassmorphism */}
      <div className="flex-1 flex flex-col bg-gray-500/60 backdrop-blur-3xl backdrop-brightness-100">
        <div className="flex-1 overflow-y-auto p-4">
          <EnhancedMessageList messages={messages} />
        </div>

        <div className="p-4 border-t border-gray-800">
          <div className="relative">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask away..."
              rows={1}
              className="w-full resize-none rounded-lg border border-gray-700 bg-gray-800/70 p-3 pr-12 focus:outline-none focus:border-gray-600"
            />
            <button
              onClick={sendQuery}
              disabled={isLoading}
              className="absolute right-2 top-2 p-2 text-gray-400 hover:text-white disabled:opacity-50 pb-1"
            >
              <SendHorizontal size={20} />
            </button>
          </div>
        </div>
      </div>

      {showAlert && (
        <AlertBox
          title="Error"
          msg="An error occurred. Please try again."
          onClose={() => setShowAlert(false)}
        />
      )}
    </div>
  );
};

export default ChatInterfaceComponent;
