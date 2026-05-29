'use client';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  color: string;
  created_at: string;
  tasks: { count: number }[] | null;
  goals: { count: number }[] | null;
}

interface ProjectCardProps {
  project: Project;
  onEdit?: () => void;
}

export function ProjectCard({ project, onEdit }: ProjectCardProps) {
  const taskCount = project.tasks?.[0]?.count ?? 0;
  const goalCount = project.goals?.[0]?.count ?? 0;

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <Link href={`/chat?project=${project.slug}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '14px', overflow: 'hidden', cursor: 'pointer',
          transition: 'border-color 0.15s, transform 0.15s',
          display: 'flex', flexDirection: 'column', height: '100%'
        }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = project.color;
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
          }}
        >
          {/* Color bar */}
          <div style={{ height: '4px', background: project.color }} />

          <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', paddingRight: onEdit ? '2.5rem' : '0' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>{project.name}</h3>
              </div>
              
              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.5rem',
                  borderRadius: '6px', background: `${project.color}15`, color: project.color,
                  border: `1px solid ${project.color}33`,
                  textTransform: 'uppercase',
                }}>{project.status}</span>
              </div>

              {project.description && (
                <p style={{
                  color: 'var(--muted)', fontSize: '0.8125rem', lineHeight: 1.5,
                  marginBottom: '1rem', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                }}>{project.description}</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem', color: 'var(--muted)', marginTop: 'auto' }}>
              <span>📋 {taskCount} tasks</span>
              <span>🎯 {goalCount} goals</span>
            </div>
          </div>
        </div>
      </Link>

      {onEdit && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            color: 'var(--muted)',
            padding: '3px 8px',
            fontSize: '0.75rem',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--text)';
            e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--muted)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          Edit
        </button>
      )}
    </div>
  );
}
