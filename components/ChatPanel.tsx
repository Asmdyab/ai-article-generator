'use client';

import { Send, Bot } from "lucide-react";
import ChatMessage from "./ChatMessage";
import Loader from "./Loader";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  status: string;
}

const ChatPanel = ({ messages, input, setInput, onSend, isLoading, status }: ChatPanelProps) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex flex-col h-full glass-card">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center glow-border"
          style={{ background: 'hsl(var(--primary) / 0.2)' }}
        >
          <Bot className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
        </div>
        <div>
          <h2 className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>AI Article Agent</h2>
          <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>وكيل ذكي للبحث وكتابة المقالات</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">💬</div>
            <h3 className="font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>ابدأ المحادثة!</h3>
            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
              اكتب موضوع المقال الذي تريد إنشاءه
            </p>
          </div>
        )}
        
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role}
            content={message.content}
          />
        ))}
        
        {isLoading && (
          <div className="flex items-center gap-2 chat-bubble-ai w-fit">
            <Loader />
            <span className="text-sm" style={{ color: 'hsl(var(--primary))' }}>{status}</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="اكتب موضوع المقال..."
            className="flex-1 px-4 py-3 rounded-xl text-right outline-none transition"
            style={{
              background: 'hsl(var(--muted) / 0.5)',
              border: '1px solid hsl(0 0% 100% / 0.1)',
              color: 'hsl(var(--foreground))',
            }}
            disabled={isLoading}
            dir="rtl"
          />
          <button
            onClick={onSend}
            disabled={isLoading || !input.trim()}
            className="px-4 py-3 rounded-xl transition glow-border disabled:opacity-50"
            style={{
              background: 'hsl(var(--primary))',
              color: 'white',
            }}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
