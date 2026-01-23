'use client';

import { useState } from 'react';

// Type for image data from tool results
interface GeneratedImage {
  imageData: string;
  label: string;
}

// Component to render article content with embedded images
function ArticleContent({ content, images }: { content: string; images: GeneratedImage[] }) {
  // Clean up the content - remove tool result markers
  let cleanContent = content
    .replace(/\[IMAGE_GENERATED:[^\]]+\][^\n]*/g, '') // Remove image success markers
    .replace(/\[IMAGE_FAILED\][^\n]*/g, '') // Remove image failure markers
    .trim();
  
  // Format markdown
  const formatText = (text: string) => {
    return text
      .replace(/\\n/g, '\n')
      .replace(/\n/g, '<br />')
      .replace(/## (.+)/g, '<h2 class="font-bold text-2xl mt-6 mb-3 text-gray-900">$1</h2>')
      .replace(/### (.+)/g, '<h3 class="font-bold text-xl mt-4 mb-2 text-gray-800">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  };
  
  return (
    <div className="space-y-6">
      {/* Show generated images at the top */}
      {images.length > 0 && (
        <div className="mb-8">
          {images.map((img, index) => (
            <figure key={index} className="my-4">
              <img
                src={img.imageData}
                alt={img.label || 'Generated image'}
                className="w-full max-w-2xl mx-auto rounded-lg shadow-lg"
              />
              {img.label && (
                <figcaption className="text-center text-sm text-gray-500 mt-2 italic">
                  {img.label}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )}
      
      {/* Article text content */}
      <div
        className="whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: formatText(cleanContent) }}
      />
    </div>
  );
}

export default function Home() {
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [article, setArticle] = useState('');
  const [images, setImages] = useState<GeneratedImage[]>([]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setIsGenerating(true);
    setArticle('');
    setImages([]);

    try {
      console.log('Fetching article for topic:', topic);
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.trim()) continue;
            
            console.log('Raw line:', line.substring(0, 100));
            
            // Try to parse as data stream format (Next.js AI SDK format)
            if (line.startsWith('0:')) {
              // Text delta format: 0:"text"
              try {
                const text = line.slice(2).replace(/^"(.*)"$/, '$1');
                console.log('Text chunk:', text.substring(0, 50));
                setArticle((prev) => prev + text);
              } catch (e) {
                console.error('Failed to parse text:', e);
              }
            } else if (line.startsWith('a:')) {
              // Tool results format
              try {
                const toolData = JSON.parse(line.slice(2));
                if (toolData && Array.isArray(toolData)) {
                  for (const item of toolData) {
                    if (item.result?.imageData && item.result?.success) {
                      console.log('Found image:', item.result.label);
                      setImages((prev) => [...prev, {
                        imageData: item.result.imageData,
                        label: item.result.label || 'Generated Image'
                      }]);
                    }
                  }
                }
              } catch (e) {
                console.error('Failed to parse tool data:', e);
              }
            } else {
              // Check if it's an image marker that should be filtered
              if (line.includes('[IMAGE_GENERATED:') || line.includes('[IMAGE_FAILED]')) {
                console.log('Skipping image marker:', line);
                // Don't add to article - these are just status messages
              } else {
                // Plain text fallback (in case format is different)
                console.log('Plain text:', line.substring(0, 50));
                setArticle((prev) => prev + line + '\n');
              }
            }
          }
        }
        
        // Process any remaining buffer
        if (buffer.trim()) {
          console.log('Final buffer:', buffer.substring(0, 50));
          setArticle((prev) => prev + buffer);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setArticle('Error generating article. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🤖 AI Article Generator
          </h1>
          <p className="text-xl text-gray-600">
            Generate comprehensive articles with web research and AI
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="mb-6">
            <label
              htmlFor="topic"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Article Topic
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Artificial Intelligence in Healthcare"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              disabled={isGenerating}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center"
          >
            {isGenerating ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Generating Article...
              </>
            ) : (
              '✨ Generate Article'
            )}
          </button>
        </div>

        {article && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Generated Article
            </h2>
            <div className="prose prose-lg max-w-none">
              <ArticleContent content={article} images={images} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
