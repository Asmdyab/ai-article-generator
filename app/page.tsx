'use client';

import { useState, useRef, useEffect } from 'react';
import AnimatedBackground from '@/components/AnimatedBackground';
import ChatPanel from '@/components/ChatPanel';
import ArticlePanel from '@/components/ArticlePanel';

// Types
interface ArticlePoint {
  heading: string;
  content: string;
  imagePrompt: string;
  shouldHaveImage: boolean;
  imageData?: string;
}

interface Article {
  title: string;
  introduction: string;
  points: ArticlePoint[];
  conclusion: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStatus('جاري التحليل...');

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = '';
        let articleReceived = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            
            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) continue;
            
            const type = line.substring(0, colonIndex);
            const data = line.substring(colonIndex + 1);
            
            try {
              if (type === 'status') {
                const parsed = JSON.parse(data);
                setStatus(parsed.message);
              } else if (type === 'chat') {
                const parsed = JSON.parse(data);
                const assistantMessage: Message = {
                  id: `assistant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  role: 'assistant',
                  content: parsed.message,
                };
                setMessages(prev => [...prev, assistantMessage]);
              } else if (type === 'article') {
                const parsed = JSON.parse(data);
                setCurrentArticle(parsed);
                articleReceived = true;
              } else if (type === 'image') {
                const parsed = JSON.parse(data);
                setCurrentArticle(prev => {
                  if (!prev) return prev;
                  const newPoints = [...prev.points];
                  if (newPoints[parsed.pointIndex]) {
                    newPoints[parsed.pointIndex] = {
                      ...newPoints[parsed.pointIndex],
                      imageData: parsed.imageData
                    };
                  }
                  return { ...prev, points: newPoints };
                });
              } else if (type === 'done') {
                setStatus('');
              } else if (type === 'error') {
                const parsed = JSON.parse(data);
                setStatus(`خطأ: ${parsed.message}`);
              }
            } catch (e) {
              console.error('Failed to parse:', type, e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setStatus('حدث خطأ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative" style={{ background: 'hsl(var(--background))' }}>
      <AnimatedBackground />

      {/* Header */}
      <header className="relative z-10 p-4 glass-card rounded-none border-x-0 border-t-0">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center glow-border"
              style={{ background: 'hsl(var(--primary))' }}
            >
              <span className="text-xl font-bold text-white">A</span>
            </div>
            <h1 className="text-xl font-bold glow-text" style={{ color: 'hsl(var(--foreground))' }}>
              AI Article Agent 🤖
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto p-4 h-[calc(100vh-80px)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          {/* Chat Panel - Left */}
          <div className="h-full min-h-[500px] lg:min-h-0">
            <ChatPanel 
              messages={messages}
              input={input}
              setInput={setInput}
              onSend={handleSend}
              isLoading={isLoading}
              status={status}
            />
          </div>

          {/* Article Panel - Right */}
          <div className="h-full min-h-[500px] lg:min-h-0">
            <ArticlePanel 
              article={currentArticle} 
              isLoading={isLoading} 
              status={status}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
