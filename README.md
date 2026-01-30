# AI Article Generator 🤖

مولد مقالات ذكي يستخدم تقنيات الذكاء الاصطناعي لكتابة مقالات احترافية باللغة العربية.

An intelligent article generator that uses AI to write professional articles in Arabic.

## Screenshot

![AI Article Generator](./public/images/screenshot.png)

## Tech Stack (AI SDK)

- **AI SDK v6** (`ai@6.0.48`)
- **Google Vertex AI** via `@ai-sdk/google-vertex`
- **Gemini 2.5 Flash** للنصوص
- **Imagen 3** للصور (مكالمة REST مباشرة عبر GoogleAuth)
- **Exa** للبحث على الإنترنت

## Environment Variables

Create `.env.local` in the project root:

```env
EXA_API_KEY=your_exa_api_key
GOOGLE_VERTEX_PROJECT=your_project_id
GOOGLE_VERTEX_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=path_to_credentials.json
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## How the Agent Works (Quick)

- Frontend (`app/page.tsx`) sends the user prompt to `POST /api/agent`.
- The Agent (`app/api/agent/route.ts`) uses **ToolLoopAgent** with 3 tools:
  1. `search_web` → Exa search
  2. `generate_article` → `generateText` + `Output.object` (structured output)
  3. `generate_image` → Imagen 3 REST call
- The API streams events to the UI:
  - `status`, `chat`, `article`, `image`, `done`, `error`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
