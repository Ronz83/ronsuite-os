'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  name: string;
  status: 'pending' | 'done' | 'error';
  result?: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', toolCalls: [] }]);

    abortRef.current = new AbortController();
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error('Stream failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'text') {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: m.content + event.content } : m
              ));
            } else if (event.type === 'tool_start') {
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, toolCalls: [...(m.toolCalls ?? []), { name: event.name, status: 'pending' }] }
                  : m
              ));
            } else if (event.type === 'tool_done') {
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? {
                      ...m, toolCalls: (m.toolCalls ?? []).map((tc, i) =>
                        i === (m.toolCalls ?? []).length - 1
                          ? { ...tc, status: 'done', result: event.result }
                          : tc
                      )
                    }
                  : m
              ));
            }
          } catch {}
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, content: m.content || 'Stream interrupted. Please try again.' }
            : m
        ));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, streaming]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem'
          }}>🤖</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Planner</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>● Online</div>
          </div>
        </div>
        {streaming && (
          <button
            onClick={() => abortRef.current?.abort()}
            style={{
              background: 'rgba(244,63,94,0.15)', color: 'var(--danger)',
              border: '1px solid rgba(244,63,94,0.3)', borderRadius: '8px',
              padding: '0.4rem 0.875rem', fontSize: '0.8125rem', cursor: 'pointer',
              fontFamily: 'var(--font-ui)'
            }}
          >⏹ Stop</button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚡</div>
            <p style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.5rem' }}>Planner Agent</p>
            <p style={{ fontSize: '0.875rem' }}>Tell me a goal and I&apos;ll break it into tasks.</p>
            <p style={{ fontSize: '0.8125rem', marginTop: '0.5rem', fontStyle: 'italic' }}>Try: &ldquo;Plan the next 3 tasks for TicketFlows&rdquo;</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex', flexDirection: 'column',
            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{
              maxWidth: '75%', padding: '0.875rem 1.125rem', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface)',
              border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
              color: 'var(--text)', fontSize: '0.9375rem', lineHeight: 1.6,
              fontFamily: msg.role === 'assistant' ? 'var(--font-mono)' : 'var(--font-ui)',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word'
            }}>
              {msg.content}
              {msg.role === 'assistant' && streaming && msg.content === '' && (
                <span style={{ display: 'inline-block', width: '8px', height: '16px', background: 'var(--accent)', animation: 'blink 1s infinite', marginLeft: '2px', verticalAlign: 'middle', borderRadius: '2px' }} />
              )}
            </div>
            {(msg.toolCalls ?? []).map((tc, i) => (
              <div key={i} style={{
                marginTop: '0.375rem', fontSize: '0.8rem',
                padding: '0.375rem 0.75rem', borderRadius: '6px',
                background: tc.status === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                border: `1px solid ${tc.status === 'pending' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
                color: tc.status === 'pending' ? 'var(--warning)' : 'var(--success)',
                fontFamily: 'var(--font-mono)'
              }}>
                {tc.status === 'pending' ? '⚙ ' : '✓ '}
                {tc.name.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)',
        background: 'var(--surface)'
      }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Set a goal or ask a question… (Enter to send, Shift+Enter for newline)"
            disabled={streaming}
            rows={1}
            style={{
              flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '0.875rem 1rem', color: 'var(--text)',
              fontSize: '0.9375rem', resize: 'none', outline: 'none',
              fontFamily: 'var(--font-ui)', lineHeight: 1.5,
              opacity: streaming ? 0.5 : 1
            }}
          />
          <button
            onClick={sendMessage} disabled={!input.trim() || streaming}
            style={{
              background: !input.trim() || streaming ? 'var(--border)' : 'var(--accent)',
              color: 'var(--text)', border: 'none', borderRadius: '12px',
              width: '48px', height: '48px', fontSize: '1.125rem',
              cursor: !input.trim() || streaming ? 'not-allowed' : 'pointer',
              flexShrink: 0, transition: 'background 0.15s'
            }}
          >↑</button>
        </div>
      </div>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}
