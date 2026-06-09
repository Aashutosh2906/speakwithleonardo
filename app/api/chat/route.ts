import { NextRequest } from 'next/server';
import { buildSystemPrompt } from '@/lib/system-prompt';
import { retrieveRelevantChunks } from '@/lib/retrieval';

export const runtime = 'edge';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  const { messages, sessionId } = await req.json() as {
    messages: Message[];
    sessionId: string;
  };

  const userMessage = messages[messages.length - 1]?.content ?? '';

  // RAG retrieval
  const relevantChunks = await retrieveRelevantChunks(userMessage, 5);

  // Build layered system prompt
  const systemPrompt = buildSystemPrompt(relevantChunks);

  // Call Groq
  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.85,
      max_tokens: 400,
      stream: true,
    }),
  });

  if (!groqRes.ok) {
    return new Response('Model unavailable. Please try again.', { status: 502 });
  }

  // Stream the response back
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = groqRes.body!.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            // Fire analytics log async (non-blocking)
            fetch('/api/log', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId,
                question: userMessage,
                response: fullResponse,
              }),
            }).catch(() => {});

            controller.close();
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content ?? '';
            if (token) {
              fullResponse += token;
              controller.enqueue(encoder.encode(token));
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Accel-Buffering': 'no',
    },
  });
}
