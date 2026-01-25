'use client';

import { FileText, Image as ImageIcon, Calendar, Clock } from "lucide-react";
import Loader from "./Loader";

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

interface ArticlePanelProps {
  article: Article | null;
  isLoading: boolean;
  status: string;
}

// Component to render a single point with its image
function ArticlePointCard({ point, index }: { point: ArticlePoint; index: number }) {
  const isEven = index % 2 === 0;
  
  return (
    <div className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} gap-4 py-6 border-b border-white/10 last:border-0`}>
      {/* Content side */}
      <div className={`flex-1 ${point.imageData ? 'md:w-1/2' : 'w-full'}`}>
        <h3 className="text-lg font-bold mb-2 flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
          <span 
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ 
              background: 'hsl(var(--primary) / 0.2)', 
              color: 'hsl(var(--primary))' 
            }}
          >
            {index + 1}
          </span>
          {point.heading}
        </h3>
        <p className="leading-relaxed whitespace-pre-wrap" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {point.content}
        </p>
      </div>
      
      {/* Image side */}
      {point.imageData && (
        <div className="flex-1 md:w-1/2">
          <div className="relative overflow-hidden rounded-xl glow-border">
            <img
              src={point.imageData}
              alt={point.heading}
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
}

const ArticlePanel = ({ article, isLoading, status }: ArticlePanelProps) => {
  if (isLoading && !article) {
    return (
      <div className="h-full glass-card flex flex-col items-center justify-center">
        <div className="text-center space-y-4">
          <div 
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center glow-border"
            style={{ background: 'hsl(var(--primary) / 0.2)' }}
          >
            <FileText className="w-8 h-8 animate-pulse" style={{ color: 'hsl(var(--primary))' }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold glow-text" style={{ color: 'hsl(var(--foreground))' }}>
              {status || 'جاري إنشاء المقال...'}
            </h3>
            <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
              يتم الآن كتابة المحتوى وتجهيز الصور
            </p>
          </div>
          <Loader />
          {/* Shimmer skeleton */}
          <div className="w-full max-w-md mx-auto space-y-3 mt-8">
            <div className="h-4 rounded animate-shimmer" />
            <div className="h-4 rounded animate-shimmer w-3/4" />
            <div className="h-4 rounded animate-shimmer w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="h-full glass-card flex flex-col items-center justify-center">
        <div className="text-center space-y-4">
          <div 
            className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
            style={{ background: 'hsl(var(--muted) / 0.5)' }}
          >
            <ImageIcon className="w-10 h-10" style={{ color: 'hsl(var(--muted-foreground))' }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
              لا يوجد مقال بعد
            </h3>
            <p className="text-sm mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
              اكتب موضوعاً في الشات لبدء إنشاء مقال جديد
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full glass-card overflow-y-auto scrollbar-thin" dir="rtl">
      {/* Article Header with gradient */}
      <div 
        className="p-6 border-b border-white/10"
        style={{ 
          background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1) 0%, hsl(var(--accent) / 0.1) 100%)' 
        }}
      >
        <div className="flex items-center gap-4 text-xs mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date().toLocaleDateString("ar-EG")}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {article.points.length * 2} دقائق قراءة
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold glow-text leading-relaxed" style={{ color: 'hsl(var(--foreground))' }}>
          {article.title}
        </h1>
      </div>

      {/* Article Content */}
      <div className="p-6">
        {/* Introduction */}
        <div 
          className="rounded-xl p-4 mb-6"
          style={{ background: 'hsl(var(--primary) / 0.1)' }}
        >
          <p className="leading-relaxed" style={{ color: 'hsl(var(--foreground))' }}>
            {article.introduction}
          </p>
        </div>

        {/* Points with Images */}
        <div className="space-y-2">
          {article.points.map((point, index) => (
            <ArticlePointCard key={index} point={point} index={index} />
          ))}
        </div>

        {/* Conclusion */}
        <div 
          className="rounded-xl p-4 mt-6"
          style={{ 
            background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1) 0%, hsl(var(--accent) / 0.1) 100%)' 
          }}
        >
          <h3 className="text-lg font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>الخلاصة</h3>
          <p className="leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {article.conclusion}
          </p>
        </div>

        {/* Loading indicator for images */}
        {isLoading && (
          <div className="mt-4 flex items-center justify-center gap-2 py-4">
            <Loader />
            <span className="text-sm" style={{ color: 'hsl(var(--primary))' }}>{status}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticlePanel;
