import { createClient } from '@/lib/supabase/server';
import { ProjectCard } from '@/components/ProjectCard';

export default async function DashboardPage() {
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
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text)' }}>Command Center</h1>
        <p style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>All projects, live from Supabase</p>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1.25rem'
      }}>
        {(projects ?? []).map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
