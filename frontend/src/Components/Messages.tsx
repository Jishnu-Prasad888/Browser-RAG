import React from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  return (
    <div className="mt-4 space-y-3">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`p-3 rounded-lg ${
            msg.role === "user"
              ? "bg-blue-900/30 text-blue-100 ml-auto max-w-[80%]"
              : "bg-gray-700/50 text-gray-100 mr-auto max-w-[80%]"
          }`}
        >
          <strong className="block font-semibold">
            {msg.role === "user" ? "You" : "Assistant"}
          </strong>
          <p className="mt-1">{msg.content}</p>
        </div>
      ))}
    </div>
  );
}
