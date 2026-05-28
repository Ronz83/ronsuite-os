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

export function ProjectCard({ project }: { project: Project }) {
  const taskCount = project.tasks?.[0]?.count ?? 0;
  const goalCount = project.goals?.[0]?.count ?? 0;

  return (
    <Link href={`/chat?project=${project.slug}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '14px', overflow: 'hidden', cursor: 'pointer',
        transition: 'border-color 0.15s, transform 0.15s',
        display: 'flex', flexDirection: 'column'
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

        <div style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>{project.name}</h3>
            <span style={{
              fontSize: '0.75rem', fontWeight: 500, padding: '0.2rem 0.6rem',
              borderRadius: '6px', background: `${project.color}22`, color: project.color
            }}>{project.status}</span>
          </div>

          {project.description && (
            <p style={{
              color: 'var(--muted)', fontSize: '0.8125rem', lineHeight: 1.5,
              marginBottom: '1rem', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
            }}>{project.description}</p>
          )}

          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem', color: 'var(--muted)' }}>
            <span>📋 {taskCount} tasks</span>
            <span>🎯 {goalCount} goals</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
