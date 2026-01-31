import { createVertex } from '@ai-sdk/google-vertex';

// Validate required environment variables
function validateEnv() {
  const missing: string[] = [];
  if (!process.env.GOOGLE_VERTEX_PROJECT) missing.push('GOOGLE_VERTEX_PROJECT');
  if (!process.env.EXA_API_KEY) missing.push('EXA_API_KEY');
  if (missing.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}`);
  }
}
validateEnv();

// Create Vertex AI provider instance
export const vertex = createVertex({
  project: process.env.GOOGLE_VERTEX_PROJECT || 'asem-pro',
  location: process.env.GOOGLE_VERTEX_LOCATION || 'us-central1',
});

// Model constants
export const MODELS = {
  CHAT: 'gemini-2.5-flash',
  IMAGE: 'imagen-3.0-generate-001',
} as const;
