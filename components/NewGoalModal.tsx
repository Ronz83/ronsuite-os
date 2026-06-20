'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface Agent {
  id: string;
  name: string;
  role: string;
}

interface NewGoalModalProps {
  projects: Project[];
  agents: Agent[];
}

export function NewGoalModal({ projects, agents }: NewGoalModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [turnBudget, setTurnBudget] = useState(20);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !projectId || !agentId) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('goals').insert({
        title: title.trim(),
        project_id: projectId,
        agent_id: agentId,
        turn_budget: turnBudget,
        status: 'queued',
      });

      if (error) throw error;

      setTitle('');
      setProjectId('');
      setAgentId('');
      setTurnBudget(20);
      setIsOpen(false);
      
      // Refresh the page to reload the server component data
      router.refresh();
    } catch (err) {
      console.error('Error creating goal:', err);
      alert('Failed to create goal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="btn-metallic"
        onClick={() => setIsOpen(true)}
        style={{
          backgroundColor: 'var(--accent)',
          color: '#ffffff',
          borderRadius: '10px',
          padding: '0.625rem 1.25rem',
          fontWeight: 600,
          fontFamily: 'var(--font-ui)',
        }}
      >
        + New Goal
      </button>

      {isOpen && (
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
            position: 'relative'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)', marginBottom: '1.5rem' }}>Create New Goal</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>Goal Title / Prompt</label>
                <input
                  type="text"
                  placeholder="e.g. Design the Caricom Business directories layout"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  autoFocus
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
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
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
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>Assigned Agent</label>
                <select
                  value={agentId}
                  onChange={e => setAgentId(e.target.value)}
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
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.role})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>Turn Budget</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={turnBudget}
                  onChange={e => setTurnBudget(parseInt(e.target.value) || 20)}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
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
                  className="btn-metallic"
                  type="submit"
                  disabled={loading}
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: '#ffffff',
                    borderRadius: '8px',
                    padding: '0.625rem 1.25rem',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  {loading ? 'Saving...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
