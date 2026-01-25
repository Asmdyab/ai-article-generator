import { Bot, User } from "lucide-react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

const ChatMessage = ({ role, content }: ChatMessageProps) => {
  const isUser = role === "user";

  return (
    <div
      className={`flex gap-3 animate-fade-in-up ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
          isUser ? "bg-primary" : "glass-card"
        }`}
        style={isUser ? { background: 'hsl(var(--primary))' } : undefined}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
        )}
      </div>
      <div
        className={`max-w-[80%] ${
          isUser ? "chat-bubble-user" : "chat-bubble-ai"
        }`}
        dir="rtl"
      >
        <p className="text-sm leading-relaxed">{content}</p>
      </div>
    </div>
  );
};

export default ChatMessage;
