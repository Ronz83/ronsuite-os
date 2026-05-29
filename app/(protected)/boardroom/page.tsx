'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Plus, AlertCircle, RefreshCw } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  role: string;
  avatar_color: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

export default function BoardroomPage() {
  const [input, setInput] = useState('');
  const [directedTo, setDirectedTo] = useState<'All' | 'Antigravity' | 'Codex' | 'Claude Code'>('All');
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Responses state
  const [responses, setResponses] = useState<Record<string, string>>({
    'Antigravity': '',
    'Codex': '',
    'Claude Code': '',
  });

  // Errors state
  const [errors, setErrors] = useState<Record<string, string>>({
    'Antigravity': '',
    'Codex': '',
    'Claude Code': '',
  });

  // Mobile layout state
  const [activeTab, setActiveTab] = useState<'Antigravity' | 'Codex' | 'Claude Code'>('Antigravity');
  const [isMobile, setIsMobile] = useState(false);

  // Synthesis state
  const [synthesis, setSynthesis] = useState('');
  const [synthesisStreaming, setSynthesisStreaming] = useState(false);

  // Goal Modal state
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalProjectId, setGoalProjectId] = useState('');
  const [goalAgentId, setGoalAgentId] = useState('');
  const [goalTurnBudget, setGoalTurnBudget] = useState(20);
  const [goalSaving, setGoalSaving] = useState(false);

  // Dropdown lists
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  const supabase = createClient();

  // Scroll references
  const antigravityScrollRef = useRef<HTMLDivElement>(null);
  const codexScrollRef = useRef<HTMLDivElement>(null);
  const claudeScrollRef = useRef<HTMLDivElement>(null);
  const synthesisScrollRef = useRef<HTMLDivElement>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch projects and agents
  useEffect(() => {
    async function loadData() {
      const { data: projData } = await supabase.from('projects').select('id, name, slug').order('name');
      const { data: agtData } = await supabase.from('agents').select('id, name, role, avatar_color').eq('enabled', true).order('name');
      
      if (projData) setProjects(projData);
      if (agtData) setAgents(agtData);
    }
    loadData();
  }, [supabase]);

  // Scroll to bottom on streaming responses
  useEffect(() => {
    if (antigravityScrollRef.current) antigravityScrollRef.current.scrollTop = antigravityScrollRef.current.scrollHeight;
  }, [responses['Antigravity']]);

  useEffect(() => {
    if (codexScrollRef.current) codexScrollRef.current.scrollTop = codexScrollRef.current.scrollHeight;
  }, [responses['Codex']]);

  useEffect(() => {
    if (claudeScrollRef.current) claudeScrollRef.current.scrollTop = claudeScrollRef.current.scrollHeight;
  }, [responses['Claude Code']]);

  useEffect(() => {
    if (synthesisScrollRef.current) synthesisScrollRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [synthesis]);

  // Handle message sending
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;

    // Reset columns we expect to write to
    const targetAgents = directedTo === 'All' ? ['Antigravity', 'Codex', 'Claude Code'] : [directedTo];
    
    setResponses(prev => {
      const next = { ...prev };
      targetAgents.forEach(agt => {
        next[agt] = '';
      });
      return next;
    });

    setErrors(prev => {
      const next = { ...prev };
      targetAgents.forEach(agt => {
        next[agt] = '';
      });
      return next;
    });

    setSynthesis('');
    setStreaming(true);

    try {
      const res = await fetch('/api/boardroom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          directed_to: directedTo === 'All' ? null : directedTo,
          session_id: sessionId,
        }),
      });

      if (!res.ok || !res.body) throw new Error('Failed to initiate board session stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // Clear input
      setInput('');

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
              setSessionId(event.sessionId);
            } else if (event.type === 'text') {
              setResponses(prev => ({
                ...prev,
                [event.agent]: (prev[event.agent] || '') + event.text,
              }));
            } else if (event.type === 'error') {
              if (event.agent) {
                setErrors(prev => ({
                  ...prev,
                  [event.agent]: event.message,
                }));
              } else {
                alert(`Error: ${event.message}`);
              }
            } else if (event.type === 'turn_complete') {
              // Complete turn
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Stream connection error');
    } finally {
      setStreaming(false);
    }
  }

  // Synthesize answers with Hermes
  async function handleSynthesize() {
    if (synthesisStreaming) return;
    setSynthesis('');
    setSynthesisStreaming(true);

    const hermesAgent = agents.find(a => a.name === 'Hermes');
    if (!hermesAgent) {
      alert('Hermes agent not found in database. Synthesize aborted.');
      setSynthesisStreaming(false);
      return;
    }

    const synthesisPrompt = `You are Hermes, the master orchestrator. Please synthesize the following boardroom discussion into a single, unified, actionable recommendation. Ensure you pull from all three heads:\n\n` +
      `Creative Director (Antigravity): "${responses['Antigravity'] || '(No response)'}"\n\n` +
      `Engineering Lead (Codex): "${responses['Codex'] || '(No response)'}"\n\n` +
      `Architecture Lead (Claude Code): "${responses['Claude Code'] || '(No response)'}"\n\n` +
      `Provide a clear summary, key technical decisions, and structured next steps.`;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: synthesisPrompt,
          agentId: hermesAgent.id,
        }),
      });

      if (!res.ok || !res.body) throw new Error('Failed to start synthesis stream');

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
              setSynthesis(prev => prev + event.content);
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to synthesize');
    } finally {
      setSynthesisStreaming(false);
    }
  }

  // Save new goal populated with synthesis
  async function handleCreateGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!goalTitle.trim() || !goalProjectId || !goalAgentId) return;

    setGoalSaving(true);
    try {
      const { error } = await supabase.from('goals').insert({
        title: goalTitle.trim(),
        description: synthesis,
        project_id: goalProjectId,
        agent_id: goalAgentId,
        turn_budget: goalTurnBudget,
        status: 'queued',
      });

      if (error) throw error;

      setShowGoalModal(false);
      setGoalTitle('');
      setGoalProjectId('');
      setGoalAgentId('');
      setGoalTurnBudget(20);
      alert('Goal successfully created and queued!');
    } catch (err) {
      console.error(err);
      alert('Failed to create goal');
    } finally {
      setGoalSaving(false);
    }
  }

  // Pre-fill goal details before showing modal
  function openAssignTasksModal() {
    // Generate simple title from synthesis first line or static
    const cleanTitle = synthesis
      ? synthesis.split('\n')[0].replace(/[#*`]/g, '').trim().substring(0, 80)
      : 'Execute Boardroom synthesis';
    setGoalTitle(cleanTitle);
    setShowGoalModal(true);
  }

  // Clear session to start fresh
  function handleNewSession() {
    if (streaming || synthesisStreaming) return;
    setSessionId(null);
    setResponses({
      'Antigravity': '',
      'Codex': '',
      'Claude Code': '',
    });
    setErrors({
      'Antigravity': '',
      'Codex': '',
      'Claude Code': '',
    });
    setSynthesis('');
  }

  // Helper check if responses exist
  const hasResponses = responses['Antigravity'] || responses['Codex'] || responses['Claude Code'];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 2rem',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em' }}>Boardroom</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '1px' }}>Department Head Alignment Meeting</p>
          </div>

          {/* Bridge Status Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '3px 10px',
            fontSize: '0.75rem',
            fontWeight: 500,
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#94a3b8', // Gray dot for Cloud Mode
            }} />
            <span style={{ color: 'var(--muted)' }}>Cloud Mode</span>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={handleNewSession}
            disabled={streaming || synthesisStreaming}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '0.5rem 0.75rem',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: 'var(--muted)',
              cursor: streaming || synthesisStreaming ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              transition: 'all 0.15s',
            }}
          >
            <RefreshCw size={14} />
            <span>New Meeting</span>
          </button>
        </div>
      </header>

      {/* Main Boardroom Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        paddingBottom: '8.5rem', // space for input bar
      }}>
        {/* Desktop Layout - 3 columns */}
        {!isMobile ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            height: '100%',
            minHeight: '400px',
          }}>
            {/* Column 1: Antigravity */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '1rem',
                borderBottom: '1px solid var(--border)',
                background: 'rgba(168, 85, 247, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#a855f7',
                }} />
                <div>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)' }}>Antigravity</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Creative Director</p>
                </div>
              </div>
              <div
                ref={antigravityScrollRef}
                style={{
                  flex: 1,
                  padding: '1.25rem',
                  overflowY: 'auto',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  color: 'rgba(248, 250, 252, 0.9)',
                }}
              >
                {responses['Antigravity']}
                {errors['Antigravity'] && (
                  <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--danger)', background: 'rgba(244, 63, 94, 0.1)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.2)', fontSize: '0.8125rem' }}>
                    <AlertCircle size={16} />
                    <span>{errors['Antigravity']}</span>
                  </div>
                )}
                {!responses['Antigravity'] && !errors['Antigravity'] && (
                  <div style={{ color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>
                    Awaiting input...
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Codex */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '1rem',
                borderBottom: '1px solid var(--border)',
                background: 'rgba(34, 197, 94, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#22c55e',
                }} />
                <div>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)' }}>Codex</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Engineering Lead</p>
                </div>
              </div>
              <div
                ref={codexScrollRef}
                style={{
                  flex: 1,
                  padding: '1.25rem',
                  overflowY: 'auto',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  color: 'rgba(248, 250, 252, 0.9)',
                }}
              >
                {responses['Codex']}
                {errors['Codex'] && (
                  <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--danger)', background: 'rgba(244, 63, 94, 0.1)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.2)', fontSize: '0.8125rem' }}>
                    <AlertCircle size={16} />
                    <span>{errors['Codex']}</span>
                  </div>
                )}
                {!responses['Codex'] && !errors['Codex'] && (
                  <div style={{ color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>
                    Awaiting input...
                  </div>
                )}
              </div>
            </div>

            {/* Column 3: Claude Code */}
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '1rem',
                borderBottom: '1px solid var(--border)',
                background: 'rgba(249, 115, 22, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#f97316',
                }} />
                <div>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)' }}>Claude Code</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Architecture Lead</p>
                </div>
              </div>
              <div
                ref={claudeScrollRef}
                style={{
                  flex: 1,
                  padding: '1.25rem',
                  overflowY: 'auto',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  color: 'rgba(248, 250, 252, 0.9)',
                }}
              >
                {responses['Claude Code']}
                {errors['Claude Code'] && (
                  <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--danger)', background: 'rgba(244, 63, 94, 0.1)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.2)', fontSize: '0.8125rem' }}>
                    <AlertCircle size={16} />
                    <span>{errors['Claude Code']}</span>
                  </div>
                )}
                {!responses['Claude Code'] && !errors['Claude Code'] && (
                  <div style={{ color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>
                    Awaiting input...
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Mobile Swipe Tabs Layout */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            overflow: 'hidden',
            minHeight: '350px',
          }}>
            {/* Tab Selectors */}
            <div style={{
              display: 'flex',
              background: 'var(--surface-2)',
              borderBottom: '1px solid var(--border)',
            }}>
              {(['Antigravity', 'Codex', 'Claude Code'] as const).map(tab => {
                const colors: Record<string, string> = {
                  'Antigravity': '#a855f7',
                  'Codex': '#22c55e',
                  'Claude Code': '#f97316',
                };
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      flex: 1,
                      padding: '0.875rem 0.5rem',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: active ? 'var(--text)' : 'var(--muted)',
                      border: 'none',
                      borderBottom: active ? `3px solid ${colors[tab]}` : '3px solid transparent',
                      background: active ? 'rgba(255,255,255,0.02)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Swipeable / Switchable Content container */}
            <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    flex: 1,
                    padding: '1.25rem',
                    overflowY: 'auto',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    color: 'rgba(248, 250, 252, 0.9)',
                  }}
                >
                  {responses[activeTab]}
                  {errors[activeTab] && (
                    <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--danger)', background: 'rgba(244, 63, 94, 0.1)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.2)', fontSize: '0.8125rem' }}>
                      <AlertCircle size={16} />
                      <span>{errors[activeTab]}</span>
                    </div>
                  )}
                  {!responses[activeTab] && !errors[activeTab] && (
                    <div style={{ color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>
                      Awaiting input for {activeTab}...
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Synthesize and Action Buttons */}
        {hasResponses && !streaming && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            marginTop: '1.5rem',
          }}>
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleSynthesize}
                disabled={synthesisStreaming}
                style={{
                  flex: 1,
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: '#f59e0b',
                  borderRadius: '12px',
                  padding: '0.875rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: synthesisStreaming ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s',
                }}
              >
                <Sparkles size={16} />
                <span>{synthesisStreaming ? 'Synthesizing...' : 'Synthesize Discussion'}</span>
              </button>

              {synthesis && (
                <button
                  onClick={openAssignTasksModal}
                  style={{
                    flex: 1,
                    background: 'var(--accent)',
                    border: 'none',
                    color: 'var(--text)',
                    borderRadius: '12px',
                    padding: '0.875rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                  }}
                >
                  <Plus size={16} />
                  <span>Assign Tasks</span>
                </button>
              )}
            </div>

            {/* Synthesis stream container */}
            {(synthesis || synthesisStreaming) && (
              <div
                ref={synthesisScrollRef}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#f59e0b' }}>
                  <Sparkles size={16} />
                  <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Hermes Synthesis Recommendation</span>
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                  color: 'rgba(248, 250, 252, 0.9)',
                  whiteSpace: 'pre-wrap',
                }}>
                  {synthesis || 'Hermes is reading responses and generating recommendation...'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Shared Input Bar - Sticky at bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(10, 10, 15, 0.85)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--border)',
        padding: '1.25rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        zIndex: 50,
      }}>
        {/* Input Settings & Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 500 }}>Direct to:</span>
          {(['All', 'Antigravity', 'Codex', 'Claude Code'] as const).map(target => {
            const active = directedTo === target;
            const borderColors: Record<string, string> = {
              'All': 'var(--border)',
              'Antigravity': 'rgba(168, 85, 247, 0.4)',
              'Codex': 'rgba(34, 197, 94, 0.4)',
              'Claude Code': 'rgba(249, 115, 22, 0.4)',
            };
            const activeBgs: Record<string, string> = {
              'All': 'rgba(99, 102, 241, 0.15)',
              'Antigravity': 'rgba(168, 85, 247, 0.15)',
              'Codex': 'rgba(34, 197, 94, 0.15)',
              'Claude Code': 'rgba(249, 115, 22, 0.15)',
            };
            const activeTexts: Record<string, string> = {
              'All': 'var(--accent)',
              'Antigravity': '#a855f7',
              'Codex': '#22c55e',
              'Claude Code': '#f97316',
            };

            return (
              <button
                key={target}
                type="button"
                onClick={() => setDirectedTo(target)}
                disabled={streaming}
                style={{
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: active ? activeBgs[target] : 'var(--surface)',
                  color: active ? activeTexts[target] : 'var(--muted)',
                  border: active ? `1px solid ${activeTexts[target]}` : `1px solid ${borderColors[target]}`,
                  cursor: streaming ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.15s',
                }}
              >
                {target === 'All' ? 'All Heads' : `@${target}`}
              </button>
            );
          })}
        </div>

        {/* Input Bar Form */}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="text"
            placeholder={
              directedTo === 'All'
                ? "Ask the boardroom for guidance..."
                : `Ask @${directedTo} specifically...`
            }
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={streaming}
            style={{
              flex: 1,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '0.875rem 1.25rem',
              color: 'var(--text)',
              fontSize: '0.9375rem',
              outline: 'none',
              fontFamily: 'var(--font-ui)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming}
            style={{
              background: streaming || !input.trim() ? 'var(--border)' : 'var(--accent)',
              color: 'var(--text)',
              border: 'none',
              borderRadius: '12px',
              padding: '0 1.25rem',
              cursor: streaming || !input.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      {/* Goal Modal (Assign Tasks modal pre-populated with synthesis) */}
      {showGoalModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)', marginBottom: '1.5rem' }}>Create Goal from Boardroom</h3>
            <form onSubmit={handleCreateGoal} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>Goal Title</label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={e => setGoalTitle(e.target.value)}
                  required
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.625rem 0.875rem',
                    color: 'var(--text)',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    fontFamily: 'var(--font-ui)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>Project</label>
                <select
                  value={goalProjectId}
                  onChange={e => setGoalProjectId(e.target.value)}
                  required
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.625rem 0.875rem',
                    color: 'var(--text)',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  <option value="">Select a project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>Assigned Agent</label>
                <select
                  value={goalAgentId}
                  onChange={e => setGoalAgentId(e.target.value)}
                  required
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.625rem 0.875rem',
                    color: 'var(--text)',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  <option value="">Select an agent...</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>Turn Budget</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={goalTurnBudget}
                  onChange={e => setGoalTurnBudget(parseInt(e.target.value) || 20)}
                  required
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.625rem 0.875rem',
                    color: 'var(--text)',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    fontFamily: 'var(--font-ui)',
                  }}
                />
              </div>

              {/* Readonly preview of Synthesis */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>Synthesis Context (Will be set as Goal Description)</label>
                <div style={{
                  maxHeight: '120px',
                  overflowY: 'auto',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '0.625rem 0.875rem',
                  fontSize: '0.8125rem',
                  color: 'rgba(255,255,255,0.7)',
                  whiteSpace: 'pre-wrap',
                }}>
                  {synthesis}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  disabled={goalSaving}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    borderRadius: '8px',
                    padding: '0.625rem 1.25rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={goalSaving}
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--text)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.625rem 1.25rem',
                    fontWeight: 600,
                    cursor: goalSaving ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  {goalSaving ? 'Creating...' : 'Create Goal'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
