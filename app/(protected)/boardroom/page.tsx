'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Plus, AlertCircle, RefreshCw, User } from 'lucide-react';

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

interface BoardroomTurn {
  id: string;
  user_message: string;
  directed_to: string | null;
  responses: Record<string, string>; // agent name -> response text
  synthesis?: string | null;
  reactions?: Record<string, string>; // Phase 2 cross-agent reactions (not persisted to DB)
}

export default function BoardroomPage() {
  const [input, setInput] = useState('');
  const [directedTo, setDirectedTo] = useState<'All' | 'Antigravity' | 'Codex' | 'Claude Code'>('All');
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Bridge & Mode State
  const [bridgeMode, setBridgeMode] = useState<'cloud' | 'bridge'>('cloud');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [businessContext, setBusinessContext] = useState<string>('');

  // Persistent meeting turns thread
  const [turns, setTurns] = useState<BoardroomTurn[]>([]);

  // Current active/streaming turn states
  const [currentTurnUserMessage, setCurrentTurnUserMessage] = useState('');
  const [currentTurnDirectedTo, setCurrentTurnDirectedTo] = useState<string | null>(null);
  const [currentTurnResponses, setCurrentTurnResponses] = useState<Record<string, string>>({
    'Antigravity': '',
    'Codex': '',
    'Claude Code': '',
  });
  const [currentTurnErrors, setCurrentTurnErrors] = useState<Record<string, string>>({
    'Antigravity': '',
    'Codex': '',
    'Claude Code': '',
  });

  // Phase 2 cross-agent reaction state
  const [currentTurnReactions, setCurrentTurnReactions] = useState<Record<string, string>>({
    'Antigravity': '',
    'Codex': '',
    'Claude Code': '',
  });
  const [phase2Active, setPhase2Active] = useState(false);

  // Mobile layout active tab for the streaming turn
  const [activeTab, setActiveTab] = useState<'Antigravity' | 'Codex' | 'Claude Code'>('Antigravity');
  const [isMobile, setIsMobile] = useState(false);

  // Synthesis state for the current or selected turn
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
  const threadEndRef = useRef<HTMLDivElement>(null);
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

      // Load business context
      try {
        const res = await fetch('/api/hermes/context');
        if (res.ok) {
          const resJson = await res.json();
          if (resJson.success && resJson.context) {
            const ctx = resJson.context;
            const formatted = `Name: ${ctx.full_name || ''}
Business: ${ctx.business_name || ''}
Description: ${ctx.business_description || ''}
Role: ${ctx.role || ''}
Communication Style: ${ctx.communication_style || ''}
Connected Systems: ${Array.isArray(ctx.connected_systems) ? ctx.connected_systems.join(', ') : ctx.connected_systems || ''}`;
            setBusinessContext(formatted);
          }
        }
      } catch (err) {
        console.error("Failed to load business context:", err);
      }
    }
    loadData();
  }, [supabase]);

  // Load latest boardroom session and its turns on mount
  useEffect(() => {
    async function loadLatestSession() {
      const { data: session } = await supabase
        .from('boardroom_sessions')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (session) {
        setSessionId(session.id);
        
        const { data: turnsData } = await supabase
          .from('boardroom_turns')
          .select('*')
          .eq('session_id', session.id)
          .order('created_at', { ascending: true });

        if (turnsData) {
          const loadedTurns: BoardroomTurn[] = turnsData.map(t => {
            const resMap: Record<string, string> = {};
            if (Array.isArray(t.responses)) {
              t.responses.forEach((r: any) => {
                resMap[r.agent] = r.text;
              });
            }
            return {
              id: t.id,
              user_message: t.user_message,
              directed_to: t.directed_to,
              responses: resMap,
              synthesis: t.synthesis
            };
          });
          setTurns(loadedTurns);
        }
      }
    }
    loadLatestSession();
  }, [supabase]);

  // Bridge Ping & Recheck Loop (re-checks status every 60s)
  useEffect(() => {
    async function checkBridgeStatus() {
      const forceCloud = localStorage.getItem('ronsuite_force_cloud') === 'true';
      if (forceCloud) {
        setBridgeMode(prev => {
          if (prev === 'bridge') {
            showToast("Force Cloud Mode enabled — switched to Cloud Mode");
          }
          return 'cloud';
        });
        return;
      }

      const savedUrl = localStorage.getItem('ronsuite_bridge_url');
      const bridgeUrl = savedUrl || process.env.NEXT_PUBLIC_BRIDGE_URL || 'http://localhost:3001';

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const cleanUrl = bridgeUrl.replace(/\/$/, '');

        const res = await fetch(`${cleanUrl}/health`, {
          signal: controller.signal,
          mode: 'cors',
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.mode === 'bridge') {
            setBridgeMode('bridge');
            return;
          }
        }
        
        setBridgeMode(prev => {
          if (prev === 'bridge') {
            showToast("Bridge offline — switched to Cloud Mode");
          }
          return 'cloud';
        });
      } catch (err) {
        setBridgeMode(prev => {
          if (prev === 'bridge') {
            showToast("Bridge offline — switched to Cloud Mode");
          }
          return 'cloud';
        });
      }
    }

    checkBridgeStatus();
    const interval = setInterval(checkBridgeStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  function showToast(msg: string) {
    setToastMessage(msg);
  }

  // Clear toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Scroll current streaming columns
  useEffect(() => {
    if (antigravityScrollRef.current) antigravityScrollRef.current.scrollTop = antigravityScrollRef.current.scrollHeight;
  }, [currentTurnResponses['Antigravity']]);

  useEffect(() => {
    if (codexScrollRef.current) codexScrollRef.current.scrollTop = codexScrollRef.current.scrollHeight;
  }, [currentTurnResponses['Codex']]);

  useEffect(() => {
    if (claudeScrollRef.current) claudeScrollRef.current.scrollTop = claudeScrollRef.current.scrollHeight;
  }, [currentTurnResponses['Claude Code']]);

  // Scroll main thread to bottom
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, currentTurnUserMessage, streaming]);

  useEffect(() => {
    if (synthesisScrollRef.current) synthesisScrollRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [synthesis]);

  // Handle message sending
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;

    const userMsg = input.trim();
    const targetAgents = directedTo === 'All' ? ['Antigravity', 'Codex', 'Claude Code'] : [directedTo];
    const targetVal = directedTo === 'All' ? null : directedTo;

    // Reset current turn streaming states
    setCurrentTurnUserMessage(userMsg);
    setCurrentTurnDirectedTo(targetVal);
    
    // Default tabs to the directed agent if only targeting one on mobile
    if (directedTo !== 'All') {
      setActiveTab(directedTo);
    }

    setCurrentTurnResponses({
      'Antigravity': '',
      'Codex': '',
      'Claude Code': '',
    });
    setCurrentTurnReactions({
      'Antigravity': '',
      'Codex': '',
      'Claude Code': '',
    });
    setCurrentTurnErrors({
      'Antigravity': '',
      'Codex': '',
      'Claude Code': '',
    });
    setPhase2Active(false);

    setSynthesis('');
    setStreaming(true);
    setInput('');

    // --- Power Mode WebSocket Execution ---
    if (bridgeMode === 'bridge') {
      const savedUrl = localStorage.getItem('ronsuite_bridge_url');
      const bridgeUrl = savedUrl || process.env.NEXT_PUBLIC_BRIDGE_URL || 'http://localhost:3001';
      const wsUrl = bridgeUrl.replace(/^http/, 'ws');

      try {
        console.log(`[Boardroom WS] Initiating dynamic CLI streams at ${wsUrl}`);
        
        let resolvedSessionId = sessionId;
        if (!resolvedSessionId) {
          const { data: newSession, error: sessErr } = await supabase
            .from('boardroom_sessions')
            .insert({ mode: 'bridge' })
            .select()
            .single();
          if (sessErr) throw sessErr;
          resolvedSessionId = newSession.id;
          setSessionId(newSession.id);
        }

        const activeResponses: Record<string, string> = {
          'Antigravity': '',
          'Codex': '',
          'Claude Code': '',
        };

        const runAgentWs = (agt: string) => {
          return new Promise<void>((resolve, reject) => {
            const socket = new WebSocket(wsUrl);
            const agentKey = agt === 'Claude Code' ? 'claude' : agt.toLowerCase();

            socket.onopen = () => {
              socket.send(JSON.stringify({
                type: 'message',
                agent: agentKey,
                content: userMsg,
                businessContext: businessContext || undefined,
                history: turns.slice(-5).map(t => ({
                  user_message: t.user_message,
                  responses: Object.fromEntries(
                    Object.entries(t.responses).map(([k, v]) => [k, v.substring(0, 500)])
                  )
                }))
              }));
            };

            socket.onmessage = (event) => {
              try {
                const data = JSON.parse(event.data);
                if (data.type === 'text') {
                  setCurrentTurnResponses(prev => {
                    const nextText = (prev[agt] || '') + data.text;
                    activeResponses[agt] = nextText;
                    return {
                      ...prev,
                      [agt]: nextText
                    };
                  });
                } else if (data.type === 'error') {
                  setCurrentTurnErrors(prev => ({
                    ...prev,
                    [agt]: data.message
                  }));
                } else if (data.type === 'agent_done') {
                  socket.close();
                  resolve();
                }
              } catch (err) {
                console.error("[WS Message Error]", err);
              }
            };

            socket.onerror = (err) => {
              console.error("[WS Connection Error]", err);
              reject(new Error(`WebSocket error for agent ${agt}`));
            };

            socket.onclose = () => {
              resolve();
            };
          });
        };

        // Fire Phase 1 WebSocket connections in parallel
        await Promise.all(targetAgents.map(agt => runAgentWs(agt)));

        // === Phase 2: Cross-agent reactions (only when all agents participated) ===
        const reactionCaptures: Record<string, string> = { 'Antigravity': '', 'Codex': '', 'Claude Code': '' };

        if (targetAgents.length > 1) {
          setPhase2Active(true);
          setCurrentTurnReactions({ 'Antigravity': '', 'Codex': '', 'Claude Code': '' });

          const runPhase2AgentWs = (agt: string) => {
            return new Promise<void>((resolve) => {
              const agentKey2 = agt === 'Claude Code' ? 'claude' : agt.toLowerCase();
              const peers = targetAgents.filter(a => a !== agt && activeResponses[a]);
              if (!peers.length) { resolve(); return; }

              const peerCtx = peers.map(p =>
                `${p}: ${activeResponses[p].replace(/\n+/g, ' ').substring(0, 250)}`
              ).join(' | ');

              const reactionContent = [
                `Colleagues answered "${userMsg.replace(/"/g, "'").substring(0, 150)}".`,
                peerCtx,
                `As ${agentRoles[agt]}, react in 2 sentences: what do you add or challenge?`
              ].join(' ');

              const sock = new WebSocket(wsUrl);
              sock.onopen = () => {
                sock.send(JSON.stringify({ type: 'message', agent: agentKey2, content: reactionContent, businessContext: businessContext || undefined }));
              };
              sock.onmessage = (event) => {
                try {
                  const msg = JSON.parse(event.data);
                  if (msg.type === 'text') {
                    setCurrentTurnReactions(prev => {
                      reactionCaptures[agt] = (prev[agt] || '') + msg.text;
                      return { ...prev, [agt]: reactionCaptures[agt] };
                    });
                  } else if (msg.type === 'agent_done' || msg.type === 'error') {
                    sock.close();
                    resolve();
                  }
                } catch {}
              };
              sock.onerror = () => resolve();
              sock.onclose = () => resolve();
            });
          };

          await Promise.all(targetAgents.map(agt => runPhase2AgentWs(agt)));
          setPhase2Active(false);
        }

        // Log completed turn to Supabase
        const turnRes = targetAgents.map(agt => ({
          agent: agt,
          text: activeResponses[agt] || ''
        }));

        const { data: turnData, error: turnErr } = await supabase
          .from('boardroom_turns')
          .insert({
            session_id: resolvedSessionId,
            user_message: userMsg,
            directed_to: targetVal,
            responses: turnRes
          })
          .select()
          .single();

        if (turnErr) throw turnErr;

        // Append completed turn to local thread view state
        setTurns(prev => [...prev, {
          id: turnData.id || crypto.randomUUID(),
          user_message: userMsg,
          directed_to: targetVal,
          responses: activeResponses,
          synthesis: null,
          reactions: targetAgents.length > 1 ? { ...reactionCaptures } : undefined
        }]);

        // Reset current streaming states
        setCurrentTurnUserMessage('');
        setCurrentTurnDirectedTo(null);
        setCurrentTurnResponses({ 'Antigravity': '', 'Codex': '', 'Claude Code': '' });
        setCurrentTurnReactions({ 'Antigravity': '', 'Codex': '', 'Claude Code': '' });
        setStreaming(false);
        return;
      } catch (err) {
        console.error("[Boardroom WS] Connection failed, switching to Cloud Mode...", err);
        setBridgeMode('cloud');
        showToast("Bridge offline — switched to Cloud Mode");
        // Fallback continues below
      }
    }

    // --- Cloud Mode HTTP SSE Fallback ---
    try {
      const res = await fetch('/api/boardroom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          directed_to: targetVal,
          session_id: sessionId,
        }),
      });

      if (!res.ok || !res.body) throw new Error('Failed to initiate board session stream');

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
              setSessionId(event.sessionId);
            } else if (event.type === 'text') {
              setCurrentTurnResponses(prev => ({
                ...prev,
                [event.agent]: (prev[event.agent] || '') + event.text,
              }));
            } else if (event.type === 'error') {
              if (event.agent) {
                setCurrentTurnErrors(prev => ({
                  ...prev,
                  [event.agent]: event.message,
                }));
              } else {
                alert(`Error: ${event.message}`);
              }
            } else if (event.type === 'turn_complete') {
              const turnResMap: Record<string, string> = {};
              if (Array.isArray(event.responses)) {
                event.responses.forEach((r: any) => {
                  turnResMap[r.agent] = r.text;
                });
              } else {
                targetAgents.forEach(agt => {
                  turnResMap[agt] = currentTurnResponses[agt];
                });
              }

              setTurns(prev => [...prev, {
                id: event.turnId || crypto.randomUUID(),
                user_message: userMsg,
                directed_to: targetVal,
                responses: turnResMap,
                synthesis: null
              }]);

              setCurrentTurnUserMessage('');
              setCurrentTurnDirectedTo(null);
              setCurrentTurnResponses({ 'Antigravity': '', 'Codex': '', 'Claude Code': '' });
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

  // Synthesize answers with Hermes for the last turn in thread
  async function handleSynthesize() {
    if (synthesisStreaming || turns.length === 0) return;
    setSynthesis('');
    setSynthesisStreaming(true);

    const hermesAgent = agents.find(a => a.name === 'Hermes');
    if (!hermesAgent) {
      alert('Hermes agent not found in database. Synthesize aborted.');
      setSynthesisStreaming(false);
      return;
    }

    const lastTurn = turns[turns.length - 1];

    const synthesisPrompt = `You are Hermes, the master orchestrator. Please synthesize the following boardroom discussion into a single, unified, actionable recommendation. Ensure you pull from all three heads:\n\n` +
      `Creative Director (Antigravity): "${lastTurn.responses['Antigravity'] || '(No response)'}"\n\n` +
      `Engineering Lead (Codex): "${lastTurn.responses['Codex'] || '(No response)'}"\n\n` +
      `Architecture Lead (Claude Code): "${lastTurn.responses['Claude Code'] || '(No response)'}"\n\n` +
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
      let fullSynthesis = '';

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
              fullSynthesis += event.content;
            }
          } catch {}
        }
      }

      // Update state in turns array
      setTurns(prev => prev.map((t, idx) => idx === prev.length - 1 ? { ...t, synthesis: fullSynthesis } : t));

      // Save synthesis back to database turn row
      await supabase
        .from('boardroom_turns')
        .update({ synthesis: fullSynthesis })
        .eq('id', lastTurn.id);

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
    if (!cleanSynthesisText || !goalTitle.trim() || !goalProjectId || !goalAgentId) return;

    setGoalSaving(true);
    try {
      const { error } = await supabase.from('goals').insert({
        title: goalTitle.trim(),
        description: cleanSynthesisText,
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
  const lastTurnWithSynthesis = [...turns].reverse().find(t => t.synthesis);
  const cleanSynthesisText = lastTurnWithSynthesis?.synthesis || '';

  function openAssignTasksModal() {
    if (!cleanSynthesisText) return;
    const cleanTitle = cleanSynthesisText.split('\n')[0].replace(/[#*`]/g, '').trim().substring(0, 80) || 'Execute Boardroom synthesis';
    setGoalTitle(cleanTitle);
    setShowGoalModal(true);
  }

  // Clear session to start fresh
  async function handleNewSession() {
    if (streaming || synthesisStreaming) return;
    
    // Insert fresh cloud session
    const { data: newSession } = await supabase
      .from('boardroom_sessions')
      .insert({ mode: bridgeMode })
      .select()
      .single();

    if (newSession) {
      setSessionId(newSession.id);
    } else {
      setSessionId(null);
    }
    
    setTurns([]);
    setCurrentTurnUserMessage('');
    setCurrentTurnResponses({
      'Antigravity': '',
      'Codex': '',
      'Claude Code': '',
    });
    setCurrentTurnReactions({
      'Antigravity': '',
      'Codex': '',
      'Claude Code': '',
    });
    setCurrentTurnErrors({
      'Antigravity': '',
      'Codex': '',
      'Claude Code': '',
    });
    setSynthesis('');
    setPhase2Active(false);
  }

  // Helper check if last turn has response
  const hasLastTurnResponses = turns.length > 0;

  // Agent colors mapping
  const agentColors: Record<string, string> = {
    'Antigravity': '#a855f7',
    'Codex': '#22c55e',
    'Claude Code': '#f97316',
  };

  const agentBgs: Record<string, string> = {
    'Antigravity': 'rgba(168, 85, 247, 0.08)',
    'Codex': 'rgba(34, 197, 94, 0.08)',
    'Claude Code': 'rgba(249, 115, 22, 0.08)',
  };

  const agentRoles: Record<string, string> = {
    'Antigravity': 'Creative Director',
    'Codex': 'Engineering Lead',
    'Claude Code': 'Architecture Lead',
  };

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
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 15 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'absolute',
              top: '1rem',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '0.625rem 1.25rem',
              color: 'var(--text)',
              fontSize: '0.8125rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <AlertCircle size={16} style={{ color: 'var(--warning)' }} />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 2rem',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em' }}>Boardroom</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '1px' }}>Department Head Alignment Meeting</p>
          </div>

          {/* Dynamic Bridge Status Indicator */}
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
              background: bridgeMode === 'bridge' ? '#22c55e' : '#94a3b8',
            }} />
            <span style={{ color: bridgeMode === 'bridge' ? '#22c55e' : 'var(--muted)' }}>
              {bridgeMode === 'bridge' ? 'Power Mode' : 'Cloud Mode'}
            </span>
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

      {/* Main Boardroom Thread Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2.5rem',
        paddingBottom: '9.5rem',
      }}>
        {/* Render Previous Thread Turns */}
        {turns.map((turn, index) => (
          <div key={turn.id || index} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* User Message card */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
              maxWidth: '85%',
              alignSelf: 'flex-start',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text)',
                fontSize: '0.875rem',
                fontWeight: 600,
                flexShrink: 0,
              }}>
                <User size={16} />
              </div>
              <div style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '0.875rem 1.25rem',
                fontSize: '0.9375rem',
                lineHeight: 1.5,
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Ronald {turn.directed_to && <span style={{ color: agentColors[turn.directed_to] || 'var(--accent)' }}>&gt; @{turn.directed_to}</span>}
                </div>
                <div>{turn.user_message}</div>
              </div>
            </div>

            {/* Agent Responses Row */}
            {turn.directed_to ? (
              // Directed layout - Single card
              <div style={{
                background: 'var(--surface)',
                border: `1px solid ${agentColors[turn.directed_to]}33`,
                borderRadius: '16px',
                overflow: 'hidden',
                maxWidth: '80%',
                alignSelf: 'flex-end',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}>
                <div style={{
                  padding: '0.75rem 1.25rem',
                  borderBottom: '1px solid var(--border)',
                  background: agentBgs[turn.directed_to],
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: agentColors[turn.directed_to] }} />
                  <div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{turn.directed_to}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '0.5rem' }}>{agentRoles[turn.directed_to]}</span>
                  </div>
                </div>
                <div style={{
                  padding: '1.25rem',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  color: 'rgba(248, 250, 252, 0.95)',
                }}>
                  {turn.responses[turn.directed_to]}
                </div>
              </div>
            ) : (
              // All layout - Three Columns (Desktop) or stacked (Mobile)
              !isMobile ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1rem',
                  minHeight: '200px',
                }}>
                  {Object.keys(agentColors).map(agt => (
                    <div key={agt} style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid var(--border)',
                        background: agentBgs[agt],
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: agentColors[agt] }} />
                        <div>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{agt}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', marginLeft: '0.5rem' }}>{agentRoles[agt]}</span>
                        </div>
                      </div>
                      <div style={{
                        padding: '1rem',
                        fontSize: '0.8125rem',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        overflowY: 'auto',
                        color: 'rgba(248, 250, 252, 0.9)',
                      }}>
                        {turn.responses[agt]}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Mobile stacked layout for Turn
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {Object.keys(agentColors).map(agt => (
                    <div key={agt} style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        padding: '0.5rem 0.875rem',
                        borderBottom: '1px solid var(--border)',
                        background: agentBgs[agt],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: agentColors[agt] }} />
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{agt}</span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{agentRoles[agt]}</span>
                      </div>
                      <div style={{
                        padding: '0.875rem',
                        fontSize: '0.8125rem',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        color: 'rgba(248, 250, 252, 0.9)',
                      }}>
                        {turn.responses[agt]}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Phase 2 reactions for completed turns */}
            {turn.reactions && !turn.directed_to && Object.values(turn.reactions).some(r => r) && (
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem', paddingLeft: '0.25rem' }}>
                  Cross-Agent Reactions
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '0.625rem' }}>
                  {Object.keys(agentColors).map(agt => turn.reactions![agt] ? (
                    <div key={agt} style={{
                      background: 'var(--surface)',
                      border: `1px solid ${agentColors[agt]}22`,
                      borderRadius: '10px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        padding: '0.375rem 0.75rem',
                        background: agentBgs[agt],
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: agentColors[agt],
                        borderBottom: `1px solid ${agentColors[agt]}22`,
                      }}>
                        {agt} reacts
                      </div>
                      <div style={{
                        padding: '0.625rem 0.75rem',
                        fontSize: '0.775rem',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        color: 'rgba(248, 250, 252, 0.8)',
                      }}>
                        {turn.reactions![agt]}
                      </div>
                    </div>
                  ) : null)}
                </div>
              </div>
            )}

            {/* Synthesis result if exists */}
            {turn.synthesis && (
              <div style={{
                background: 'var(--surface)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '16px',
                padding: '1.25rem 1.5rem',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                maxWidth: '90%',
                alignSelf: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#f59e0b' }}>
                  <Sparkles size={14} />
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Hermes Recommendation Summary</span>
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  lineHeight: 1.55,
                  color: 'rgba(248, 250, 252, 0.85)',
                  whiteSpace: 'pre-wrap',
                }}>
                  {turn.synthesis}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Current Streaming Turn */}
        {currentTurnUserMessage && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start',
              maxWidth: '85%',
              alignSelf: 'flex-start',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text)',
                fontSize: '0.875rem',
                fontWeight: 600,
                flexShrink: 0,
              }}>
                <User size={16} />
              </div>
              <div style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '0.875rem 1.25rem',
                fontSize: '0.9375rem',
                lineHeight: 1.5,
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Ronald {currentTurnDirectedTo && <span style={{ color: agentColors[currentTurnDirectedTo] || 'var(--accent)' }}>&gt; @{currentTurnDirectedTo}</span>}
                </div>
                <div>{currentTurnUserMessage}</div>
              </div>
            </div>

            {/* Streaming columns */}
            {currentTurnDirectedTo ? (
              <div style={{
                background: 'var(--surface)',
                border: `1px solid ${agentColors[currentTurnDirectedTo]}55`,
                borderRadius: '16px',
                overflow: 'hidden',
                maxWidth: '80%',
                alignSelf: 'flex-end',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}>
                <div style={{
                  padding: '0.75rem 1.25rem',
                  borderBottom: '1px solid var(--border)',
                  background: agentBgs[currentTurnDirectedTo],
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: agentColors[currentTurnDirectedTo] }} />
                  <div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{currentTurnDirectedTo}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: '0.5rem' }}>{agentRoles[currentTurnDirectedTo]}</span>
                  </div>
                </div>
                <div style={{
                  padding: '1.25rem',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  color: 'rgba(248, 250, 252, 0.95)',
                }}>
                  {currentTurnResponses[currentTurnDirectedTo]}
                  {currentTurnErrors[currentTurnDirectedTo] && (
                    <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--danger)', background: 'rgba(244, 63, 94, 0.1)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.2)', fontSize: '0.8125rem' }}>
                      <AlertCircle size={16} />
                      <span>{currentTurnErrors[currentTurnDirectedTo]}</span>
                    </div>
                  )}
                  {!currentTurnResponses[currentTurnDirectedTo] && !currentTurnErrors[currentTurnDirectedTo] && (
                    <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Streaming...</span>
                  )}
                </div>
              </div>
            ) : (
              !isMobile ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1rem',
                  minHeight: '200px',
                }}>
                  {Object.keys(agentColors).map(agt => (
                    <div key={agt} style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid var(--border)',
                        background: agentBgs[agt],
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: agentColors[agt] }} />
                        <div>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{agt}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', marginLeft: '0.5rem' }}>{agentRoles[agt]}</span>
                        </div>
                      </div>
                      <div
                        ref={
                          agt === 'Antigravity' ? antigravityScrollRef :
                          agt === 'Codex' ? codexScrollRef :
                          claudeScrollRef
                        }
                        style={{
                          padding: '1rem',
                          fontSize: '0.8125rem',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                          overflowY: 'auto',
                          color: 'rgba(248, 250, 252, 0.9)',
                        }}
                      >
                        {currentTurnResponses[agt]}
                        {currentTurnErrors[agt] && (
                          <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--danger)', background: 'rgba(244, 63, 94, 0.1)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.2)', fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                            <AlertCircle size={14} />
                            <span>{currentTurnErrors[agt]}</span>
                          </div>
                        )}
                        {!currentTurnResponses[agt] && !currentTurnErrors[agt] && (
                          <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Streaming...</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  minHeight: '300px',
                }}>
                  <div style={{ display: 'flex', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                    {Object.keys(agentColors).map(agt => {
                      const active = activeTab === agt;
                      return (
                        <button
                          key={agt}
                          onClick={() => setActiveTab(agt as any)}
                          style={{
                            flex: 1,
                            padding: '0.875rem 0.5rem',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            color: active ? 'var(--text)' : 'var(--muted)',
                            border: 'none',
                            borderBottom: active ? `3px solid ${agentColors[agt]}` : '3px solid transparent',
                            background: active ? 'rgba(255,255,255,0.02)' : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          {agt}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ flex: 1, padding: '1rem', fontSize: '0.8125rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', color: 'rgba(248, 250, 252, 0.9)' }}>
                    {currentTurnResponses[activeTab]}
                    {currentTurnErrors[activeTab] && (
                      <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--danger)', background: 'rgba(244, 63, 94, 0.1)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.2)', fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                        <AlertCircle size={14} />
                        <span>{currentTurnErrors[activeTab]}</span>
                      </div>
                    )}
                    {!currentTurnResponses[activeTab] && !currentTurnErrors[activeTab] && (
                      <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Streaming...</span>
                    )}
                  </div>
                </div>
              )
            )}
          {/* Phase 2 reactions - shown while phase2Active or after reactions arrive */}
          {currentTurnUserMessage && !currentTurnDirectedTo && (phase2Active || Object.values(currentTurnReactions).some(r => r)) && (
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontSize: '0.7rem',
                color: phase2Active ? '#f59e0b' : 'var(--muted)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '0.5rem',
                paddingLeft: '0.25rem',
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: phase2Active ? '#f59e0b' : '#22c55e',
                }} />
                {phase2Active ? 'Agents reacting to each other...' : 'Cross-Agent Reactions'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '0.625rem' }}>
                {Object.keys(agentColors).map(agt => (
                  <div key={agt} style={{
                    background: 'var(--surface)',
                    border: `1px solid ${agentColors[agt]}22`,
                    borderRadius: '10px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      padding: '0.375rem 0.75rem',
                      background: agentBgs[agt],
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: agentColors[agt],
                      borderBottom: `1px solid ${agentColors[agt]}22`,
                    }}>
                      {agt} reacts
                    </div>
                    <div style={{
                      padding: '0.625rem 0.75rem',
                      fontSize: '0.775rem',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      color: 'rgba(248, 250, 252, 0.8)',
                    }}>
                      {currentTurnReactions[agt] || (
                        <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                          {phase2Active ? 'Reacting...' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        )}

        {/* Synthesize and Action Buttons */}
        {hasLastTurnResponses && !streaming && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            marginTop: '1.5rem',
          }}>
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
                <span>{synthesisStreaming ? 'Synthesizing...' : 'Synthesize Last Turn'}</span>
              </button>

              {cleanSynthesisText && (
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

        {!hasLastTurnResponses && !currentTurnUserMessage && (
          <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🤝</div>
            <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>No meeting messages yet</p>
            <p style={{ fontSize: '0.875rem' }}>Direct a question to the department heads below to start the boardroom alignment.</p>
          </div>
        )}

        <div ref={threadEndRef} />
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

      {/* Goal Modal */}
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>Synthesis Context</label>
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
                  {cleanSynthesisText}
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
