import { z } from 'zod';

/**
 * Schema for a single article point/section
 */
export const ArticlePointSchema = z.object({
  heading: z.string().describe('عنوان النقطة'),
  content: z.string().describe('محتوى النقطة'),
  imagePrompt: z.string().describe('وصف الصورة بالإنجليزية لتوليدها'),
  shouldHaveImage: z.boolean().describe('هل تحتاج هذه النقطة صورة'),
});

/**
 * Schema for a complete article
 */
export const ArticleSchema = z.object({
  title: z.string().describe('عنوان المقال'),
  introduction: z.string().describe('مقدمة المقال'),
  points: z.array(ArticlePointSchema).length(4).describe('نقاط المقال - يجب أن تكون 4 نقاط بالضبط'),
  conclusion: z.string().describe('خاتمة المقال'),
});

// TypeScript types derived from schemas
export type ArticlePoint = z.infer<typeof ArticlePointSchema>;
export type Article = z.infer<typeof ArticleSchema>;
