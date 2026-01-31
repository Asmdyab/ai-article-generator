import { ToolLoopAgent, stepCountIs } from 'ai';
import { vertex, MODELS } from './providers/vertex';
import { createAgentTools } from './tools';
import type { SendEventFn } from './types';

// ==================== AGENT INSTRUCTIONS ====================
export const AGENT_INSTRUCTIONS = `You are an AI assistant that helps users create articles in Arabic.

You have these tools:
1. search_web - Search the internet for information
2. generate_article - Create a structured article (returns points that need images)
3. generate_image - Generate an image for a specific article point

When user asks to create an article:
1. Use search_web to find information about the topic
2. Use generate_article to write the article based on search results
3. Check the result for pointsNeedingImages and use generate_image for EACH point that needs an image

IMPORTANT: After creating an article, DO NOT repeat or summarize the article content in your response.
Just say a short confirmation like "تم إنشاء المقال بنجاح! يمكنك مشاهدته على اليمين."
NEVER include the article text, points, or any content from the article in your chat response.

For chat/greetings, respond directly without tools.
Always respond in Arabic.`;

// ==================== AGENT CONFIGURATION ====================
export const AGENT_CONFIG = {
  maxSteps: 10,
} as const;

// ==================== AGENT FACTORY ====================
/**
 * Creates a configured ToolLoopAgent instance
 * @param sendEvent - Function to send events to the client
 * @returns Configured ToolLoopAgent
 */
export function createArticleAgent(sendEvent: SendEventFn) {
  const tools = createAgentTools(sendEvent);

  return new ToolLoopAgent({
    model: vertex(MODELS.CHAT),
    instructions: AGENT_INSTRUCTIONS,
    tools,
    stopWhen: stepCountIs(AGENT_CONFIG.maxSteps),
  });
}

// Re-export types
export type { SendEventFn } from './types';
