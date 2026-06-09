/**
 * Reads all .txt files from data/corpus/, splits them into ~200-token chunks,
 * and writes data/chunks.json.
 *
 * Run once: node scripts/chunk-corpus.js
 */

const fs = require('fs');
const path = require('path');

const CORPUS_DIR = path.join(__dirname, '../data/corpus');
const OUTPUT_FILE = path.join(__dirname, '../data/chunks.json');

// Approximate tokens by splitting on whitespace (1 token ≈ 0.75 words)
const CHUNK_SIZE_WORDS = 150;
const CHUNK_OVERLAP_WORDS = 30;

function chunkText(text, source) {
  // Split into paragraphs first, then into word chunks
  const paragraphs = text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 30 && !p.startsWith('#') && !p.startsWith('==='));

  const chunks = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/);

    if (words.length <= CHUNK_SIZE_WORDS) {
      chunks.push({ text: paragraph, source });
      continue;
    }

    // Sliding window for long paragraphs
    let start = 0;
    while (start < words.length) {
      const end = Math.min(start + CHUNK_SIZE_WORDS, words.length);
      const chunk = words.slice(start, end).join(' ');
      if (chunk.length > 50) {
        chunks.push({ text: chunk, source });
      }
      start += CHUNK_SIZE_WORDS - CHUNK_OVERLAP_WORDS;
    }
  }

  return chunks;
}

function main() {
  const files = fs.readdirSync(CORPUS_DIR).filter(f => f.endsWith('.txt'));
  const allChunks = [];

  for (const file of files) {
    const filePath = path.join(CORPUS_DIR, file);
    const text = fs.readFileSync(filePath, 'utf-8');
    const source = file.replace('.txt', '');
    const chunks = chunkText(text, source);
    allChunks.push(...chunks);
    console.log(`${file}: ${chunks.length} chunks`);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allChunks, null, 2), 'utf-8');
  console.log(`\nTotal: ${allChunks.length} chunks → data/chunks.json`);
}

main();
