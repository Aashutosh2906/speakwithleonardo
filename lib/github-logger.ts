interface LogEntry {
  timestamp: string;
  session_id: string;
  question: string;
  response_excerpt: string;
}

export async function logQuery(entry: LogEntry): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return;

  const now = new Date(entry.timestamp);
  const datePath = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const timePart = now.toISOString().slice(11, 19).replace(/:/g, '-'); // HH-MM-SS
  const random = Math.random().toString(36).slice(2, 6);
  const filePath = `analytics/${datePath}/${timePart}-${random}.json`;

  const content = Buffer.from(JSON.stringify(entry, null, 2)).toString('base64');

  try {
    await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
      },
      body: JSON.stringify({
        message: `analytics: visitor query ${timePart}`,
        content,
      }),
    });
  } catch {
    // Logging is best-effort — never block the response
  }
}
