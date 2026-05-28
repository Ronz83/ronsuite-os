import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function ProjectsPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from('projects')
    .select(`
      id, name, slug, description, status, color, created_at,
      tasks(count),
      goals(count)
    `)
    .order('created_at', { ascending: true });

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1200px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text)' }}>Projects Portfolio</h1>
        <p style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>Overview of all tracked projects and status</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {(projects ?? []).map(project => {
          const taskCount = project.tasks?.[0]?.count ?? 0;
          const goalCount = project.goals?.[0]?.count ?? 0;

          return (
            <div
              key={project.id}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.5rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '4px', height: '40px', background: project.color, borderRadius: '2px' }} />
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)' }}>{project.name}</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{project.description}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
                  <span>📋 <strong>{taskCount}</strong> tasks</span>
                  <span>🎯 <strong>{goalCount}</strong> goals</span>
                </div>

                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.25rem 0.75rem',
                    borderRadius: '20px',
                    background: `${project.color}15`,
                    color: project.color,
                    textTransform: 'uppercase',
                  }}
                >
                  {project.status}
                </span>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Link
                    href={`/chat?project=${project.slug}`}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'rgba(99, 102, 241, 0.1)',
                      color: 'var(--accent)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      transition: 'background 0.2s',
                    }}
                  >
                    Discuss
                  </Link>
                  <Link
                    href={`/projects/${project.id}`}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'var(--surface-2)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      transition: 'background 0.2s',
                    }}
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
