import indexData from '@/data/embeddings.json';

interface IndexedChunk {
  text: string;
  source: string;
  tfidf: Record<string, number>;
}

const corpus = indexData as unknown as IndexedChunk[];

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

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

export async function retrieveRelevantChunks(
  query: string,
  topK = 5
): Promise<string[]> {
  if (corpus.length === 0) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  // Score each chunk: sum of TF-IDF weights for query terms
  const scored = corpus.map(chunk => {
    let score = 0;
    for (const token of queryTokens) {
      score += chunk.tfidf[token] ?? 0;
    }
    return { text: chunk.text, source: chunk.source, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Return top K that have any match
  return scored
    .filter(c => c.score > 0)
    .slice(0, topK)
    .map(c => `[${c.source}] ${c.text}`);
}
