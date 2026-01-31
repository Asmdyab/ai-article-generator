import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';
import type { SendEventFn } from '../types';

// ==================== INPUT SCHEMA ====================
export const SearchWebInputSchema = z.object({
  query: z.string().describe('The search query to find information about'),
});

export type SearchWebInput = z.infer<typeof SearchWebInputSchema>;

// ==================== OUTPUT SCHEMA ====================
export const SearchWebOutputSchema = z.object({
  success: z.boolean().describe('Whether the search was successful'),
  results: z.string().describe('The search results as formatted text'),
  count: z.number().describe('Number of results found'),
});

export type SearchWebOutput = z.infer<typeof SearchWebOutputSchema>;

// ==================== TOOL FACTORY ====================
/**
 * Creates a search_web tool instance
 * @param sendEvent - Function to send events to the client
 * @returns The configured tool
 */
export function createSearchWebTool(sendEvent: SendEventFn) {
  const exa = new Exa(process.env.EXA_API_KEY);

  return tool({
    description: 'Search the web for information about a topic. Use this to gather information before writing an article.',
    inputSchema: SearchWebInputSchema,
    execute: async ({ query }): Promise<SearchWebOutput> => {
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
        return {
          success: false,
          results: 'Search unavailable',
          count: 0,
        };
      }
    },
  });
}
