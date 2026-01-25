import { createVertex } from '@ai-sdk/google-vertex';
import { generateText, generateObject, streamText } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';

const exa = new Exa(process.env.EXA_API_KEY);

// Create Vertex AI provider instance
const vertex = createVertex({
  project: process.env.GOOGLE_VERTEX_PROJECT || 'asem-pro',
  location: process.env.GOOGLE_VERTEX_LOCATION || 'us-central1',
});

// Article schema
const ArticleSchema = z.object({
  title: z.string().describe('عنوان المقال'),
  introduction: z.string().describe('مقدمة المقال'),
  points: z.array(z.object({
    heading: z.string().describe('عنوان النقطة'),
    content: z.string().describe('محتوى النقطة بالتفصيل'),
    imagePrompt: z.string().describe('وصف للصورة المناسبة لهذه النقطة باللغة الإنجليزية'),
    shouldHaveImage: z.boolean().describe('هل هذه النقطة تحتاج صورة؟ اختر true لأغلب النقاط'),
  })),
  conclusion: z.string().describe('خاتمة المقال'),
});

// Tool decision schema
const ToolDecisionSchema = z.object({
  tool: z.enum(['generate_article', 'chat']).describe('Which tool to use'),
  topic: z.string().optional().describe('The article topic if generate_article is chosen'),
  response: z.string().optional().describe('The chat response if chat is chosen'),
});

// Helper: delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Search with Exa
async function searchWeb(topic: string): Promise<string> {
  try {
    console.log('Searching Exa for:', topic);
    const results = await exa.searchAndContents(topic, {
      numResults: 5,
      text: true,
    });
    
    const searchResults = results.results
      .map((r: any) => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.text?.substring(0, 800)}...`)
      .join('\n\n---\n\n');
    
    return searchResults || 'No results found';
  } catch (error) {
    console.error('Exa search error:', error);
    return 'Search temporarily unavailable';
  }
}

// Generate structured article
async function generateArticlePoints(topic: string, searchResults: string) {
  const result = await generateObject({
    model: vertex('gemini-2.5-flash'),
    schema: ArticleSchema,
    prompt: `بناءً على نتائج البحث التالية، قم بإنشاء مقال منظم عن: ${topic}

نتائج البحث:
${searchResults}

المطلوب:
1. اكتب عنوان جذاب للمقال
2. اكتب مقدمة شاملة
3. قسم المقال إلى 4-6 نقاط رئيسية
4. كل نقطة يجب أن تحتوي على:
   - عنوان واضح
   - محتوى مفصل (على الأقل 100 كلمة)
   - وصف للصورة المناسبة باللغة الإنجليزية
   - shouldHaveImage = true لأغلب النقاط (4-5 نقاط على الأقل)
5. اكتب خاتمة قوية

ملاحظة: اجعل المحتوى غني بالمعلومات من نتائج البحث`,
  });
  
  return result.object;
}

// Generate image using Imagen
async function generateImage(prompt: string, retryCount = 0): Promise<string | null> {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 5000;
  
  try {
    const project = process.env.GOOGLE_VERTEX_PROJECT || 'asem-pro';
    const location = process.env.GOOGLE_VERTEX_LOCATION || 'us-central1';
    
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/imagen-3.0-generate-001:predict`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ prompt: prompt.slice(0, 200) }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9',
          safetyFilterLevel: 'block_few',
          personGeneration: 'allow_adult',
        },
      }),
    });
    
    if (!response.ok) {
      if (response.status === 429 && retryCount < MAX_RETRIES) {
        const waitTime = BASE_DELAY * Math.pow(2, retryCount);
        await delay(waitTime);
        return generateImage(prompt, retryCount + 1);
      }
      return null;
    }
    
    const data = await response.json();
    
    if (data.predictions && data.predictions[0]?.bytesBase64Encoded) {
      return `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;
    }
    
    return null;
  } catch (error) {
    console.error('Image generation error:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { message, messages = [] } = await req.json();
    const userMessage = message || messages[messages.length - 1]?.content || '';
    
    console.log('=== Received message:', userMessage, '===');

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const sendEvent = (type: string, data: any) => {
            controller.enqueue(encoder.encode(`${type}:${JSON.stringify(data)}\n`));
          };
          
          // Step 1: Decide which tool to use
          sendEvent('status', { message: 'جاري تحليل الطلب...' });
          
          const decision = await generateObject({
            model: vertex('gemini-2.5-flash'),
            schema: ToolDecisionSchema,
            prompt: `You are an AI assistant that can either generate articles or chat with users.

Analyze this user message and decide what to do:
"${userMessage}"

Rules:
- If the user wants to create/generate/write an article, blog post, or detailed content about a topic → use "generate_article" and extract the topic
- If the user is asking questions, greeting, chatting, or anything else → use "chat" and provide a helpful response in Arabic

Examples:
- "اكتب مقال عن الذكاء الاصطناعي" → generate_article, topic: "الذكاء الاصطناعي"
- "Create an article about climate change" → generate_article, topic: "climate change"
- "مرحبا" → chat, response: "مرحباً! كيف يمكنني مساعدتك اليوم؟"
- "ما هو الذكاء الاصطناعي؟" → chat, response: [answer the question]
- "اعمل مقال عن السياحة في مصر" → generate_article, topic: "السياحة في مصر"

Respond appropriately based on the user's intent.`,
          });
          
          console.log('Tool decision:', decision.object);
          
          if (decision.object.tool === 'chat') {
            // Chat response
            sendEvent('chat', { message: decision.object.response });
            sendEvent('done', { success: true });
            controller.close();
            return;
          }
          
          // Generate article
          const topic = decision.object.topic || userMessage;
          console.log('Generating article for topic:', topic);
          
          // Search
          sendEvent('status', { message: 'جاري البحث عن المعلومات...' });
          const searchResults = await searchWeb(topic);
          sendEvent('status', { message: 'تم البحث! جاري إنشاء المقال...' });
          
          // Generate article structure
          const article = await generateArticlePoints(topic, searchResults);
          sendEvent('status', { message: 'تم إنشاء المقال! جاري توليد الصور...' });
          sendEvent('article', article);
          
          // Generate images
          const pointsWithImages = article.points.filter(p => p.shouldHaveImage);
          const imagesToGenerate = pointsWithImages.slice(0, 3);
          
          for (let i = 0; i < imagesToGenerate.length; i++) {
            const point = imagesToGenerate[i];
            const pointIndex = article.points.findIndex(p => p.heading === point.heading);
            
            sendEvent('status', { message: `جاري توليد صورة ${i + 1} من ${imagesToGenerate.length}...` });
            
            if (i > 0) await delay(3000);
            
            const imageData = await generateImage(point.imagePrompt);
            
            if (imageData) {
              sendEvent('image', { pointIndex, imageData, heading: point.heading });
            }
          }
          
          sendEvent('status', { message: 'تم الانتهاء!' });
          sendEvent('done', { success: true });
          controller.close();
          
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode(`error:${JSON.stringify({ message: 'حدث خطأ' })}\n`));
          controller.close();
        }
      },
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
