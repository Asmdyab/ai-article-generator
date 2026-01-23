import { createVertex } from '@ai-sdk/google-vertex';
import { generateText } from 'ai';

// Create Vertex AI provider instance for image generation
const vertex = createVertex({
  project: process.env.GOOGLE_VERTEX_PROJECT || 'asem-pro',
  location: process.env.GOOGLE_VERTEX_LOCATION || 'us-central1',
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    console.log('Generating image for prompt:', prompt);

    // Use nano-banana model (gemini-2.5-flash-image) for image generation
    const result = await generateText({
      model: vertex('gemini-2.5-flash-image'),
      providerOptions: {
        google: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      },
      prompt: `Generate an image: ${prompt}. Please create a high-quality, visually appealing image.`,
    });

    // Extract image from response
    const images: string[] = [];
    
    // Check for files in the response (images are returned as files)
    if (result.files && result.files.length > 0) {
      for (const file of result.files) {
        if (file.mediaType?.startsWith('image/')) {
          // Convert base64 to data URL
          const dataUrl = `data:${file.mediaType};base64,${file.base64}`;
          images.push(dataUrl);
        }
      }
    }

    if (images.length === 0) {
      throw new Error('No image generated');
    }

    return Response.json({ 
      success: true,
      imageUrl: images[0],
      text: result.text,
    });
  } catch (error) {
    console.error('Error generating image:', error);
    return Response.json(
      { error: 'Failed to generate image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
