# Pagar's Art Lab

Browser-based graffiti sketching and AI tag-enhancement tool. Draw or upload a tag, choose a graffiti style and export the result as PNG.

![Pagar's Art Lab screenshot](assets/screenshot.svg)

## Features

- Canvas drawing with multiple marker styles, colors and backgrounds
- Upload an existing sketch or photo
- AI enhancement with style, fidelity and influence controls
- Preview, re-enhance and PNG export
- Responsive interface for desktop and mobile

## Gemini API key (BYOK)

AI enhancement uses a Gemini API key supplied by the user. The key is stored only in the browser's localStorage and sent with each enhancement request. This repository does not contain or provide a shared Gemini API key, and there is no server-side fallback key.

Create a key at https://aistudio.google.com/apikey and add it through the app's Settings panel. Do not commit personal API keys.

## Local development

```bash
bun install
bun run dev
```

A recent Node.js version can be used with npm if preferred.

## Environment files

Local environment files are ignored. Copy `.env.example` to `.env` only if your deployment requires the optional Supabase integration. The core sketching and Gemini BYOK flow do not require a repository-level Gemini secret.

## Tech stack

React, TypeScript, TanStack Start, Tailwind CSS, Cloudflare Workers and Gemini.
