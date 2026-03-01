# Brain Dump → Slides

Paste or speak your unstructured thoughts and get a structured presentation with AI-generated slides and images.

## What it does

- Takes messy notes or a brain dump as input
- Organizes them into a 6–10 slide presentation
- Generates a visual image for each slide
- Exports to PPTX or Word (with speaker script)
- Saves presentation history locally in your browser

## Tech

- React + TypeScript + Vite
- Google Gemini API (text and image generation)
- Deployed on Vercel (serverless API routes keep the API key secure)

## Running locally

1. Install dependencies: `npm install`
2. Add your API key to `.env.local`: `GEMINI_API_KEY=your_key_here`
3. Run with Vercel dev (required for API routes): `vercel dev`

## Deployment

Push to GitHub and import the repo into Vercel. Add `GEMINI_API_KEY` in the Vercel project environment variable settings. No other configuration needed.
