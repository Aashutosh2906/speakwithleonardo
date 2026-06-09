/**
 * Builds a TF-IDF index from data/chunks.json.
 * No network required — pure Node.js.
 * Run: node scripts/embed-corpus.js
 */

const fs = require('fs');
const path = require('path');

const CHUNKS_FILE = path.join(__dirname, '../data/chunks.json');
const OUTPUT_FILE = path.join(__dirname, '../data/embeddings.json');

// Stop words to ignore
const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'by','from','is','it','its','be','was','are','were','been','has','have',
  'had','do','does','did','will','would','could','should','may','might',
  'this','that','these','those','i','he','she','we','they','you','not',
  'as','so','if','then','than','when','which','who','what','where','how',
  'all','any','both','each','more','most','other','some','such','no',
  'nor','only','own','same','too','very','just','into','through','during',
  'before','after','above','below','between','up','down','out','over',
  'under','again','there','here','once','his','her','our','their','my',
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

function buildTfIdf(chunks) {
  // Compute term frequencies per chunk
  const tokenizedChunks = chunks.map(c => tokenize(c.text));

  // Compute document frequencies
  const df = {};
  for (const tokens of tokenizedChunks) {
    const unique = new Set(tokens);
    for (const t of unique) {
      df[t] = (df[t] || 0) + 1;
    }
  }

  const N = chunks.length;
  const results = [];

  for (let i = 0; i < chunks.length; i++) {
    const tokens = tokenizedChunks[i];
    const tf = {};
    for (const t of tokens) {
      tf[t] = (tf[t] || 0) + 1;
    }

    // Store normalised TF-IDF weights for top terms only (keep file small)
    const tfidf = {};
    for (const [term, freq] of Object.entries(tf)) {
      const idf = Math.log(N / (df[term] + 1));
      tfidf[term] = (freq / tokens.length) * idf;
    }

    results.push({
      text: chunks[i].text,
      source: chunks[i].source,
      tfidf,
    });
  }

  return results;
}

function main() {
  const chunks = JSON.parse(fs.readFileSync(CHUNKS_FILE, 'utf-8'));
  console.log(`Building TF-IDF index for ${chunks.length} chunks...`);

  const index = buildTfIdf(chunks);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index), 'utf-8');
  const sizeMB = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2);
  console.log(`Done. ${index.length} chunks indexed → data/embeddings.json (${sizeMB} MB)`);
}

main();
