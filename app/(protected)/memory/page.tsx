'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Memory {
  id: string;
  title: string;
  content: string;
  tags: string[];
  project_id: string | null;
  source: string;
  created_at: string;
  projects?: {
    name: string;
    slug: string;
    color: string;
  } | null;
}

interface Project {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [allTags, setAllTags] = useState<string[]>([]);

  // Add Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [projectIdInput, setProjectIdInput] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Edit Inline State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTagsInput, setEditTagsInput] = useState('');
  const [editProjectIdInput, setEditProjectIdInput] = useState('');

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
        .select('id, name, slug, color')
        .order('name');
      setProjects(projectsData || []);

      // Fetch memories
      const { data: memoriesData, error } = await supabase
        .from('memory')
        .select(`
          id, title, content, tags, project_id, source, created_at,
          projects (name, slug, color)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemories((memoriesData as any) || []);

      // Extract unique tags
      const tagsSet = new Set<string>();
      memoriesData?.forEach(m => {
        if (Array.isArray(m.tags)) {
          m.tags.forEach(t => tagsSet.add(t));
        }
      });
      setAllTags(Array.from(tagsSet));
    } catch (err) {
      console.error('Error fetching memories:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    // Parse comma-separated tags
    const tagsArray = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    try {
      const { error } = await supabase.from('memory').insert({
        title: title.trim(),
        content: content.trim(),
        tags: tagsArray,
        project_id: projectIdInput || null,
        source: 'manual',
      });

      if (error) throw error;

      // Reset form
      setTitle('');
      setContent('');
      setTagsInput('');
      setProjectIdInput('');
      setShowAddForm(false);

      // Refresh list
      await fetchData();
    } catch (err) {
      console.error('Error creating memory:', err);
    }
  }

  async function handleUpdate(id: string) {
    if (!editTitle.trim() || !editContent.trim()) return;

    const tagsArray = editTagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    try {
      const { error } = await supabase
        .from('memory')
        .update({
          title: editTitle.trim(),
          content: editContent.trim(),
          tags: tagsArray,
          project_id: editProjectIdInput || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      setEditingId(null);
      await fetchData();
    } catch (err) {
      console.error('Error updating memory:', err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this memory record?')) return;

    try {
      const { error } = await supabase.from('memory').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error('Error deleting memory:', err);
    }
  }

  function startEditing(memory: Memory) {
    setEditingId(memory.id);
    setEditTitle(memory.title);
    setEditContent(memory.content);
    setEditTagsInput((memory.tags || []).join(', '));
    setEditProjectIdInput(memory.project_id || '');
  }

  // Filter logic
  const filteredMemories = memories.filter(memory => {
    const matchesProject =
      selectedProjectFilter === 'all' || memory.project_id === selectedProjectFilter;
    const matchesTag =
      selectedTagFilter === 'all' || (memory.tags && memory.tags.includes(selectedTagFilter));
    return matchesProject && matchesTag;
  });

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text)' }}>Shared Memory Graph</h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>Core knowledge and context shared across all agents</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            background: showAddForm ? 'var(--surface)' : 'var(--accent)',
            color: 'var(--text)',
            border: showAddForm ? '1px solid var(--border)' : 'none',
            borderRadius: '10px',
            padding: '0.625rem 1.25rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
            transition: 'all 0.2s',
          }}
        >
          {showAddForm ? 'Cancel' : '+ Add Memory'}
        </button>
      </div>

      {/* Add Memory Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreate}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <h3 style={{ fontWeight: 600, color: 'var(--text)' }}>New Memory Record</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>Title</label>
              <input
                type="text"
                placeholder="e.g. Project Architecture Standards"
                value={title}
                onChange={e => setTitle(e.target.value)}
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
              <label style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>Project (Optional)</label>
              <select
                value={projectIdInput}
                onChange={e => setProjectIdInput(e.target.value)}
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
                <option value="">None (Global Memory)</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>Content</label>
            <textarea
              placeholder="Provide the context details and instructions..."
              value={content}
              onChange={e => setContent(e.target.value)}
              required
              rows={4}
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.625rem 0.875rem',
                color: 'var(--text)',
                fontSize: '0.9375rem',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'var(--font-ui)',
                lineHeight: 1.5,
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>Tags (comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. standards, database, cb-connect"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
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

          <button
            type="submit"
            style={{
              alignSelf: 'flex-start',
              background: 'var(--accent)',
              color: 'var(--text)',
              border: 'none',
              borderRadius: '8px',
              padding: '0.625rem 1.25rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            Save to Brain
          </button>
        </form>
      )}

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '0.875rem', color: 'var(--muted)', fontWeight: 500 }}>Filters:</span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Project</label>
          <select
            value={selectedProjectFilter}
            onChange={e => setSelectedProjectFilter(e.target.value)}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '0.375rem 0.75rem',
              color: 'var(--text)',
              fontSize: '0.8125rem',
              outline: 'none',
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

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Tag</label>
          <select
            value={selectedTagFilter}
            onChange={e => setSelectedTagFilter(e.target.value)}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '0.375rem 0.75rem',
              color: 'var(--text)',
              fontSize: '0.8125rem',
              outline: 'none',
            }}
          >
            <option value="all">All Tags</option>
            {allTags.map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Memory List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>Loading memory graph…</div>
      ) : filteredMemories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🧠</div>
          <p style={{ fontWeight: 500, color: 'var(--text)', marginBottom: '0.25rem' }}>No memory records found</p>
          <p style={{ fontSize: '0.875rem' }}>Create your first memory record to share context with AI agents.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredMemories.map(memory => {
            const isEditing = editingId === memory.id;

            return (
              <div
                key={memory.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  transition: 'border-color 0.2s',
                }}
              >
                {isEditing ? (
                  // Editing UI
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        style={{
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '0.5rem 0.75rem',
                          color: 'var(--text)',
                          fontFamily: 'var(--font-ui)',
                        }}
                      />
                      <select
                        value={editProjectIdInput}
                        onChange={e => setEditProjectIdInput(e.target.value)}
                        style={{
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '0.5rem 0.75rem',
                          color: 'var(--text)',
                          fontFamily: 'var(--font-ui)',
                        }}
                      >
                        <option value="">None (Global Memory)</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      rows={4}
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '0.5rem 0.75rem',
                        color: 'var(--text)',
                        fontFamily: 'var(--font-ui)',
                        lineHeight: 1.5,
                      }}
                    />

                    <input
                      type="text"
                      value={editTagsInput}
                      onChange={e => setEditTagsInput(e.target.value)}
                      placeholder="comma-separated tags"
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '0.5rem 0.75rem',
                        color: 'var(--text)',
                        fontFamily: 'var(--font-ui)',
                      }}
                    />

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleUpdate(memory.id)}
                        style={{
                          background: 'var(--success)',
                          color: 'var(--text)',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.5rem 1rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          color: 'var(--text)',
                          borderRadius: '6px',
                          padding: '0.5rem 1rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // Standard Display UI
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text)' }}>
                          {memory.title}
                        </h3>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          {/* Project Badge */}
                          {memory.projects && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                background: `${memory.projects.color}15`,
                                color: memory.projects.color,
                                border: `1px solid ${memory.projects.color}33`,
                                padding: '2px 8px',
                                borderRadius: '4px',
                              }}
                            >
                              {memory.projects.name}
                            </span>
                          )}

                          {/* Source badge */}
                          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: '4px' }}>
                            {memory.source}
                          </span>

                          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                            {new Date(memory.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => startEditing(memory)}
                          style={{
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            color: 'var(--muted)',
                            borderRadius: '6px',
                            padding: '0.375rem 0.75rem',
                            cursor: 'pointer',
                            fontSize: '0.8125rem',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(memory.id)}
                          style={{
                            background: 'rgba(244,63,94,0.1)',
                            border: '1px solid rgba(244,63,94,0.2)',
                            color: 'var(--danger)',
                            borderRadius: '6px',
                            padding: '0.375rem 0.75rem',
                            cursor: 'pointer',
                            fontSize: '0.8125rem',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <p style={{ color: 'var(--text)', fontSize: '0.9375rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {memory.content}
                    </p>

                    {memory.tags && memory.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                        {memory.tags.map(tag => (
                          <span
                            key={tag}
                            style={{
                              fontSize: '0.75rem',
                              background: 'var(--surface-2)',
                              color: 'var(--muted)',
                              border: '1px solid var(--border)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
