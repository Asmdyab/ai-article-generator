import { createArticleAgent, type SendEventFn } from '@/lib/ai/agent';

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
          
          // Create the agent with tools
          const agent = createArticleAgent(sendEvent);
          
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
