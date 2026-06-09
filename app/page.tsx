'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function generateSessionId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function LeonardoChat() {
  const [view, setView] = useState<'welcome' | 'chat'>('welcome');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId] = useState(generateSessionId);
  const [idleTimer, setIdleTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamingRef = useRef('');

  const IDLE_TIMEOUT_MS = 90_000;

  const resetIdleTimer = useCallback(() => {
    if (idleTimer) clearTimeout(idleTimer);
    if (view === 'chat') {
      const t = setTimeout(() => {
        setView('welcome');
        setMessages([]);
        setInput('');
      }, IDLE_TIMEOUT_MS);
      setIdleTimer(t);
    }
  }, [idleTimer, view]);

  useEffect(() => {
    resetIdleTimer();
    return () => { if (idleTimer) clearTimeout(idleTimer); };
  }, [view]); // eslint-disable-line

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isStreaming) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);
    streamingRef.current = '';

    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, sessionId }),
      });

      if (!res.body) throw new Error('No stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        streamingRef.current += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: streamingRef.current,
          };
          return updated;
        });
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'I find myself momentarily at a loss for words. Shall we try again?',
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      resetIdleTimer();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function startConversation() {
    setView('chat');
    setMessages([]);
    setTimeout(() => inputRef.current?.focus(), 300);
  }

  return (
    <main style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* WELCOME SCREEN */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
          opacity: view === 'welcome' ? 1 : 0,
          pointerEvents: view === 'welcome' ? 'all' : 'none',
          transition: 'opacity 0.6s var(--transition)',
          padding: '40px 60px',
          zIndex: 10,
        }}
      >
        <WelcomeScreen onStart={startConversation} />
      </div>

      {/* CHAT SCREEN */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          opacity: view === 'chat' ? 1 : 0,
          pointerEvents: view === 'chat' ? 'all' : 'none',
          transition: 'opacity 0.6s var(--transition)',
        }}
        onPointerMove={resetIdleTimer}
        onPointerDown={resetIdleTimer}
      >
        <ChatScreen
          messages={messages}
          input={input}
          setInput={setInput}
          isStreaming={isStreaming}
          onSend={sendMessage}
          onKeyDown={handleKeyDown}
          inputRef={inputRef}
          messagesEndRef={messagesEndRef}
          onReset={() => { setView('welcome'); setMessages([]); setInput(''); }}
        />
      </div>
    </main>
  );
}

/* ─── WELCOME SCREEN ─────────────────────────────────────────────────────── */

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 700, width: '100%' }}>
      {/* Pulsating orb */}
      <div style={{ position: 'relative', marginBottom: 36 }}>
        <style>{`
          @keyframes heartbeat {
            0%,100% { transform: scale(1); box-shadow: 0 0 20px rgba(212,175,55,0.3); }
            14% { transform: scale(1.06); box-shadow: 0 0 32px rgba(212,175,55,0.5); }
            28% { transform: scale(1); box-shadow: 0 0 20px rgba(212,175,55,0.3); }
            42% { transform: scale(1.1); box-shadow: 0 0 40px rgba(212,175,55,0.6); }
            70% { transform: scale(1); box-shadow: 0 0 20px rgba(212,175,55,0.3); }
          }
          @keyframes ripple {
            0% { transform: translate(-50%,-50%) scale(1); opacity: 0.5; }
            100% { transform: translate(-50%,-50%) scale(2.4); opacity: 0; }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse-slow {
            0%,100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
        `}</style>
        <div style={{
          width: 64, height: 64,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #B8960F, #D4AF37)',
          animation: 'heartbeat 2.5s ease-in-out infinite',
          position: 'relative',
          zIndex: 2,
        }} />
        {[0, 0.5, 1].map(delay => (
          <div key={delay} style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 64, height: 64,
            borderRadius: '50%',
            border: '1px solid rgba(212,175,55,0.3)',
            animation: `ripple 2.5s ease-out ${delay}s infinite`,
            zIndex: 1,
          }} />
        ))}
      </div>

      {/* Brand name */}
      <div style={{
        fontSize: 52, fontWeight: 100, letterSpacing: 18,
        color: 'var(--text-primary)',
        marginBottom: 8,
        animation: 'fadeUp 1s ease forwards',
      }}>
        DVNC
      </div>

      {/* Gold divider */}
      <div style={{
        width: 80, height: 1,
        background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
        marginBottom: 20,
        animation: 'fadeUp 1s ease 0.2s both',
      }} />

      {/* Tagline */}
      <div style={{
        fontSize: 11, letterSpacing: 3, textTransform: 'uppercase',
        color: 'var(--text-secondary)',
        marginBottom: 56,
        animation: 'fadeUp 1s ease 0.3s both',
      }}>
        Leonardo's Intelligence Reimagined for the 21st Century
      </div>

      {/* Feature circles */}
      <div style={{
        display: 'flex', gap: 40, marginBottom: 48,
        animation: 'fadeUp 1s ease 0.5s both',
      }}>
        {[
          ['Geometry', 'Unity', 'Chaos'],
          ['Intuition', 'Dialectic', 'Wonder'],
        ].map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: 36, flexDirection: 'column', alignItems: 'center' }}>
            {row.map(label => (
              <FeatureNode key={label} label={label} />
            ))}
          </div>
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36, alignItems: 'center', justifyContent: 'center' }}>
          {['Steward', 'Perception', 'Unknown'].map(label => (
            <FeatureNode key={label} label={label} />
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36, alignItems: 'center', justifyContent: 'center' }}>
          {['Force', 'Nature'].map(label => (
            <FeatureNode key={label} label={label} />
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onStart}
        style={{
          padding: '18px 56px',
          background: 'linear-gradient(135deg, var(--accent-dark), var(--accent))',
          color: '#000',
          border: 'none',
          borderRadius: 40,
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: 1,
          cursor: 'pointer',
          transition: 'all 0.2s var(--transition)',
          animation: 'fadeUp 1s ease 0.7s both',
        }}
        onPointerEnter={e => {
          (e.target as HTMLElement).style.transform = 'translateY(-2px)';
          (e.target as HTMLElement).style.boxShadow = '0 8px 24px rgba(212,175,55,0.35)';
        }}
        onPointerLeave={e => {
          (e.target as HTMLElement).style.transform = '';
          (e.target as HTMLElement).style.boxShadow = '';
        }}
      >
        Begin Conversation
      </button>

      <div style={{
        marginTop: 20,
        fontSize: 11, color: 'var(--text-secondary)',
        letterSpacing: 1, textTransform: 'uppercase',
        animation: 'fadeUp 1s ease 0.9s both',
      }}>
        Touch to speak with Leonardo
      </div>
    </div>
  );
}

function FeatureNode({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: '1px solid var(--accent)',
        background: 'var(--bg)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
          background: 'linear-gradient(180deg, var(--accent), var(--accent-dark))',
          opacity: 0.65,
        }} />
      </div>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)', textAlign: 'center' }}>
        {label}
      </div>
    </div>
  );
}

