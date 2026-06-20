'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Task {
  id: string;
  project_id: string;
  goal_id: string | null;
  title: string;
  notes: string | null;
  status: string;
  priority: number;
  created_by: string;
  created_at: string;
  projects: {
    name: string;
    slug: string;
    color: string;
  } | null;
  goals?: {
    title: string;
  } | null;
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

const COLUMNS = [
  { id: 'queued', label: 'Queued', color: 'var(--muted)' },
  { id: 'active', label: 'Active', color: 'var(--success)' },
  { id: 'blocked', label: 'Blocked', color: 'var(--danger)' },
  { id: 'complete', label: 'Complete', color: 'var(--muted)' },
];

export default function BoardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState<string>('all');

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name, slug')
        .order('name');
      setProjects(projectsData || []);

      // Fetch tasks
      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select(`
          id, project_id, goal_id, title, notes, status, priority, created_by, created_at,
          projects (name, slug, color),
          goals (title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks((tasksData as any) || []);
    } catch (err) {
      console.error('Error fetching board tasks:', err);
    } finally {
      setLoading(false);
    }
  }

  // Cycle status function: queued -> active -> blocked -> complete -> queued
  async function handleCycleStatus(task: Task) {
    const statusCycle: Record<string, string> = {
      queued: 'active',
      active: 'blocked',
      blocked: 'complete',
      complete: 'queued',
    };

    const nextStatus = statusCycle[task.status] || 'queued';

    // Optimistically update state
    setTasks(prev =>
      prev.map(t => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    try {
      const updateData: Record<string, any> = { status: nextStatus };
      if (nextStatus === 'complete') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', task.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating task status:', err);
      // Revert state on error
      setTasks(prev =>
        prev.map(t => (t.id === task.id ? { ...t, status: task.status } : t))
      );
      alert('Failed to update task status');
    }
  }

  // Filter tasks based on project selection
  const filteredTasks = tasks.filter(task => {
    return projectFilter === 'all' || task.project_id === projectFilter;
  });

  // Helper for priority color bar (1 = red, 2 = amber, 3 = green)
  function getPriorityColor(priority: number) {
    if (priority === 1) return 'var(--danger)'; // Red
    if (priority === 2) return 'var(--warning)'; // Amber
    return 'var(--success)'; // Green
  }

  return (
    <div style={{ padding: '2.5rem', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--background)' }}>
      {/* Board Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexShrink: 0, flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Operations Board</h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.5rem', fontSize: '1rem' }}>Track and manage active task states across codebases</p>
        </div>

        {/* Project Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ fontSize: '0.875rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project</label>
          <div style={{ position: 'relative' }}>
            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              style={{
                appearance: 'none',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '0.6rem 2.5rem 0.6rem 1.25rem',
                color: 'var(--text)',
                fontSize: '0.875rem',
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'}
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--muted)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Grid */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', animation: 'pulse 2s infinite ease-in-out' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontWeight: 500 }}>Loading operations...</span>
          </div>
          <style>{`
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
          `}</style>
        </div>
      ) : (
        <div
          className="board-grid"
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1.5rem',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          {COLUMNS.map(col => {
            const columnTasks = filteredTasks.filter(t => t.status === col.id);

            return (
              <div
                key={col.id}
                className="board-column"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.04)',
                  borderRadius: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '100%',
                  overflow: 'hidden',
                  transition: 'transform 0.3s ease',
                }}
              >
                {/* Column Title */}
                <div
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--surface)',
                  }}
                >
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '-0.01em' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color, boxShadow: `0 0 8px ${col.color}` }} />
                    {col.label}
                  </h2>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: 'var(--surface-2)',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      color: 'var(--text)',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column Cards (Scrollable list) */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  {columnTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => handleCycleStatus(task)}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        position: 'relative',
                        padding: '1.25rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.875rem',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--accent)';
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.06), 0 4px 8px rgba(0,0,0,0.04)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)';
                      }}
                    >
                      {/* Priority top color bar */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          right: 0,
                          height: '4px',
                          background: getPriorityColor(task.priority),
                          opacity: 0.8,
                        }}
                      />

                      {/* Title */}
                      <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, marginTop: '4px' }}>
                        {task.title}
                      </h4>

                      {/* Goal Link */}
                      {task.goal_id && task.goals && (
                        <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {task.goals.title}
                          </span>
                        </div>
                      )}

                      {/* Badges footer */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {/* Project Badge */}
                        {task.projects && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: `${task.projects.color}1A`,
                              color: task.projects.color,
                              padding: '4px 8px',
                              borderRadius: '6px',
                              letterSpacing: '0.02em',
                            }}
                          >
                            {task.projects.name}
                          </span>
                        )}

                        {/* Created By Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 'bold' }}>
                            {task.created_by.charAt(0).toUpperCase()}
                          </div>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 500,
                              color: 'var(--muted)',
                              textTransform: 'capitalize',
                            }}
                          >
                            {task.created_by}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {columnTasks.length === 0 && (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '3rem 1rem', 
                      color: 'var(--muted)', 
                      fontSize: '0.875rem', 
                      fontWeight: 500,
                      background: 'var(--surface)',
                      border: '2px dashed var(--border)', 
                      borderRadius: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.75rem',
                      animation: 'float 6s ease-in-out infinite'
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                        <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8"/>
                      </svg>
                      No tasks yet
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
