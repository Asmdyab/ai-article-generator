import { tool } from 'ai';
import { z } from 'zod';
import { generateImageFromPrompt } from '../utils/image';
import type { SendEventFn } from '../types';

// ==================== INPUT SCHEMA ====================
export const GenerateImageInputSchema = z.object({
  prompt: z.string().describe('Image description in English'),
  pointIndex: z.number().describe('Index of the article point (0-3)'),
  heading: z.string().describe('Heading of the point for display purposes'),
});

export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

// ==================== OUTPUT SCHEMA ====================
export const GenerateImageOutputSchema = z.object({
  success: z.boolean().describe('Whether the image was generated successfully'),
  message: z.string().describe('Status message'),
  pointIndex: z.number().describe('Index of the article point'),
});

export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

// ==================== TOOL FACTORY ====================
/**
 * Creates a generate_image tool instance
 * @param sendEvent - Function to send events to the client
 * @returns The configured tool
 */
export function createGenerateImageTool(sendEvent: SendEventFn) {
  return tool({
    description: 'Generate an image for an article point. Call this for each point that needs an image.',
    inputSchema: GenerateImageInputSchema,
    execute: async ({ prompt, pointIndex, heading }): Promise<GenerateImageOutput> => {
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
  });
}