/* ─── CHAT SCREEN ─────────────────────────────────────────────────────────── */

function ChatScreen({
  messages,
  input,
  setInput,
  isStreaming,
  onSend,
  onKeyDown,
  inputRef,
  messagesEndRef,
  onReset,
}: {
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  isStreaming: boolean;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onReset: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: 'var(--bg)' }}>

      {/* Header */}
      <div style={{
        height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--accent)',
            animation: 'pulse-slow 2s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-accent)' }}>
            DVNC.AI
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: 1 }}>
            Leonardo da Vinci
          </span>
        </div>
        <button
          onClick={onReset}
          style={{
            background: 'none', border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            borderRadius: 20, padding: '6px 16px',
            fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          New Visitor
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '32px 40px',
        display: 'flex', flexDirection: 'column', gap: 28,
        WebkitOverflowScrolling: 'touch',
      }}>
        {messages.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 12,
          }}>
            <div style={{ fontSize: 28, color: 'var(--accent)', opacity: 0.3 }}>✦</div>
            <div style={{ fontSize: 15, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 400, lineHeight: 1.6 }}>
              Ask me anything. About art, science, nature, life.<br />
              I have five centuries of thought to share.
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} isLatest={i === messages.length - 1 && isStreaming} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '16px 40px 28px',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 12,
          background: 'var(--surface)',
          borderRadius: 24,
          border: '1px solid var(--border)',
          padding: '12px 16px',
          transition: 'border-color 0.2s',
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask Leonardo anything…"
            rows={1}
            disabled={isStreaming}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 17,
              lineHeight: 1.5,
              resize: 'none',
              fontFamily: 'inherit',
              minHeight: 28,
              maxHeight: 120,
              overflowY: 'auto',
            }}
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || isStreaming}
            style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: (!input.trim() || isStreaming)
                ? 'var(--surface-2)'
                : 'linear-gradient(135deg, var(--accent-dark), var(--accent))',
              border: 'none', cursor: (!input.trim() || isStreaming) ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              fontSize: 18,
              color: (!input.trim() || isStreaming) ? 'var(--text-secondary)' : '#000',
            }}
          >
            {isStreaming ? <StreamingDots /> : '↑'}
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'rgba(153,153,153,0.4)', letterSpacing: 0.5 }}>
          Session auto-resets after 90 seconds of inactivity
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, isLatest }: { message: Message; isLatest: boolean }) {
  const isUser = message.role === 'user';
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      gap: 12,
      alignItems: 'flex-start',
      animation: 'fadeUp 0.3s ease',
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--accent-dark), var(--accent))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 600, color: '#000', letterSpacing: 0.5,
          marginTop: 2,
        }}>
          L
        </div>
      )}
      <div style={{
        maxWidth: '72%',
        padding: isUser ? '12px 18px' : '14px 20px',
        borderRadius: isUser ? '20px 20px 4px 20px' : '4px 20px 20px 20px',
        background: isUser ? 'var(--accent-dim)' : 'var(--surface)',
        border: `1px solid ${isUser ? 'rgba(212,175,55,0.2)' : 'var(--border)'}`,
        fontSize: 17,
        lineHeight: 1.65,
        color: isUser ? 'var(--text-primary)' : 'var(--text-primary)',
      }}>
        {message.content}
        {isLatest && !message.content && <StreamingDots />}
        {isLatest && message.content && (
          <span style={{
            display: 'inline-block', width: 2, height: 16,
            background: 'var(--accent)', marginLeft: 2, verticalAlign: 'middle',
            animation: 'pulse-slow 0.8s ease-in-out infinite',
          }} />
        )}
      </div>
    </div>
  );
}

function StreamingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center', padding: '0 2px' }}>
      <style>{`
        @keyframes dotPulse {
          0%,80%,100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      {[0, 0.15, 0.3].map(delay => (
        <span key={delay} style={{
          width: 5, height: 5, borderRadius: '50%',
          background: 'var(--accent)',
          display: 'inline-block',
          animation: `dotPulse 1.2s ${delay}s ease-in-out infinite`,
        }} />
      ))}
    </span>
  );
}
