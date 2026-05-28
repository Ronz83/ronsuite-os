'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { NewGoalModal } from '@/components/NewGoalModal';
import Link from 'next/link';

interface Goal {
  id: string;
  project_id: string;
  agent_id: string | null;
  title: string;
  description: string | null;
  status: string;
  turn_budget: number;
  turns_used: number;
  blocker: string | null;
  created_at: string;
  projects: {
    name: string;
    slug: string;
    color: string;
  } | null;
  agents: {
    name: string;
    role: string;
    avatar_color: string;
  } | null;
}

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

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: goalsData } = await supabase
        .from('goals')
        .select(`
          id, project_id, agent_id, title, description, status, turn_budget, turns_used, blocker, created_at,
          projects (name, slug, color),
          agents (name, role, avatar_color)
        `)
        .order('created_at', { ascending: false });

      const { data: projectsData } = await supabase.from('projects').select('id, name, slug').order('name');
      const { data: agentsData } = await supabase.from('agents').select('id, name, role').eq('enabled', true).order('name');

      setGoals((goalsData as any) || []);
      setProjects(projectsData || []);
      setAgents(agentsData || []);
    } catch (err) {
      console.error('Error fetching goals page data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus(goalId: string, newStatus: string, goalTitle: string) {
    try {
      const { error } = await supabase
        .from('goals')
        .update({ status: newStatus })
        .eq('id', goalId);

      if (error) throw error;

      // Update state
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, status: newStatus } : g));

      // Trigger push notification if status is blocked or complete
      if (newStatus === 'blocked' || newStatus === 'complete') {
        const title = newStatus === 'blocked' ? 'Goal Blocked ⚠️' : 'Goal Complete 🎉';
        const body = `"${goalTitle}" is now marked as ${newStatus}`;
        await fetch('/api/push/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, body, url: '/goals' })
        });
      }
    } catch (err) {
      console.error('Error updating goal status:', err);
      alert('Failed to update status');
    }
  }

  // Group goals by status
  const activeGoals = goals.filter(g => g.status === 'active');
  const queuedGoals = goals.filter(g => g.status === 'queued');
  const blockedGoals = goals.filter(g => g.status === 'blocked');
  const completeGoals = goals.filter(g => g.status === 'complete');

  const statusSections = [
    { title: 'Active', list: activeGoals, color: 'var(--success)' },
    { title: 'Queued', list: queuedGoals, color: 'var(--accent)' },
    { title: 'Blocked', list: blockedGoals, color: 'var(--danger)' },
    { title: 'Complete', list: completeGoals, color: 'var(--muted)' },
  ];

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text)' }}>Standing Goals</h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>View, track, and prompt autonomous agent goals</p>
        </div>
        <NewGoalModal projects={projects} agents={agents} />
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '4rem' }}>
          Loading goals...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {statusSections.map(section => {
            if (section.list.length === 0) return null;

            return (
              <div key={section.title} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: section.color }} />
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)' }}>
                    {section.title} Goals ({section.list.length})
                  </h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                  {section.list.map(goal => {
                    const percent = Math.min(100, Math.round((goal.turns_used / goal.turn_budget) * 100)) || 0;

                    return (
                      <div
                        key={goal.id}
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '14px',
                          padding: '1.5rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '1.25rem',
                        }}
                      >
                        <div>
                          {/* Goal Title */}
                          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
                            {goal.title}
                          </h3>

                          {/* Metadata Row */}
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            {/* Project Badge */}
                            {goal.projects && (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  background: `${goal.projects.color}15`,
                                  color: goal.projects.color,
                                  border: `1px solid ${goal.projects.color}33`,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                }}
                              >
                                {goal.projects.name}
                              </span>
                            )}

                            {/* Agent Badge */}
                            {goal.agents && (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  background: 'rgba(99, 102, 241, 0.1)',
                                  color: 'var(--accent)',
                                  border: '1px solid rgba(99, 102, 241, 0.2)',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                }}
                              >
                                👤 {goal.agents.name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Turn Budget Progress */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted)' }}>
                            <span>Turns Used: {goal.turns_used} / {goal.turn_budget}</span>
                            <span>{percent}%</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'var(--surface-2)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${percent}%`,
                                height: '100%',
                                background: percent > 85 ? 'var(--danger)' : percent > 60 ? 'var(--warning)' : 'var(--accent)',
                                borderRadius: '3px',
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                          {/* Status Selector Dropdown */}
                          <select
                            value={goal.status}
                            onChange={(e) => handleUpdateStatus(goal.id, e.target.value, goal.title)}
                            style={{
                              background: 'var(--surface-2)',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              color: section.color,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '4px 8px',
                              cursor: 'pointer',
                              outline: 'none',
                              textTransform: 'uppercase',
                              fontFamily: 'var(--font-ui)',
                            }}
                          >
                            <option value="active">Active</option>
                            <option value="queued">Queued</option>
                            <option value="blocked">Blocked</option>
                            <option value="complete">Complete</option>
                          </select>

                          <Link
                            href={`/chat?goal_id=${goal.id}`}
                            style={{
                              padding: '0.45rem 1rem',
                              background: 'var(--surface-2)',
                              color: 'var(--text)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              textDecoration: 'none',
                              fontSize: '0.8125rem',
                              fontWeight: 500,
                              transition: 'all 0.2s',
                            }}
                          >
                            Open in Chat →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && goals.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 0', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎯</div>
          <p style={{ fontWeight: 500, color: 'var(--text)', marginBottom: '0.25rem' }}>No goals logged yet</p>
          <p style={{ fontSize: '0.875rem' }}>Create a goal to instruct your agents to coordinate multi-step tasks.</p>
        </div>
      )}
    </div>
  );
}
