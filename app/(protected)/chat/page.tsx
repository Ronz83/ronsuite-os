import { ChatInterface } from '@/components/chat/ChatInterface';
import { Suspense } from 'react';

export default function ChatPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2.5rem', color: 'var(--muted)', background: 'var(--bg)', minHeight: '100vh' }}>Loading chat interface…</div>}>
      <ChatInterface />
    </Suspense>
  );
}
