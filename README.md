# Image Background Remover

A polished MVP built with **Next.js**, **Tailwind CSS**, and **TypeScript**.

## What this MVP includes
- Homepage with hero section, upload flow, original/result previews, download button, how-it-works, FAQ, and footer
- `/privacy` and `/terms` pages
- `POST /api/remove-background` API route
- File validation for JPG / JPEG / PNG / WebP up to 10MB
- Mock fallback provider so the project runs locally without a real background-removal API key
- SEO basics: metadata, sitemap, and robots

## Local development
```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build check
```bash
npm run build
```

## How the current API works
The API route accepts a multipart upload with a `file` field.

If no real provider is configured, the app runs in **mock mode** and returns the original image as the result. This keeps the full UX and API testable during MVP development.

## Environment variables for a real provider
To enable remove.bg, create a `.env.local` file with:

```bash
BG_REMOVAL_PROVIDER=removebg
BG_REMOVAL_API_KEY=your_remove_bg_api_key
```

If these variables are missing, the app stays in **mock mode** and returns the original image so the full flow remains testable.

## Current provider support
Implemented in `src/lib/background-removal.ts`:
- file type and size validation
- mock provider fallback
- remove.bg integration via `https://api.remove.bg/v1.0/removebg`
- a single `removeBackground(file)` entry point for future provider extensions

## Notes
- API keys stay server-side only.
- This MVP is designed for quick validation, not final production scale.
- If you connect object storage later, use short-lived retention and signed URLs.
