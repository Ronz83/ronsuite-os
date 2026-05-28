export default function ProjectPage({ params }: { params: { id: string } }) {
  return (
    <div style={{ padding: '2.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Project</h1>
      <p style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>Project detail coming in Phase 2. ID: {params.id}</p>
    </div>
  );
}
