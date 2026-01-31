import type { SendEventFn } from '../types';
import { createSearchWebTool } from './search-web';
import { createGenerateArticleTool } from './generate-article';
import { createGenerateImageTool } from './generate-image';

// Re-export schemas and types
export * from './search-web';
export * from './generate-article';
export * from './generate-image';

/**
 * Creates all agent tools with the provided event sender
 * @param sendEvent - Function to send events to the client
 * @returns Object containing all configured tools
 */
export function createAgentTools(sendEvent: SendEventFn) {
  return {
    search_web: createSearchWebTool(sendEvent),
    generate_article: createGenerateArticleTool(sendEvent),
    generate_image: createGenerateImageTool(sendEvent),
  };
}

export type AgentTools = ReturnType<typeof createAgentTools>;
