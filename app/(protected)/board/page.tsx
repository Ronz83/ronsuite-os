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
    <div style={{ padding: '2.5rem', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Board Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexShrink: 0, flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text)' }}>Operations Board</h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>Track and manage active task states across codebases</p>
        </div>

        {/* Project Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ fontSize: '0.875rem', color: 'var(--muted)', fontWeight: 500 }}>Project:</label>
          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              color: 'var(--text)',
              fontSize: '0.875rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban Grid */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
          Loading operations board…
        </div>
      ) : (
        <div
          className="board-grid"
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1.25rem',
            overflow: 'hidden',
            minHeight: 0, // critical for nested flex scroll
          }}
        >
          {COLUMNS.map(col => {
            const columnTasks = filteredTasks.filter(t => t.status === col.id);

            return (
              <div
                key={col.id}
                className="board-column"
                style={{
                  background: 'rgba(17, 17, 24, 0.6)',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '100%',
                  overflow: 'hidden',
                }}
              >
                {/* Column Title */}
                <div
                  style={{
                    padding: '1.25rem',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--surface)',
                  }}
                >
                  <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {col.label}
                  </h2>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: 'var(--surface-2)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      color: 'var(--muted)',
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
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  {columnTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => handleCycleStatus(task)}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        position: 'relative',
                        padding: '1rem 1rem 1rem 1.25rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        transition: 'border-color 0.15s, transform 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--accent)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      {/* Priority left color bar */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '4px',
                          background: getPriorityColor(task.priority),
                        }}
                      />

                      {/* Title */}
                      <h4 style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)', lineHeight: 1.4 }}>
                        {task.title}
                      </h4>

                      {/* Goal Link */}
                      {task.goal_id && task.goals && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--warning)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          🎯 Goal: {task.goals.title}
                        </div>
                      )}

                      {/* Badges footer */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {/* Project Badge */}
                        {task.projects && (
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              background: `${task.projects.color}15`,
                              color: task.projects.color,
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {task.projects.name}
                          </span>
                        )}

                        {/* Created By Badge */}
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            color: 'var(--muted)',
                            background: 'var(--surface-2)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            textTransform: 'capitalize',
                          }}
                        >
                          {task.created_by}
                        </span>
                      </div>
                    </div>
                  ))}

                  {columnTasks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--muted)', fontSize: '0.8125rem', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                      Column is empty
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
