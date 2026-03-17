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

## Environment variables for a future provider
You can later wire in a real provider using variables like:

```bash
BG_REMOVAL_PROVIDER=removebg
BG_REMOVAL_API_KEY=your_real_api_key
```

The current implementation intentionally throws a clear error if these are set but no real provider adapter has been implemented yet.

## Suggested next step
Add a provider adapter inside:
- `src/lib/background-removal.ts`

That file already contains:
- file type and size validation
- mock provider fallback
- a single `removeBackground(file)` entry point for future replacement

## Notes
- API keys stay server-side only.
- This MVP is designed for quick validation, not final production scale.
- If you connect object storage later, use short-lived retention and signed URLs.
