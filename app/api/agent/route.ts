import { createVertex, type GoogleVertexImageProviderOptions } from '@ai-sdk/google-vertex';
import { ToolLoopAgent, tool, stepCountIs, Output, generateText, generateImage } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';

// Validate required environment variables
function validateEnv() {
  const missing: string[] = [];
  if (!process.env.GOOGLE_VERTEX_PROJECT) missing.push('GOOGLE_VERTEX_PROJECT');
  if (!process.env.EXA_API_KEY) missing.push('EXA_API_KEY');
  if (missing.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}`);
  }
}
validateEnv();

// Create Vertex AI provider instance
const vertex = createVertex({
  project: process.env.GOOGLE_VERTEX_PROJECT || 'asem-pro',
  location: process.env.GOOGLE_VERTEX_LOCATION || 'us-central1',
});

// Helper: delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generate image using AI SDK generateImage with Vertex Imagen
async function generateImageFromPrompt(prompt: string, retryCount = 0): Promise<string | null> {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 5000;
  
  try {
    const { image } = await generateImage({
      model: vertex.image('imagen-3.0-generate-001'),
      prompt: prompt.slice(0, 200),
      aspectRatio: '16:9',
      providerOptions: {
        vertex: {
          safetySetting: 'block_only_high',
          personGeneration: 'allow_adult',
        } satisfies GoogleVertexImageProviderOptions,
      },
    });
    
    // image.base64 contains the base64 encoded image
    if (image.base64) {
      return `data:image/png;base64,${image.base64}`;
    }
    
    return null;
  } catch (error: unknown) {
    // Handle rate limiting with retry
    if (
      error instanceof Error &&
      error.message?.includes('429') &&
      retryCount < MAX_RETRIES
    ) {
      const waitTime = BASE_DELAY * Math.pow(2, retryCount);
      await delay(waitTime);
      return generateImageFromPrompt(prompt, retryCount + 1);
    }
    
    console.error('Image generation error:', error);
    return null;
  }
}

// Article Schema for structured output
const ArticlePointSchema = z.object({
  heading: z.string().describe('عنوان النقطة'),
  content: z.string().describe('محتوى النقطة'),
  imagePrompt: z.string().describe('وصف الصورة بالإنجليزية لتوليدها'),
  shouldHaveImage: z.boolean().describe('هل تحتاج هذه النقطة صورة'),
});

const ArticleSchema = z.object({
  title: z.string().describe('عنوان المقال'),
  introduction: z.string().describe('مقدمة المقال'),
  points: z.array(ArticlePointSchema).length(4).describe('نقاط المقال - يجب أن تكون 4 نقاط بالضبط'),
  conclusion: z.string().describe('خاتمة المقال'),
});

type SendEventFn = (type: string, data: unknown) => void;

// Create tools with sendEvent passed via closure (thread-safe)
function createAgentTools(sendEvent: SendEventFn) {
  const exa = new Exa(process.env.EXA_API_KEY);

  return {
    // Tool 1: Search the web
    search_web: tool({
      description: 'Search the web for information about a topic. Use this to gather information before writing an article.',
      inputSchema: z.object({
        query: z.string().describe('The search query'),
      }),
      execute: async ({ query }) => {
        console.log('🔍 Agent searching for:', query);
        sendEvent('status', { message: 'جاري البحث...' });
        
        try {
          const results = await exa.searchAndContents(query, {
            numResults: 5,
            text: { maxCharacters: 1000 },
          });
          
          const searchResults = results.results
            .map((r) => 
              `Title: ${r.title || 'No title'}\nContent: ${r.text?.substring(0, 800) || ''}`
            )
            .join('\n---\n')
            .substring(0, 5000);
          
          console.log('🔍 Search results count:', results.results.length);
          sendEvent('status', { message: `تم البحث! وجدت ${results.results.length} نتائج` });
          
          return {
            success: true,
            results: searchResults || 'No results found',
            count: results.results.length,
          };
        } catch (error) {
          console.error('Search error:', error);
          return { success: false, results: 'Search unavailable', count: 0 };
        }
      },
    }),

    // Tool 2: Generate article using Output.object (AI SDK 6 pattern)
    generate_article: tool({
      description: 'Generate a structured article in Arabic. Use AFTER searching for information.',
      inputSchema: z.object({
        topic: z.string().describe('The article topic'),
        searchResults: z.string().describe('Search results to base the article on'),
      }),
      execute: async ({ topic, searchResults }) => {
        console.log('📝 Agent generating article for:', topic);
        sendEvent('status', { message: 'جاري كتابة المقال...' });
        
        // Use generateText with Output.object (AI SDK 6 recommended pattern)
        const result = await generateText({
          model: vertex('gemini-2.5-flash'),
          output: Output.object({ schema: ArticleSchema }),
          prompt: `اكتب مقال احترافي عن: ${topic}

نتائج البحث:
${searchResults.substring(0, 4000)}

المطلوب:
- عنوان جذاب
- مقدمة شيقة
- 4 نقاط رئيسية (كل نقطة لها عنوان ومحتوى تفصيلي ووصف صورة بالإنجليزية)
- خاتمة ملخصة
- اجعل shouldHaveImage=true لنقطتين فقط من الأربع نقاط`,
        });
        
        const article = result.output;
        
        if (!article) {
          return { success: false, message: 'Failed to generate article' };
        }
        
        // Send article to frontend immediately
        sendEvent('article', article);
        sendEvent('status', { message: 'تم إنشاء المقال!' });
        
        // Return simplified version to agent (no full content to save tokens)
        return {
          success: true,
          title: article.title,
          pointsCount: article.points.length,
          pointsNeedingImages: article.points
            .map((p, i) => ({ index: i, heading: p.heading, imagePrompt: p.imagePrompt, shouldHaveImage: p.shouldHaveImage }))
            .filter(p => p.shouldHaveImage),
        };
      },
    }),

    // Tool 3: Generate image
    generate_image: tool({
      description: 'Generate an image for an article point. Call this for each point that needs an image.',
      inputSchema: z.object({
        prompt: z.string().describe('Image description in English'),
        pointIndex: z.number().describe('Index of the article point'),
        heading: z.string().describe('Heading of the point'),
      }),
      execute: async ({ prompt, pointIndex, heading }) => {
        console.log('🖼️ Agent generating image for:', heading);
        sendEvent('status', { message: `جاري توليد صورة: ${heading}...` });
        
        const imageData = await generateImageFromPrompt(prompt);
        
        if (imageData) {
          // Send image to frontend (NOT to agent context!)
          sendEvent('image', { pointIndex, imageData, heading });
          
          return {
            success: true,
            message: `Image generated successfully for "${heading}"`,
            pointIndex,
          };
        }
        
        return {
          success: false,
          message: `Failed to generate image for "${heading}"`,
          pointIndex,
        };
      },
    }),
  };
}

// Agent instructions (AI SDK 6 uses 'instructions' instead of 'system')
const AGENT_INSTRUCTIONS = `You are an AI assistant that helps users create articles in Arabic.

You have these tools:
1. search_web - Search the internet for information
2. generate_article - Create a structured article (returns points that need images)
3. generate_image - Generate an image for a specific article point

When user asks to create an article:
1. Use search_web to find information about the topic
2. Use generate_article to write the article based on search results
3. Check the result for pointsNeedingImages and use generate_image for EACH point that needs an image

IMPORTANT: After creating an article, DO NOT repeat or summarize the article content in your response.
Just say a short confirmation like "تم إنشاء المقال بنجاح! يمكنك مشاهدته على اليمين."
NEVER include the article text, points, or any content from the article in your chat response.

For chat/greetings, respond directly without tools.
Always respond in Arabic.`;

export async function POST(req: Request) {
  try {
    const { message, messages = [] } = await req.json();
    const userMessage = message || messages[messages.length - 1]?.content || '';
    
    console.log('=== Agent received message:', userMessage, '===');

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        // Thread-safe sendEvent function scoped to this request
        const sendEvent: SendEventFn = (type, data) => {
          try {
            controller.enqueue(encoder.encode(`${type}:${JSON.stringify(data)}\n`));
          } catch {
            // Controller might be closed
          }
        };
        
        try {
          sendEvent('status', { message: 'جاري تحليل الطلب...' });
          
          // Create tools with sendEvent passed directly (thread-safe)
          const agentTools = createAgentTools(sendEvent);
          
          // Create the ToolLoopAgent (AI SDK 6 pattern)
          const agent = new ToolLoopAgent({
            model: vertex('gemini-2.5-flash'),
            instructions: AGENT_INSTRUCTIONS,
            tools: agentTools,
            stopWhen: stepCountIs(10), // Default in SDK 6 is 20, we use 10
          });
          
          // Run the agent
          const result = await agent.generate({
            prompt: userMessage,
          });
          
          console.log('Agent completed. Steps:', result.steps?.length || 0);
          
          // Send final text response if any
          if (result.text) {
            sendEvent('chat', { message: result.text });
          }
          
          sendEvent('status', { message: 'تم الانتهاء!' });
          sendEvent('done', { success: true });
          
        } catch (error) {
          console.error('Agent error:', error);
          sendEvent('error', { message: 'حدث خطأ في معالجة الطلب' });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
