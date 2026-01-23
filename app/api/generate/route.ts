import { createVertex } from '@ai-sdk/google-vertex';
import { streamText, tool, stepCountIs, generateText } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';

const exa = new Exa(process.env.EXA_API_KEY);

// Create Vertex AI provider instance
const vertex = createVertex({
  project: process.env.GOOGLE_VERTEX_PROJECT || 'asem-pro',
  location: process.env.GOOGLE_VERTEX_LOCATION || 'us-central1',
});

// Exa search tool
const searchTool = tool({
  description: 'Search the web for current information about a topic using Exa',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
  }),
  execute: async ({ query }) => {
    try {
      console.log('Searching Exa for:', query);
      const results = await exa.searchAndContents(query, {
        numResults: 5,
        text: true,
      });
      
      const searchResults = results.results
        .map((r: any) => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.text?.substring(0, 500)}...`)
        .join('\n\n');
      
      return searchResults || 'No results found';
    } catch (error) {
      console.error('Exa search error:', error);
      return 'Search temporarily unavailable';
    }
  },
});

// Image generation tool using nano-banana model  
// Uses toModelOutput to send short confirmation to model while streaming full image to client
const generateImageTool = tool({
  description: 'Generate an image using AI. Use this ONLY ONCE for the main article illustration.',
  inputSchema: z.object({
    prompt: z.string().describe('Brief image description (max 30 words)'),
    label: z.string().describe('Short image label'),
  }),
  execute: async ({ prompt, label }) => {
    try {
      console.log('Generating image for:', label);
      
      const result = await generateText({
        model: vertex('gemini-2.0-flash-exp'),
        providerOptions: {
          google: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        },
        prompt: `Generate an image: ${prompt.slice(0, 100)}`,
      });

      console.log('Image generation result - files count:', result.files?.length || 0);
      
      if (result.files && result.files.length > 0) {
        for (const file of result.files) {
          console.log('File found:', file.mediaType);
          if (file.mediaType?.startsWith('image/')) {
            const dataUrl = `data:${file.mediaType};base64,${file.base64}`;
            console.log('Image generated successfully, size:', dataUrl.length);
            return { imageData: dataUrl, label, success: true };
          }
        }
      }
      
      console.log('No image files found in result');
      return { imageData: '', label, success: false };
    } catch (error) {
      console.error('Image generation error:', error);
      return { imageData: '', label, success: false };
    }
  },
  // CRITICAL: Only send short text to model to avoid 1M+ token overflow
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toModelOutput: ({ output }: any) => {
    if (output?.success) {
      return { type: 'text' as const, value: `[IMAGE_GENERATED:${output.label}] Image created successfully.` };
    }
    return { type: 'text' as const, value: `[IMAGE_FAILED] Continue without image.` };
  },
});

export async function POST(req: Request) {
  try {
    const { topic } = await req.json();

    console.log('Generating article for topic:', topic);

    const result = streamText({
      model: vertex('gemini-2.5-flash'),
      messages: [
        {
          role: 'system',
          content: `You are an expert article writer with access to web search and image generation tools.

Your workflow:
1. First, use the search tool to find current information about the topic
2. Write a comprehensive article based on the search results
3. Use the generateImage tool to create 1-2 relevant illustrations for key sections

Article requirements:
- Clear introduction and conclusion
- Multiple detailed sections with ## headings
- Markdown formatting
- Include recent data and developments from search results
- At least 500 words
- Include generated images where appropriate by using the generateImage tool`,
        },
        {
          role: 'user',
          content: `Research and write a comprehensive article about: ${topic}. Use the search tool to find current information, then write the article with generated images for key sections.`,
        },
      ],
      tools: {
        search: searchTool,
        generateImage: generateImageTool,
      },
      stopWhen: stepCountIs(10),
    });

    // Create custom stream that includes both text and tool results
    const stream = result.fullStream;
    
    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            // Send text deltas
            if (chunk.type === 'text-delta') {
              const text = (chunk as any).text || '';
              if (text) {
                // Escape special characters for JSON
                const escapedText = text
                  .replace(/\\/g, '\\\\')
                  .replace(/"/g, '\\"')
                  .replace(/\n/g, '\\n')
                  .replace(/\r/g, '\\r');
                controller.enqueue(encoder.encode(`0:"${escapedText}"\n`));
              }
            }
            // Send tool results (including images)
            else if (chunk.type === 'tool-result') {
              const chunkData = chunk as any;
              // The actual result is in 'output' not 'result'
              const output = chunkData.output || chunkData.result;
              console.log('Tool result received:', chunkData.toolName, 'success:', output?.success);
              
              // Only send image tool results to frontend
              if (chunkData.toolName === 'generateImage' && output?.imageData) {
                console.log('Sending image to frontend, size:', output.imageData.length);
                const toolResult = JSON.stringify([{
                  toolCallId: chunkData.toolCallId,
                  toolName: chunkData.toolName,
                  result: output
                }]);
                controller.enqueue(encoder.encode(`a:${toolResult}\n`));
              }
            }
          }
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error generating article:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate article' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
