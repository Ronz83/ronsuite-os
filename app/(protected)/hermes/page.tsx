'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Send, Plus, Trash2, Check, X, ShieldAlert,
  Loader2, ChevronRight, User, Bot, BookOpen, AlertCircle,
  Database, Sparkles, Columns, Target, Mic, ExternalLink, Cpu
} from 'lucide-react';

interface Session {
  id: string;
  created_at: string;
  title: string;
}

interface Message {
  id?: string;
  role: 'user' | 'hermes';
  content: string;
  created_at?: string;
}

interface JournalEntry {
  id: string;
  entry_date: string;
  content: string;
  tags: string[];
}

interface Approval {
  id: string;
  created_at: string;
  title: string;
  description: string;
  action_type: string;
  payload: any;
  agent: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  resolved_at?: string;
}

export default function HermesPage() {
  const supabase = createClient();

  // App States
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Chat/Session States
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');

  // Sidebar / Journals States
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalContent, setJournalContent] = useState('');
  const [journalTags, setJournalTags] = useState('');

  // Approvals States
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [recentlyResolved, setRecentlyResolved] = useState<Record<string, 'approved' | 'rejected'>>({});

  // Onboarding Wizard States
  const [onboardStep, setOnboardStep] = useState(1);
  const [onboardData, setOnboardData] = useState({
    full_name: '',
    business_name: '',
    business_description: '',
    active_projects: [] as string[],
    current_priorities: [] as string[],
    connected_systems: [] as string[],
    communication_style: 'direct'
  });
  
  // Tag input temp states for onboarding
  const [tempProject, setTempProject] = useState('');
  const [tempPriority, setTempPriority] = useState('');
  const [tempSystem, setTempSystem] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch initial states on mount
  useEffect(() => {
    fetchContext();
    fetchJournals();
    fetchApprovals();
  }, []);

  // 2. Fetch messages when currentSessionId changes
  useEffect(() => {
    if (currentSessionId) {
      fetchMessages(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  // 3. Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText]);

  const prefillOnboarding = async () => {
    try {
      const res = await fetch('/api/nws-context');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.missions) {
          const missionStatement = json.missions.find((m: any) => m.version === 'Mission Statement');
          if (missionStatement) {
            setOnboardData(prev => ({
              ...prev,
              business_name: 'Novelty Web Solutions',
              business_description: missionStatement.message
            }));
          }
        }
      }
    } catch (err) {
      console.error('Failed to pre-fill onboarding data:', err);
    }
  };

  // Context Fetching
  const fetchContext = async () => {
    try {
      const res = await fetch('/api/hermes/context');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.context) {
          setContext(data.context);
          setOnboardingComplete(data.context.onboarding_complete);
          if (data.context.onboarding_complete) {
            fetchSessions();
          } else {
            prefillOnboarding();
          }
        } else {
          setOnboardingComplete(false);
          prefillOnboarding();
        }
      }
    } catch (err) {
      console.error('Failed to fetch context:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sessions Fetching
  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('hermes_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSessions(data);
      if (data.length > 0 && !currentSessionId) {
        setCurrentSessionId(data[0].id);
      }
    }
  };

  // Messages Fetching
  const fetchMessages = async (sid: string) => {
    const { data, error } = await supabase
      .from('hermes_messages')
      .select('*')
      .eq('session_id', sid)
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      setMessages(data);
    }
  };

  // Journals Fetching
  const fetchJournals = async () => {
    try {
      const res = await fetch('/api/hermes/journal');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setJournals(data.entries);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Approvals Fetching
  const fetchApprovals = async () => {
    try {
      const res = await fetch('/api/hermes/approvals');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setApprovals(data.approvals);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Onboarding Complete Handler
  const handleOnboardingSubmit = async () => {
    try {
      const res = await fetch('/api/hermes/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...onboardData,
          onboarding_complete: true
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setContext(data.context);
          setOnboardingComplete(true);
          fetchSessions();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Start new chat session
  const handleNewSession = async () => {
    const title = 'New Conversation';
    const { data, error } = await supabase
      .from('hermes_sessions')
      .insert({ title })
      .select()
      .single();

    if (!error && data) {
      setSessions(prev => [data, ...prev]);
      setCurrentSessionId(data.id);
    }
  };

  // Delete chat session
  const handleDeleteSession = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = confirm('Delete this conversation?');
    if (!confirmed) return;

    const { error } = await supabase
      .from('hermes_sessions')
      .delete()
      .eq('id', sid);

    if (!error) {
      setSessions(prev => prev.filter(s => s.id !== sid));
      if (currentSessionId === sid) {
        setCurrentSessionId(null);
      }
    }
  };

  // Create Journal Entry
  const handleCreateJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalContent.trim()) return;

    try {
      const res = await fetch('/api/hermes/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: journalContent,
          tags: journalTags.split(',').map(t => t.trim()).filter(Boolean)
        })
      });

      if (res.ok) {
        setShowJournalModal(false);
        setJournalContent('');
        setJournalTags('');
        fetchJournals();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Resolve Approval
  const handleResolveApproval = async (id: string, decision: 'approved' | 'rejected') => {
    try {
      const res = await fetch('/api/hermes/approvals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: decision })
      });

      if (res.ok) {
        setRecentlyResolved(prev => ({ ...prev, [id]: decision }));
        setTimeout(() => {
          fetchApprovals();
          setRecentlyResolved(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }, 1500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Send Chat Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || streaming) return;

    const userText = inputMessage;
    setInputMessage('');
    setStreaming(true);
    setStreamText('');

    // Prepend user message locally
    setMessages(prev => [...prev, { role: 'user', content: userText }]);

    try {
      const res = await fetch('/api/hermes/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          session_id: currentSessionId || undefined,
          context_id: context?.id
        })
      });

      if (!res.ok) {
        throw new Error('Chat API returned error');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const raw = line.slice(6).trim();
              try {
                const parsed = JSON.parse(raw);
                if (parsed.type === 'session_init' && !currentSessionId) {
                  setCurrentSessionId(parsed.sessionId);
                  fetchSessions();
                } else if (parsed.type === 'text') {
                  accumulatedText += parsed.text;
                  setStreamText(accumulatedText);
                } else if (parsed.type === 'approval_created') {
                  fetchApprovals();
                } else if (parsed.type === 'done') {
                  // Finalize stream
                  setMessages(prev => [...prev, { role: 'hermes', content: accumulatedText }]);
                  setStreamText('');
                  setStreaming(false);
                } else if (parsed.type === 'error') {
                  alert(`Hermes encounter error: ${parsed.error}`);
                  setStreaming(false);
                }
              } catch (e) {
                // Ignore partial JSON parse errors
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to send message: ' + err.message);
      setStreaming(false);
    }
  };

  // Quick Action Helper
  const triggerQuickAction = (text: string) => {
    setInputMessage(text);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // Onboarding helpers
  const onboardAddProject = () => {
    if (tempProject.trim() && !onboardData.active_projects.includes(tempProject.trim())) {
      setOnboardData(prev => ({ ...prev, active_projects: [...prev.active_projects, tempProject.trim()] }));
      setTempProject('');
    }
  };

  const onboardAddPriority = () => {
    if (tempPriority.trim() && !onboardData.current_priorities.includes(tempPriority.trim())) {
      setOnboardData(prev => ({ ...prev, current_priorities: [...prev.current_priorities, tempPriority.trim()] }));
      setTempPriority('');
    }
  };

  const onboardAddSystem = () => {
    if (tempSystem.trim() && !onboardData.connected_systems.includes(tempSystem.trim())) {
      setOnboardData(prev => ({ ...prev, connected_systems: [...prev.connected_systems, tempSystem.trim()] }));
      setTempSystem('');
    }
  };

  // Loading Splash Screen
  if (loading || onboardingComplete === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <p style={{ marginTop: '1rem', color: 'var(--muted)', fontSize: '0.875rem' }}>Loading Hermes context...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      
      {/* ONBOARDING MODAL OVERLAY */}
      <AnimatePresence>
        {!onboardingComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(5, 5, 8, 0.95)', zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)', padding: '1.5rem'
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              style={{
                width: '100%', maxWidth: '600px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '20px', padding: '2.5rem',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
              }}
            >
              {/* Onboarding Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.15)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'
                }}>
                  <Brain size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>Onboard with Hermes</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Setup your AI Chief of Staff context (Step {onboardStep} of 6)</p>
                </div>
              </div>

              {/* Steps Body */}
              <div style={{ minHeight: '180px', marginBottom: '2rem' }}>
                {onboardStep === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <p style={{ fontSize: '1rem', color: 'var(--text)', fontWeight: 500 }}>&ldquo;What is your full name?&rdquo;</p>
                    <input
                      type="text"
                      value={onboardData.full_name}
                      onChange={e => setOnboardData(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="e.g. Ronald Prescod"
                      autoFocus
                      style={{
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                        borderRadius: '8px', padding: '0.75rem 1rem', color: 'var(--text)',
                        fontSize: '0.9375rem', outline: 'none'
                      }}
                    />
                  </div>
                )}

                {onboardStep === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <p style={{ fontSize: '1rem', color: 'var(--text)', fontWeight: 500 }}>&ldquo;Tell me about your business — what is it called and what does it do?&rdquo;</p>
                    <input
                      type="text"
                      value={onboardData.business_name}
                      onChange={e => setOnboardData(prev => ({ ...prev, business_name: e.target.value }))}
                      placeholder="Business Name (e.g. Novelty Web Solutions)"
                      style={{
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                        borderRadius: '8px', padding: '0.75rem 1rem', color: 'var(--text)',
                        fontSize: '0.9375rem', outline: 'none', marginBottom: '0.5rem'
                      }}
                    />
                    <textarea
                      value={onboardData.business_description}
                      onChange={e => setOnboardData(prev => ({ ...prev, business_description: e.target.value }))}
                      placeholder="Business Description / Mission..."
                      rows={3}
                      style={{
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                        borderRadius: '8px', padding: '0.75rem 1rem', color: 'var(--text)',
                        fontSize: '0.9375rem', outline: 'none', resize: 'none'
                      }}
                    />
                  </div>
                )}

                {onboardStep === 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <p style={{ fontSize: '1rem', color: 'var(--text)', fontWeight: 500 }}>&ldquo;What are your active projects right now?&rdquo;</p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={tempProject}
                        onChange={e => setTempProject(e.target.value)}
                        placeholder="Add project (e.g. Caricom Business)"
                        onKeyDown={e => e.key === 'Enter' && onboardAddProject()}
                        style={{
                          flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)',
                          borderRadius: '8px', padding: '0.75rem 1rem', color: 'var(--text)',
                          fontSize: '0.9375rem', outline: 'none'
                        }}
                      />
                      <button onClick={onboardAddProject} style={{
                        padding: '0.75rem 1rem', background: 'var(--accent)', border: 'none',
                        color: '#fff', borderRadius: '8px', cursor: 'pointer'
                      }}><Plus size={18} /></button>
                    </div>
                    {/* Projects tags list */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {onboardData.active_projects.map(p => (
                        <span key={p} style={{
                          display: 'flex', alignItems: 'center', gap: '0.375rem',
                          background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent)',
                          padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem'
                        }}>
                          {p}
                          <X size={12} style={{ cursor: 'pointer' }} onClick={() => setOnboardData(prev => ({
                            ...prev, active_projects: prev.active_projects.filter(x => x !== p)
                          }))} />
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {onboardStep === 4 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <p style={{ fontSize: '1rem', color: 'var(--text)', fontWeight: 500 }}>&ldquo;What are your top priorities for the next 90 days?&rdquo;</p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={tempPriority}
                        onChange={e => setTempPriority(e.target.value)}
                        placeholder="Add priority (e.g. Launch PWA app store)"
                        onKeyDown={e => e.key === 'Enter' && onboardAddPriority()}
                        style={{
                          flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)',
                          borderRadius: '8px', padding: '0.75rem 1rem', color: 'var(--text)',
                          fontSize: '0.9375rem', outline: 'none'
                        }}
                      />
                      <button onClick={onboardAddPriority} style={{
                        padding: '0.75rem 1rem', background: 'var(--accent)', border: 'none',
                        color: '#fff', borderRadius: '8px', cursor: 'pointer'
                      }}><Plus size={18} /></button>
                    </div>
                    {/* Priorities list */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {onboardData.current_priorities.map(p => (
                        <span key={p} style={{
                          display: 'flex', alignItems: 'center', gap: '0.375rem',
                          background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)',
                          padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem'
                        }}>
                          {p}
                          <X size={12} style={{ cursor: 'pointer' }} onClick={() => setOnboardData(prev => ({
                            ...prev, current_priorities: prev.current_priorities.filter(x => x !== p)
                          }))} />
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {onboardStep === 5 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <p style={{ fontSize: '1rem', color: 'var(--text)', fontWeight: 500 }}>&ldquo;What tools and systems do you work with daily?&rdquo;</p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={tempSystem}
                        onChange={e => setTempSystem(e.target.value)}
                        placeholder="Add system (e.g. Supabase, Vercel)"
                        onKeyDown={e => e.key === 'Enter' && onboardAddSystem()}
                        style={{
                          flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)',
                          borderRadius: '8px', padding: '0.75rem 1rem', color: 'var(--text)',
                          fontSize: '0.9375rem', outline: 'none'
                        }}
                      />
                      <button onClick={onboardAddSystem} style={{
                        padding: '0.75rem 1rem', background: 'var(--accent)', border: 'none',
                        color: '#fff', borderRadius: '8px', cursor: 'pointer'
                      }}><Plus size={18} /></button>
                    </div>
                    {/* Connected systems list */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {onboardData.connected_systems.map(s => (
                        <span key={s} style={{
                          display: 'flex', alignItems: 'center', gap: '0.375rem',
                          background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)',
                          padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem'
                        }}>
                          {s}
                          <X size={12} style={{ cursor: 'pointer' }} onClick={() => setOnboardData(prev => ({
                            ...prev, connected_systems: prev.connected_systems.filter(x => x !== s)
                          }))} />
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {onboardStep === 6 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <p style={{ fontSize: '1rem', color: 'var(--text)', fontWeight: 500 }}>&ldquo;How do you prefer to communicate?&rdquo;</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                      {['direct', 'casual', 'formal'].map(style => (
                        <button
                          key={style}
                          onClick={() => setOnboardData(prev => ({ ...prev, communication_style: style }))}
                          style={{
                            padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)',
                            background: onboardData.communication_style === style ? 'rgba(99, 102, 241, 0.15)' : 'var(--surface-2)',
                            color: onboardData.communication_style === style ? 'var(--accent)' : 'var(--muted)',
                            borderColor: onboardData.communication_style === style ? 'var(--accent)' : 'var(--border)',
                            fontWeight: 600, fontSize: '0.9rem', textTransform: 'capitalize', cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Steps Footer / Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => setOnboardStep(prev => Math.max(1, prev - 1))}
                  disabled={onboardStep === 1}
                  style={{
                    background: 'transparent', border: 'none', color: 'var(--muted)',
                    fontSize: '0.875rem', cursor: onboardStep === 1 ? 'not-allowed' : 'pointer',
                    opacity: onboardStep === 1 ? 0.3 : 1
                  }}
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    if (onboardStep < 6) {
                      setOnboardStep(prev => prev + 1);
                    } else {
                      handleOnboardingSubmit();
                    }
                  }}
                  style={{
                    background: 'var(--accent)', border: 'none', color: '#fff',
                    borderRadius: '8px', padding: '0.625rem 1.25rem', fontSize: '0.875rem',
                    fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem'
                  }}
                >
                  {onboardStep === 6 ? 'Complete Onboarding' : 'Next'} <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* THREE COLUMN MAIN DASHBOARD */}
      {onboardingComplete && (
        <>
          {/* COLUMN 1: SESSIONS & JOURNAL (LEFT) */}
          <aside style={{
            width: '260px', borderRight: '1px solid var(--border)',
            background: 'var(--surface)', display: 'flex', flexDirection: 'column', flexShrink: 0
          }}>
            {/* Header: Sessions */}
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)' }}>Conversations</span>
              <button
                onClick={handleNewSession}
                style={{
                  background: 'rgba(99, 102, 241, 0.1)', border: 'none',
                  color: 'var(--accent)', borderRadius: '6px', padding: '0.375rem', cursor: 'pointer'
                }}
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Sessions List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {sessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => setCurrentSessionId(s.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.625rem 0.75rem', borderRadius: '8px', cursor: 'pointer',
                    background: currentSessionId === s.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    color: currentSessionId === s.id ? 'var(--text)' : 'var(--muted)',
                    fontSize: '0.85rem', transition: 'all 0.15s'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: '0.5rem' }}>
                    {s.title || 'Untitled Session'}
                  </span>
                  <button
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', opacity: 0.6 }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {sessions.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.75rem', marginTop: '2rem' }}>No conversations yet.</p>
              )}
            </div>

            {/* Header: Journal */}
            <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <BookOpen size={16} /> Journal
              </span>
              <button
                onClick={() => setShowJournalModal(true)}
                style={{
                  background: 'rgba(16, 185, 129, 0.1)', border: 'none',
                  color: 'var(--success)', borderRadius: '6px', padding: '0.375rem', cursor: 'pointer'
                }}
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Compact Journal List */}
            <div style={{ height: '240px', overflowY: 'auto', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {journals.slice(0, 5).map(j => (
                <div key={j.id} style={{
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: '8px', padding: '0.75rem', fontSize: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', marginBottom: '0.25rem' }}>
                    <span>{j.entry_date}</span>
                    <span style={{ display: 'flex', gap: '0.25rem' }}>
                      {j.tags.map(t => (
                        <span key={t} style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.05rem 0.25rem', borderRadius: '4px' }}>#{t}</span>
                      ))}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text)', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{j.content}</p>
                </div>
              ))}
              {journals.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.75rem', marginTop: '2rem' }}>No journal entries yet.</p>
              )}
            </div>
          </aside>

          {/* COLUMN 2: CHAT THREAD (MIDDLE) */}
          <section style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            {/* Thread Header */}
            <div style={{
              padding: '1rem 2rem', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: 'var(--surface)'
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.15)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'
              }}>
                <Brain size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text)' }}>Hermes Chat</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Chief of Staff Session</p>
              </div>
            </div>

            {/* Conversation Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex', gap: '1rem',
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '80%', flexDirection: m.role === 'user' ? 'row-reverse' : 'row'
                  }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: m.role === 'user' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: m.role === 'user' ? 'var(--accent)' : 'var(--success)', flexShrink: 0
                  }}>
                    {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div style={{
                    background: m.role === 'user' ? 'rgba(99, 102, 241, 0.1)' : 'var(--surface)',
                    border: '1px solid var(--border)', borderRadius: '12px',
                    padding: '0.875rem 1.25rem', fontSize: '0.9rem', color: 'var(--text)',
                    lineHeight: '1.6', whiteSpace: 'pre-wrap'
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}

              {/* Streaming Chunk */}
              {streaming && streamText && (
                <div style={{ display: 'flex', gap: '1rem', alignSelf: 'flex-start', maxWidth: '80%' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.15)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: 'var(--success)', flexShrink: 0
                  }}>
                    <Bot size={16} />
                  </div>
                  <div style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: '12px', padding: '0.875rem 1.25rem', fontSize: '0.9rem',
                    color: 'var(--text)', lineHeight: '1.6', whiteSpace: 'pre-wrap'
                  }}>
                    {streamText}
                    <span style={{ display: 'inline-block', width: '6px', height: '15px', background: 'var(--accent)', marginLeft: '4px', animation: 'pulse 1s infinite' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} style={{ padding: '1.5rem 2rem', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: '0.75rem', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.5rem 0.75rem' }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  placeholder="Tell Hermes what to do or ask a question..."
                  disabled={streaming}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: 'var(--text)', fontSize: '0.9375rem', padding: '0.5rem'
                  }}
                />
                <button
                  type="submit"
                  disabled={streaming || !inputMessage.trim()}
                  style={{
                    background: 'var(--accent)', color: '#fff', border: 'none',
                    borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </form>
          </section>

          {/* COLUMN 3: APPROVAL QUEUE (RIGHT) */}
          <aside style={{
            width: '280px', borderLeft: '1px solid var(--border)',
            background: 'var(--surface)', display: 'flex', flexDirection: 'column', flexShrink: 0
          }}>
            {/* Header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cpu size={18} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)' }}>Engine Control Center</span>
            </div>

            {/* Scrollable Container */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Hermes Feature Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hermes Features</h4>
                
                {/* 1. Persistent Memory */}
                <div style={{
                  background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.75rem',
                  display: 'flex', flexDirection: 'column', gap: '0.5rem', transition: 'border-color 0.2s'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Database size={15} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>Persistent Memory</span>
                    </div>
                    <a href="/memory" style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '2px', textDecoration: 'none', fontSize: '0.7rem' }}>
                      Open <ExternalLink size={10} />
                    </a>
                  </div>
                  <p style={{ fontSize: '0.725rem', color: 'var(--muted)', lineHeight: '1.3' }}>Keep track of projects, user contexts, and history.</p>
                  <button
                    onClick={() => triggerQuickAction("Recall my business context and current priorities.")}
                    style={{
                      background: 'rgba(99, 102, 241, 0.1)', border: 'none', color: 'var(--accent)',
                      borderRadius: '6px', padding: '0.35rem 0.5rem', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left'
                    }}
                  >
                    ⚡ Recall Context
                  </button>
                </div>

                {/* 2. Autonomous Skill Creation */}
                <div style={{
                  background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.75rem',
                  display: 'flex', flexDirection: 'column', gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={15} style={{ color: '#10b981' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>Autonomous Skills</span>
                  </div>
                  <p style={{ fontSize: '0.725rem', color: 'var(--muted)', lineHeight: '1.3' }}>Design and train new workflows for repetitive tasks.</p>
                  <button
                    onClick={() => triggerQuickAction("Let's create a new skill to automate ")}
                    style={{
                      background: 'rgba(16, 185, 129, 0.1)', border: 'none', color: '#10b981',
                      borderRadius: '6px', padding: '0.35rem 0.5rem', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left'
                    }}
                  >
                    ⚡ Teach New Skill
                  </button>
                </div>

                {/* 3. Kanban Workflow */}
                <div style={{
                  background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.75rem',
                  display: 'flex', flexDirection: 'column', gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Columns size={15} style={{ color: '#ea580c' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>Kanban Board</span>
                    </div>
                    <a href="/board" style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '2px', textDecoration: 'none', fontSize: '0.7rem' }}>
                      Board <ExternalLink size={10} />
                    </a>
                  </div>
                  <p style={{ fontSize: '0.725rem', color: 'var(--muted)', lineHeight: '1.3' }}>Coordinated multi-agent workflow on a shared task board.</p>
                  <button
                    onClick={() => triggerQuickAction("Show all active tasks on the project board")}
                    style={{
                      background: 'rgba(234, 88, 12, 0.1)', border: 'none', color: '#ea580c',
                      borderRadius: '6px', padding: '0.35rem 0.5rem', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left'
                    }}
                  >
                    ⚡ View Board Status
                  </button>
                </div>

                {/* 4. Goal-Oriented Planning */}
                <div style={{
                  background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.75rem',
                  display: 'flex', flexDirection: 'column', gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Target size={15} style={{ color: '#f59e0b' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>Goal Planning</span>
                    </div>
                    <a href="/goals" style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '2px', textDecoration: 'none', fontSize: '0.7rem' }}>
                      Goals <ExternalLink size={10} />
                    </a>
                  </div>
                  <p style={{ fontSize: '0.725rem', color: 'var(--muted)', lineHeight: '1.3' }}>Assign long-term, multi-turn milestones using `/goal` command.</p>
                  <button
                    onClick={() => triggerQuickAction("/goal ")}
                    style={{
                      background: 'rgba(245, 158, 11, 0.1)', border: 'none', color: '#f59e0b',
                      borderRadius: '6px', padding: '0.35rem 0.5rem', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left'
                    }}
                  >
                    ⚡ Queue New Goal
                  </button>
                </div>

                {/* 5. Voice Mode */}
                <div style={{
                  background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.75rem',
                  display: 'flex', flexDirection: 'column', gap: '0.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mic size={15} style={{ color: '#a855f7' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>Voice Mode</span>
                  </div>
                  <p style={{ fontSize: '0.725rem', color: 'var(--muted)', lineHeight: '1.3' }}>Enable real-time voice synthesis and interactive voice chat.</p>
                  <button
                    onClick={() => triggerQuickAction("Start voice interaction mode")}
                    style={{
                      background: 'rgba(168, 85, 247, 0.1)', border: 'none', color: '#a855f7',
                      borderRadius: '6px', padding: '0.35rem 0.5rem', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left'
                    }}
                  >
                    ⚡ Enable Voice Mode
                  </button>
                </div>

              </div>

              <div style={{ borderBottom: '1px solid var(--border)', margin: '0.25rem 0' }} />

              {/* Pending Approvals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Pending Queue</h4>
              
              {approvals.filter(a => a.status === 'pending').map(a => {
                const isApproved = recentlyResolved[a.id] === 'approved';
                const isRejected = recentlyResolved[a.id] === 'rejected';

                return (
                  <div
                    key={a.id}
                    style={{
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                      borderRadius: '12px', padding: '1rem', display: 'flex',
                      flexDirection: 'column', gap: '0.5rem', transition: 'all 0.3s',
                      opacity: (isApproved || isRejected) ? 0.6 : 1,
                      transform: (isApproved || isRejected) ? 'scale(0.98)' : 'scale(1)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>{a.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>{a.description}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--muted)' }}>
                      <div>Type: <span style={{ fontFamily: 'var(--font-mono)' }}>{a.action_type}</span></div>
                      <div>Agent: <span>{a.agent}</span></div>
                    </div>

                    {(isApproved || isRejected) ? (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                        fontSize: '0.8rem', color: isApproved ? 'var(--success)' : 'var(--danger)',
                        fontWeight: 600, padding: '0.375rem', background: isApproved ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                        borderRadius: '6px', justifyContent: 'center'
                      }}>
                        {isApproved ? <Check size={14} /> : <X size={14} />}
                        {isApproved ? 'Approved' : 'Rejected'}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button
                          onClick={() => handleResolveApproval(a.id, 'approved')}
                          style={{
                            background: 'var(--success)', border: 'none', color: '#fff',
                            borderRadius: '6px', padding: '0.375rem', fontSize: '0.75rem',
                            fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center'
                          }}
                        >
                          <Check size={12} /> Approve
                        </button>
                        <button
                          onClick={() => handleResolveApproval(a.id, 'rejected')}
                          style={{
                            background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)',
                            borderRadius: '6px', padding: '0.375rem', fontSize: '0.75rem',
                            fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center'
                          }}
                        >
                          <X size={12} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {approvals.filter(a => a.status === 'pending').length === 0 && (
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center', marginTop: '2rem' }}>No pending approvals.</p>
              )}
              </div>

              {/* Resolved Approvals */}
              <h4 style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', marginTop: '1.5rem', marginBottom: '0.25rem' }}>Resolved</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {approvals.filter(a => a.status !== 'pending').slice(0, 5).map(a => (
                  <div key={a.id} style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '0.75rem', fontSize: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{a.title}</span>
                      <span style={{
                        fontSize: '0.65rem', padding: '0.1rem 0.375rem', borderRadius: '4px',
                        background: a.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                        color: a.status === 'approved' ? 'var(--success)' : 'var(--danger)',
                        textTransform: 'capitalize'
                      }}>{a.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </>
      )}

      {/* JOURNAL ENTRY MODAL */}
      <AnimatePresence>
        {showJournalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowJournalModal(false)}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(5, 5, 8, 0.8)', zIndex: 1100,
              display: 'flex', alignItems: 'center',
              backdropFilter: 'blur(4px)', padding: '1.5rem', justifyContent: 'center'
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: '480px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '16px', padding: '1.5rem'
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <BookOpen size={18} style={{ color: 'var(--success)' }} /> Add Daily Journal Entry
              </h3>
              
              <form onSubmit={handleCreateJournal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <textarea
                  value={journalContent}
                  onChange={e => setJournalContent(e.target.value)}
                  placeholder="What did you work on today? Highlight decisions, blockers, or progress..."
                  rows={6}
                  required
                  style={{
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '0.75rem', color: 'var(--text)',
                    fontSize: '0.9rem', outline: 'none', resize: 'none'
                  }}
                />

                <input
                  type="text"
                  value={journalTags}
                  onChange={e => setJournalTags(e.target.value)}
                  placeholder="Tags (comma separated, e.g. code, pitch)"
                  style={{
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '0.75rem', color: 'var(--text)',
                    fontSize: '0.9rem', outline: 'none'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowJournalModal(false)}
                    style={{
                      background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)',
                      borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      background: 'var(--success)', border: 'none', color: '#fff',
                      borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer',
                      fontSize: '0.85rem', fontWeight: 600
                    }}
                  >
                    Save Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
