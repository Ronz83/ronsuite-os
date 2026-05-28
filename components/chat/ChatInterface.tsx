'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';

interface Agent {
  id: string;
  name: string;
  role: string;
  system_prompt: string;
  avatar_color: string;
  tools: any;
}

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
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const searchParams = useSearchParams();
  const goalId = searchParams.get('goal_id');

  const [currentGoalId, setCurrentGoalId] = useState<string | null>(null);
  const [goalContext, setGoalContext] = useState<any>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Helper to load active session from Supabase
  const loadActiveSession = useCallback(async (agentId: string, goalId: string | null, targetGoalCtx?: any) => {
    const activeGoalCtx = targetGoalCtx || goalContext;
    try {
      const query = supabase
        .from('sessions')
        .select('*')
        .eq('agent_id', agentId)
        .eq('status', 'active');

      if (goalId) {
        query.eq('goal_id', goalId);
      } else {
        query.is('goal_id', null);
      }

      const { data, error } = await query
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCurrentSessionId(data.id);
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          const clientMsgs: Message[] = data.messages.map((m: any) => ({
            id: m.id || crypto.randomUUID(),
            role: m.role,
            content: typeof m.content === 'string'
              ? m.content
              : Array.isArray(m.content)
                ? m.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
                : '',
            toolCalls: Array.isArray(m.content)
              ? m.content.filter((c: any) => c.type === 'tool_use').map((c: any) => ({
                  name: c.name,
                  status: 'done' as const,
                  result: typeof c.result === 'string' ? c.result : undefined
                }))
              : []
          }));
          setMessages(clientMsgs);
        } else if (activeGoalCtx) {
          setMessages([
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `🎯 **Goal Scoped Session Initiated**\n\n**Goal**: ${activeGoalCtx.title}\n**Project**: ${activeGoalCtx.projects?.name || 'Global'}\n**Assigned Agent**: ${activeGoalCtx.agents?.name || 'None'}\n**Turn Budget**: ${activeGoalCtx.turns_used} / ${activeGoalCtx.turn_budget} turns used\n\nI am ready to help you execute this goal. What would you like to build first?`,
            }
          ]);
        } else {
          setMessages([]);
        }
      } else {
        setCurrentSessionId(null);
        if (activeGoalCtx) {
          setMessages([
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `🎯 **Goal Scoped Session Initiated**\n\n**Goal**: ${activeGoalCtx.title}\n**Project**: ${activeGoalCtx.projects?.name || 'Global'}\n**Assigned Agent**: ${activeGoalCtx.agents?.name || 'None'}\n**Turn Budget**: ${activeGoalCtx.turns_used} / ${activeGoalCtx.turn_budget} turns used\n\nI am ready to help you execute this goal. What would you like to build first?`,
            }
          ]);
        } else {
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Error loading active session:', err);
      setCurrentSessionId(null);
      setMessages([]);
    }
  }, [supabase, goalContext]);

  // Load agents on mount
  useEffect(() => {
    async function loadAgents() {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('enabled', true)
        .order('role', { ascending: false }); // Puts orchestrator near top usually

      if (data && data.length > 0) {
        setAgents(data);
        // Default to Orchestrator (Hermes) if available, otherwise first agent
        const orchestrator = data.find(a => a.role === 'orchestrator');
        setSelectedAgent(orchestrator || data[0]);
      }
    }
    loadAgents();
  }, []);

  // Load goal context if goalId is provided
  useEffect(() => {
    if (!goalId || agents.length === 0) return;

    async function loadGoal() {
      try {
        const { data: goalData, error } = await supabase
          .from('goals')
          .select('*, projects(*), agents(*)')
          .eq('id', goalId)
          .single();

        if (goalData) {
          setCurrentGoalId(goalId);
          setGoalContext(goalData);

          // Find agent assigned to the goal
          const assignedAgent = agents.find(a => a.id === goalData.agent_id);
          const targetAgent = assignedAgent || agents[0];
          if (assignedAgent) {
            setSelectedAgent(assignedAgent);
          }

          // Trigger loading active session or show greeting
          loadActiveSession(targetAgent.id, goalId, goalData);
        }
      } catch (err) {
        console.error('Error loading goal context:', err);
      }
    }

    loadGoal();
  }, [goalId, agents, loadActiveSession]);

  // Load session when agent changes (if not loading goal or after goal loads)
  useEffect(() => {
    if (!selectedAgent || goalId) return;
    loadActiveSession(selectedAgent.id, currentGoalId);
  }, [selectedAgent, currentGoalId, loadActiveSession, goalId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear messages when agent changes to start a clean session context
  const handleAgentChange = (agent: Agent) => {
    if (streaming) return;
    setSelectedAgent(agent);
    setMessages([]);
    setCurrentGoalId(null);
    setGoalContext(null);
    setCurrentSessionId(null);
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming || !selectedAgent) return;
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
        body: JSON.stringify({
          message: userMsg.content,
          agentId: selectedAgent.id,
          goalId: currentGoalId || undefined,
          sessionId: currentSessionId || undefined,
        }),
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
            if (event.type === 'session_init') {
              setCurrentSessionId(event.sessionId);
            } else if (event.type === 'text') {
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
                      ...m,
                      toolCalls: (m.toolCalls ?? []).map((tc, i) =>
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
  }, [input, streaming, selectedAgent, currentGoalId, currentSessionId]);

  const isOrchestrator = selectedAgent?.role === 'orchestrator';

  return (
    <div className="chat-container" style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      {/* Sidebar Agent Selector */}
      <div className="chat-agent-selector" style={{
        width: '260px',
        borderRight: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.25rem'
      }}>
        <h2 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
          Active Agents
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto' }}>
          {agents.map(agent => {
            const isActive = selectedAgent?.id === agent.id;
            const isAgentOrchestrator = agent.role === 'orchestrator';
            return (
              <button
                key={agent.id}
                onClick={() => handleAgentChange(agent)}
                disabled={streaming}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: isActive
                    ? (isAgentOrchestrator ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)')
                    : 'transparent',
                  border: isActive
                    ? `1px solid ${isAgentOrchestrator ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
                    : '1px solid transparent',
                  cursor: streaming ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  color: isActive ? 'var(--text)' : 'var(--muted)',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: agent.avatar_color || 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  boxShadow: isAgentOrchestrator ? `0 0 10px ${agent.avatar_color}44` : 'none',
                  border: isAgentOrchestrator ? `1px solid ${agent.avatar_color}` : 'none'
                }}>
                  {agent.role === 'orchestrator' && '👑'}
                  {agent.role === 'planner' && '🎯'}
                  {agent.role === 'developer' && '💻'}
                  {agent.role === 'researcher' && '🔍'}
                  {agent.role === 'operations' && '📊'}
                  {!['orchestrator', 'planner', 'developer', 'researcher', 'operations'].includes(agent.role) && '🤖'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {agent.name}
                    {isAgentOrchestrator && (
                      <span style={{ fontSize: '0.7rem', background: agent.avatar_color, color: '#0a0a0f', padding: '1px 4px', borderRadius: '4px', fontWeight: 700 }}>Host</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.8, textTransform: 'capitalize' }}>
                    {agent.role}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)',
          background: 'var(--surface)', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: selectedAgent?.avatar_color || 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              border: isOrchestrator ? `2px solid ${selectedAgent?.avatar_color}` : 'none',
              boxShadow: isOrchestrator ? `0 0 12px ${selectedAgent?.avatar_color}66` : 'none'
            }}>
              {selectedAgent?.role === 'orchestrator' && '👑'}
              {selectedAgent?.role === 'planner' && '🎯'}
              {selectedAgent?.role === 'developer' && '💻'}
              {selectedAgent?.role === 'researcher' && '🔍'}
              {selectedAgent?.role === 'operations' && '📊'}
              {!['orchestrator', 'planner', 'developer', 'researcher', 'operations'].includes(selectedAgent?.role || '') && '🤖'}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                {selectedAgent?.name || 'Loading agent…'}
                {isOrchestrator && (
                  <span style={{ fontSize: '0.75rem', background: `${selectedAgent?.avatar_color}22`, color: selectedAgent?.avatar_color, padding: '2px 6px', borderRadius: '6px', fontWeight: 600 }}>Command Center</span>
                )}
                {goalContext && (
                  <span style={{
                    fontSize: '0.75rem',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: 'var(--warning)',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    maxWidth: '180px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }} title={goalContext.title}>
                    🎯 {goalContext.title}
                  </span>
                )}
              </div>
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
          {messages.length === 0 && selectedAgent && (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
                {selectedAgent.role === 'orchestrator' && '👑'}
                {selectedAgent.role === 'planner' && '🎯'}
                {selectedAgent.role === 'developer' && '💻'}
                {selectedAgent.role === 'researcher' && '🔍'}
                {selectedAgent.role === 'operations' && '📊'}
              </div>
              <p style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--text)', marginBottom: '0.5rem' }}>
                {selectedAgent.name} Agent
              </p>
              <p style={{ fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto', lineHeight: 1.5 }}>
                {selectedAgent.role === 'orchestrator' && 'I am Hermes, the master orchestrator. I coordinate projects, assess requirements, and route tasks to specialists.'}
                {selectedAgent.role === 'planner' && 'I translate goals into concrete, actionable task lists on the operations board.'}
                {selectedAgent.role === 'developer' && 'I review architectures, inspect codebase layouts, and write technical implementation plans.'}
                {selectedAgent.role === 'researcher' && 'I search the web for fact-finding, competitive intelligence, and project context.'}
                {selectedAgent.role === 'operations' && 'I assess active tasks, highlight blocked items, and summarize project statuses.'}
              </p>
              <p style={{ fontSize: '0.8125rem', marginTop: '0.75rem', fontStyle: 'italic' }}>
                {selectedAgent.role === 'orchestrator' && 'Try: "What agent should I use to build a new feature?"'}
                {selectedAgent.role === 'planner' && 'Try: "Plan the next 3 tasks for TicketFlows"'}
                {selectedAgent.role === 'developer' && 'Try: "Plan a Supabase Realtime feature update spec"'}
                {selectedAgent.role === 'researcher' && 'Try: "What are the latest updates on Tailwind v4?"'}
                {selectedAgent.role === 'operations' && 'Try: "Which tasks are currently blocked or in progress?"'}
              </p>
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
              placeholder={isOrchestrator ? "Chat with Hermes..." : "Set a goal or ask a question…"}
              disabled={streaming || !selectedAgent}
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
              onClick={sendMessage} disabled={!input.trim() || streaming || !selectedAgent}
              style={{
                background: !input.trim() || streaming || !selectedAgent ? 'var(--border)' : 'var(--accent)',
                color: 'var(--text)', border: 'none', borderRadius: '12px',
                width: '48px', height: '48px', fontSize: '1.125rem',
                cursor: !input.trim() || streaming || !selectedAgent ? 'not-allowed' : 'pointer',
                flexShrink: 0, transition: 'background 0.15s'
              }}
            >↑</button>
          </div>
        </div>
      </div>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}
