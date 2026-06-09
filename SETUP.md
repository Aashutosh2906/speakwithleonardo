# Setup Guide — DVNC.AI Leonardo Chatbot

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in your keys:

```
GROQ_API_KEY=       # from console.groq.com (free)
HF_API_KEY=         # from huggingface.co/settings/tokens (free)
GITHUB_TOKEN=       # GitHub PAT with 'repo' scope (for analytics logging)
GITHUB_REPO=        # e.g. aashutosh2906/speakwithleonardo
```

## 3. Build the corpus (run once)

**Step A — Chunk the text files:**
```bash
node scripts/chunk-corpus.js
```
This reads `data/corpus/*.txt` and writes `data/chunks.json`.

**Step B — Embed the chunks:**
```bash
HF_API_KEY=your_key node scripts/embed-corpus.js
```
This calls HuggingFace (free) to embed each chunk and writes `data/embeddings.json`.
Takes ~2-5 minutes depending on corpus size.

**Commit both JSON files to the repo** — they are static assets loaded by Vercel.

## 4. Run locally

```bash
npm run dev
```
Open http://localhost:3000 — designed for iPad landscape (1024×768 or 1366×1024).

## 5. Deploy to Vercel

1. Push the repo to GitHub
2. Import the repo in Vercel dashboard
3. Set the same 4 environment variables in Vercel → Settings → Environment Variables
4. Deploy

## 6. Add corpus content

To add more text to the knowledge base:
1. Add/edit files in `data/corpus/`
2. Re-run `node scripts/chunk-corpus.js`
3. Re-run `node scripts/embed-corpus.js`
4. Commit both updated JSON files
5. Redeploy (or Vercel auto-deploys on push)

## 7. View analytics

Analytics are stored as JSON files in the `analytics/` folder of this GitHub repo.
Each visitor query creates one file: `analytics/YYYY-MM-DD/HH-MM-SS-xxxx.json`

Browse them on GitHub or download a day's folder for analysis.

## 8. iPad kiosk mode

On the iPad:
- Open Safari, navigate to your Vercel URL
- Tap Share → Add to Home Screen
- Open from Home Screen (runs in full-screen mode)
- Enable Guided Access: Settings → Accessibility → Guided Access → turn on
- Triple-click the side button while in the app to lock it to that app
