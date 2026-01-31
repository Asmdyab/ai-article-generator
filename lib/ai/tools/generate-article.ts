import { tool, generateText, Output } from 'ai';
import { z } from 'zod';
import { vertex, MODELS } from '../providers/vertex';
import { ArticleSchema, type Article } from '../schemas/article';
import type { SendEventFn } from '../types';

// ==================== INPUT SCHEMA ====================
export const GenerateArticleInputSchema = z.object({
  topic: z.string().describe('The article topic to write about'),
  searchResults: z.string().describe('Search results to base the article on'),
});

export type GenerateArticleInput = z.infer<typeof GenerateArticleInputSchema>;

// ==================== OUTPUT SCHEMA ====================
const PointNeedingImageSchema = z.object({
  index: z.number(),
  heading: z.string(),
  imagePrompt: z.string(),
  shouldHaveImage: z.boolean(),
});

export const GenerateArticleOutputSchema = z.object({
  success: z.boolean().describe('Whether the article was generated successfully'),
  title: z.string().optional().describe('The article title'),
  pointsCount: z.number().optional().describe('Number of points in the article'),
  pointsNeedingImages: z.array(PointNeedingImageSchema).optional()
    .describe('Points that need images to be generated'),
  message: z.string().optional().describe('Error message if generation failed'),
});

export type GenerateArticleOutput = z.infer<typeof GenerateArticleOutputSchema>;

// ==================== TOOL FACTORY ====================
/**
 * Creates a generate_article tool instance
 * @param sendEvent - Function to send events to the client
 * @returns The configured tool
 */
export function createGenerateArticleTool(sendEvent: SendEventFn) {
  return tool({
    description: 'Generate a structured article in Arabic. Use AFTER searching for information.',
    inputSchema: GenerateArticleInputSchema,
    execute: async ({ topic, searchResults }): Promise<GenerateArticleOutput> => {
      console.log('📝 Agent generating article for:', topic);
      sendEvent('status', { message: 'جاري كتابة المقال...' });

      try {
        // Use generateText with Output.object (AI SDK 6 recommended pattern)
        const result = await generateText({
          model: vertex(MODELS.CHAT),
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

        const article = result.output as Article | null;

        if (!article) {
          return {
            success: false,
            message: 'Failed to generate article',
          };
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
            .map((p, i) => ({
              index: i,
              heading: p.heading,
              imagePrompt: p.imagePrompt,
              shouldHaveImage: p.shouldHaveImage,
            }))
            .filter((p) => p.shouldHaveImage),
        };
      } catch (error) {
        console.error('Article generation error:', error);
        return {
          success: false,
          message: 'Failed to generate article',
        };
      }
    },
  });
}
