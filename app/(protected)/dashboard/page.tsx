'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ProjectCard } from '@/components/ProjectCard';
import { Plus, X, AlertTriangle } from 'lucide-react';
import { AgentGrid } from '@/components/AgentGrid';

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

const COLOR_PRESETS = [
  { name: 'Blue', value: '#0052cc' },
  { name: 'Teal', value: '#00875a' },
  { name: 'Orange', value: '#ffab00' },
  { name: 'Purple', value: '#403294' },
  { name: 'Red', value: '#de350b' },
];

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#0052cc');
  const [status, setStatus] = useState<'active' | 'paused' | 'archived'>('active');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, name, slug, description, status, color, created_at,
          tasks(count),
          goals(count)
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setProjects((data as any[]) || []);
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleNameChange = (val: string) => {
    setName(val);
    if (modalMode === 'add') {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(generatedSlug);
    }
  };

  const handleOpenAdd = () => {
    setModalMode('add');
    setEditingProjectId(null);
    setName('');
    setSlug('');
    setDescription('');
    setColor('#0052cc');
    setStatus('active');
    setIsOpen(true);
  };

  const handleOpenEdit = (project: Project) => {
    setModalMode('edit');
    setEditingProjectId(project.id);
    setName(project.name);
    setSlug(project.slug);
    setDescription(project.description || '');
    setColor(project.color);
    setStatus(project.status as any);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setSaving(true);
    try {
      if (modalMode === 'add') {
        const { error } = await supabase.from('projects').insert({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          color,
          status,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('projects')
          .update({
            name: name.trim(),
            slug: slug.trim(),
            description: description.trim() || null,
            color,
            status,
          })
          .eq('id', editingProjectId);
        if (error) throw error;
      }

      setIsOpen(false);
      await loadProjects();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingProjectId) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete this project? All associated tasks and goals will be permanently deleted.`
    );
    if (!confirmDelete) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', editingProjectId);

      if (error) throw error;

      setIsOpen(false);
      await loadProjects();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to delete project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1400px', margin: '0 auto', background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>Command Center</h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.375rem', fontSize: '1rem' }}>System orchestration and live status</p>
        </div>
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)', marginBottom: '1.25rem' }}>Active Agents</h2>
      <AgentGrid />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', marginTop: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)' }}>Project Pipeline</h2>
        <button
          className="btn-metallic"
          onClick={handleOpenAdd}
          style={{
            backgroundColor: 'var(--accent)',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '0.625rem 1.25rem',
            fontWeight: 600,
            fontFamily: 'var(--font-ui)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Plus size={18} className="icon-float" />
          <span>New Project</span>
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '4rem' }}>
          Loading projects...
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.25rem'
        }}>
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={() => handleOpenEdit(project)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
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
            position: 'relative',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          }}>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)', marginBottom: '1.5rem' }}>
              {modalMode === 'add' ? 'Add New Project' : 'Edit Project'}
            </h3>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>Project Name</label>
                <input
                  type="text"
                  placeholder="e.g. Caricom Business"
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
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
                <label style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>Slug</label>
                <input
                  type="text"
                  placeholder="e.g. caricom-business"
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
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
                <label style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>Description</label>
                <textarea
                  placeholder="Brief description of the project scope..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '0.625rem 0.875rem',
                    color: 'var(--text)',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'var(--font-ui)',
                  }}
                />
              </div>

              {/* Status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
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
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Color Presets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8125rem', color: 'var(--muted)', fontWeight: 500 }}>Theme Color</label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.25rem' }}>
                  {COLOR_PRESETS.map(preset => {
                    const selected = color.toLowerCase() === preset.value.toLowerCase();
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setColor(preset.value)}
                        title={preset.name}
                        className="metallic-badge"
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: preset.value,
                          cursor: 'pointer',
                          transform: selected ? 'scale(1.2)' : 'scale(1)',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                          padding: 0,
                          outline: selected ? `3px solid ${preset.value}` : 'none',
                          outlineOffset: '2px',
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                {modalMode === 'edit' ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    style={{
                      background: 'rgba(244, 63, 94, 0.1)',
                      border: '1px solid rgba(244, 63, 94, 0.2)',
                      color: 'var(--danger)',
                      borderRadius: '8px',
                      padding: '0.625rem 1.25rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-ui)',
                    }}
                  >
                    Delete
                  </button>
                ) : <div />}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={saving}
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
                    disabled={saving}
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: '#ffffff',
                      borderRadius: '8px',
                      padding: '0.625rem 1.25rem',
                      fontWeight: 600,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-ui)',
                    }}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
