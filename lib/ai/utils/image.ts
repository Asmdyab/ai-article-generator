import { generateImage } from 'ai';
import type { GoogleVertexImageProviderOptions } from '@ai-sdk/google-vertex';
import { vertex, MODELS } from '../providers/vertex';

// Helper: delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MAX_RETRIES = 3;
const BASE_DELAY = 5000;

/**
 * Generate an image using Vertex AI Imagen
 * @param prompt - Image description in English
 * @param retryCount - Current retry attempt (internal)
 * @returns Base64 data URL of the generated image, or null on failure
 */
export async function generateImageFromPrompt(
  prompt: string,
  retryCount = 0
): Promise<string | null> {
  try {
    const { image } = await generateImage({
      model: vertex.image(MODELS.IMAGE),
      prompt: prompt.slice(0, 200),
      aspectRatio: '16:9',
      providerOptions: {
        vertex: {
          safetySetting: 'block_only_high',
          personGeneration: 'allow_adult',
        } satisfies GoogleVertexImageProviderOptions,
      },
    });

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
      console.log(`⏳ Rate limited, retrying in ${waitTime}ms...`);
      await delay(waitTime);
      return generateImageFromPrompt(prompt, retryCount + 1);
    }

    console.error('Image generation error:', error);
    return null;
  }
}
