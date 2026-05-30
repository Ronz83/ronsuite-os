'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Copy, Check, Edit2, Shield, Calendar, Info, RefreshCw, Folder, Tag, AlertCircle } from 'lucide-react';

interface MissionEntry {
  id: string;
  version: string;
  best_for: string;
  message: string;
  updated_at: string;
  updated_by: string;
}

interface BrandCard {
  id: string;
  title: string;
  content: string;
  updated_at: string;
  updated_by: string;
}

interface NwsProject {
  id: string;
  name: string;
  location: string;
  stage: string;
  purpose: string;
  built: string;
  missing: string;
  rating: string;
  note: string;
  next_step: string;
  updated_at: string;
  updated_by: string;
}

export default function NwsContextPage() {
  const [missions, setMissions] = useState<MissionEntry[]>([]);
  const [cards, setCards] = useState<BrandCard[]>([]);
  const [projects, setProjects] = useState<NwsProject[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [missionSearch, setMissionSearch] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('all');
  const [projectSearch, setProjectSearch] = useState('');
  const [selectedRating, setSelectedRating] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all');

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Fetch NWS context data
  async function loadData() {
    try {
      setLoading(true);
      const res = await fetch('/api/nws-context');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setMissions(json.missions || []);
          setCards(json.cards || []);
          setProjects(json.projects || []);
        }
      }
    } catch (err) {
      console.error('Failed to load NWS context:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAll = async () => {
    const text = missions
      .map((m) => `${m.version}\nBest used for: ${m.best_for}\n${m.message}`)
      .join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopiedId('all');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startEditing = (id: string, field: string, text: string) => {
    setEditingId(id);
    setEditingField(field);
    setEditingText(text);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingField(null);
    setEditingText('');
  };

  const saveEdit = async (id: string, type: 'mission' | 'card' | 'project', field: string) => {
    if (!editingText.trim()) return;
    try {
      const res = await fetch('/api/nws-context', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          type,
          field,
          value: editingText.trim(),
          agent: 'user',
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          if (type === 'mission') {
            setMissions((prev) =>
              prev.map((m) => (m.id === id ? { ...m, [field]: editingText.trim(), updated_by: 'user', updated_at: new Date().toISOString() } : m))
            );
          } else if (type === 'card') {
            setCards((prev) =>
              prev.map((c) => (c.id === id ? { ...c, [field]: editingText.trim(), updated_by: 'user', updated_at: new Date().toISOString() } : c))
            );
          } else {
            setProjects((prev) =>
              prev.map((p) => (p.id === id ? { ...p, [field]: editingText.trim(), updated_by: 'user', updated_at: new Date().toISOString() } : p))
            );
          }
        }
      }
    } catch (err) {
      console.error('Error saving update:', err);
    } finally {
      setEditingId(null);
      setEditingField(null);
      setEditingText('');
    }
  };

  // Filter functions
  const filteredMissions = missions.filter((m) => {
    const matchesSearch =
      m.version.toLowerCase().includes(missionSearch.toLowerCase()) ||
      m.best_for.toLowerCase().includes(missionSearch.toLowerCase()) ||
      m.message.toLowerCase().includes(missionSearch.toLowerCase());
    const matchesVersion = selectedVersion === 'all' || m.version === selectedVersion;
    return matchesSearch && matchesVersion;
  });

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.purpose.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.built.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.missing.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.next_step.toLowerCase().includes(projectSearch.toLowerCase());
    const matchesRating = selectedRating === 'all' || p.rating === selectedRating;
    const matchesStage = selectedStage === 'all' || p.stage === selectedStage;
    return matchesSearch && matchesRating && matchesStage;
  });

  const getTagColor = (stage: string) => {
    if (stage.includes('Active')) return { bg: 'rgba(99, 230, 222, 0.13)', color: '#63e6de', border: '1px solid rgba(99, 230, 222, 0.25)' };
    if (stage.includes('Prototype')) return { bg: 'rgba(155, 124, 255, 0.14)', color: '#ded5ff', border: '1px solid rgba(155, 124, 255, 0.25)' };
    if (stage.includes('Mockup')) return { bg: 'rgba(122, 167, 255, 0.13)', color: '#d4e1ff', border: '1px solid rgba(122, 167, 255, 0.25)' };
    if (stage.includes('Utility')) return { bg: 'rgba(247, 201, 72, 0.13)', color: '#ffe8a4', border: '1px solid rgba(247, 201, 72, 0.25)' };
    return { bg: 'rgba(97, 211, 148, 0.13)', color: '#b7f5d1', border: '1px solid rgba(97, 211, 148, 0.25)' };
  };

  const getRatingColor = (rating: string) => {
    if (rating === 'Finish') return { bg: 'rgba(97, 211, 148, 0.12)', color: '#61d394', border: '1px solid rgba(97, 211, 148, 0.24)' };
    if (rating === 'Archive') return { bg: 'rgba(244, 162, 97, 0.12)', color: '#f4a261', border: '1px solid rgba(244, 162, 97, 0.24)' };
    return { bg: 'rgba(255, 122, 144, 0.12)', color: '#ff7a90', border: '1px solid rgba(255, 122, 144, 0.24)' };
  };

  const totalProjects = filteredProjects.length;
  const finishProjects = filteredProjects.filter((p) => p.rating === 'Finish').length;
  const archiveProjects = filteredProjects.filter((p) => p.rating === 'Archive').length;
  const removeProjects = filteredProjects.filter((p) => p.rating === 'Remove').length;

  return (
    <div style={{ padding: '2.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Section */}
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: '24px',
          padding: '2.5rem',
          background: 'rgba(17, 17, 24, 0.75)',
          backdropFilter: 'blur(12px)',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '999px',
            background: 'rgba(99, 102, 241, 0.12)',
            color: 'var(--accent)',
            border: '1px solid rgba(99, 102, 241, 0.24)',
            fontSize: '0.8125rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: '1rem',
          }}
        >
          ⚡ NWS Brand Registry
        </span>
        <h1
          style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            lineHeight: 1.1,
            color: 'var(--text)',
            marginBottom: '0.75rem',
            letterSpacing: '-0.03em',
          }}
        >
          Executive Mission & Project Portfolio
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: '800px' }}>
          Central source of truth for Novelty Web Solutions brand values, statements, and project portfolio. Used dynamically by Hermes AI and our boardroom assistants to maintain perfect brand alignment.
        </p>
      </div>

      {/* Tabs list (anchors style) */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        {['Mission Statements', 'Core Brand Values', 'Project Portfolio'].map((t, idx) => (
          <a
            key={t}
            href={`#section-${idx}`}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            {t}
          </a>
        ))}
      </div>

      {/* SECTION 0: MISSION STATEMENTS */}
      <h2 id="section-0" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1rem', letterSpacing: '-0.02em', paddingTop: '1rem' }}>
        Mission Statements
      </h2>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder="Search mission variants..."
            value={missionSearch}
            onChange={(e) => setMissionSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '0.75rem 1rem 0.75rem 2.75rem',
              color: 'var(--text)',
              fontSize: '0.9375rem',
              outline: 'none',
            }}
          />
        </div>

        <select
          value={selectedVersion}
          onChange={(e) => setSelectedVersion(e.target.value)}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '0.75rem 1.5rem',
            color: 'var(--text)',
            fontSize: '0.9375rem',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Versions</option>
          {missions.map((m) => (
            <option key={m.id} value={m.version}>
              {m.version}
            </option>
          ))}
        </select>

        <button
          onClick={handleCopyAll}
          style={{
            background: 'var(--accent)',
            color: 'var(--text)',
            border: 'none',
            borderRadius: '12px',
            padding: '0.75rem 1.5rem',
            fontWeight: 600,
            fontSize: '0.9375rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {copiedId === 'all' ? <Check size={18} /> : <Copy size={18} />}
          <span>{copiedId === 'all' ? 'Copied All!' : 'Copy All'}</span>
        </button>
      </div>

      {/* Mission Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--muted)' }}>
          <RefreshCw className="animate-spin" size={32} />
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', marginBottom: '3rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1.25rem', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', width: '220px' }}>Version</th>
                <th style={{ padding: '1.25rem', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', width: '250px' }}>Best Used For</th>
                <th style={{ padding: '1.25rem', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)' }}>Message (Double-click to edit)</th>
                <th style={{ padding: '1.25rem', fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--muted)', width: '140px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMissions.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1.25rem', verticalAlign: 'top' }}>
                    <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '999px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent)', fontSize: '0.8125rem', fontWeight: 600, border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                      {m.version}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem', verticalAlign: 'top', color: 'var(--warning)', fontWeight: 500, fontSize: '0.875rem' }}>
                    {m.best_for}
                  </td>
                  <td style={{ padding: '1.25rem', verticalAlign: 'top' }} onDoubleClick={() => startEditing(m.id, 'message', m.message)}>
                    {editingId === m.id && editingField === 'message' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          style={{ width: '100%', minHeight: '120px', background: 'var(--surface-2)', border: '1px solid var(--accent)', borderRadius: '8px', padding: '0.75rem', color: 'var(--text)', fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none' }}
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button onClick={cancelEditing} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.35rem 0.75rem', color: 'var(--muted)', fontSize: '0.8125rem', cursor: 'pointer' }}>Cancel</button>
                          <button onClick={() => saveEdit(m.id, 'mission', 'message')} style={{ background: 'var(--accent)', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', color: 'var(--text)', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>Save</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ cursor: 'pointer' }}>
                        <p style={{ color: 'var(--text)', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.message}</p>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Shield size={12} /> Last edited: <strong>{m.updated_by}</strong></span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={12} /> {new Date(m.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '1.25rem', verticalAlign: 'top', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleCopy(m.message, m.id)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', color: 'var(--muted)' }}>
                        {copiedId === m.id ? <Check size={16} style={{ color: 'var(--success)' }} /> : <Copy size={16} />}
                      </button>
                      <button onClick={() => startEditing(m.id, 'message', m.message)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', color: 'var(--muted)' }}>
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SECTION 1: CORE BRAND VALUES */}
      <h2 id="section-1" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1rem', letterSpacing: '-0.02em', paddingTop: '1rem' }}>
        Core Brand Values
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {cards.map((c) => (
          <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)' }}>{c.title}</h3>
                <Info size={16} style={{ color: 'var(--muted)' }} />
              </div>
              {editingId === c.id && editingField === 'content' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    style={{ width: '100%', minHeight: '80px', background: 'var(--surface-2)', border: '1px solid var(--accent)', borderRadius: '8px', padding: '0.5rem', color: 'var(--text)', fontFamily: 'inherit', fontSize: '0.875rem', outline: 'none' }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button onClick={cancelEditing} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.25rem 0.5rem', color: 'var(--muted)', fontSize: '0.75rem', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => saveEdit(c.id, 'card', 'content')} style={{ background: 'var(--accent)', border: 'none', borderRadius: '6px', padding: '0.25rem 0.5rem', color: 'var(--text)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Save</button>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.6, cursor: 'pointer' }} onDoubleClick={() => startEditing(c.id, 'content', c.content)}>
                  {c.content}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--muted)' }}>
              <span>By: <strong>{c.updated_by}</strong></span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button onClick={() => handleCopy(c.content, c.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                  {copiedId === c.id ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                </button>
                <button onClick={() => startEditing(c.id, 'content', c.content)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)', marginLeft: '0.5rem' }}>
                  <Edit2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SECTION 2: PROJECT PORTFOLIO */}
      <h2 id="section-2" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1rem', letterSpacing: '-0.02em', paddingTop: '1rem' }}>
        Project Portfolio
      </h2>

      {/* Project metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
          <strong style={{ fontSize: '1.75rem', color: 'var(--text)', display: 'block' }}>{totalProjects}</strong>
          <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>Visible Projects</span>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
          <strong style={{ fontSize: '1.75rem', color: '#61d394', display: 'block' }}>{finishProjects}</strong>
          <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>Finish Candidates</span>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
          <strong style={{ fontSize: '1.75rem', color: '#f4a261', display: 'block' }}>{archiveProjects}</strong>
          <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>Archive Candidates</span>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
          <strong style={{ fontSize: '1.75rem', color: '#ff7a90', display: 'block' }}>{removeProjects}</strong>
          <span style={{ fontSize: '0.8125rem', color: 'var(--muted)' }}>Remove Candidates</span>
        </div>
      </div>

      {/* Project Filters toolbar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder="Search projects, features, missing, or next steps..."
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '0.75rem 1rem 0.75rem 2.75rem',
              color: 'var(--text)',
              fontSize: '0.9375rem',
              outline: 'none',
            }}
          />
        </div>

        <select
          value={selectedRating}
          onChange={(e) => setSelectedRating(e.target.value)}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '0.75rem 1.5rem',
            color: 'var(--text)',
            fontSize: '0.9375rem',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Ratings</option>
          <option value="Finish">Finish</option>
          <option value="Archive">Archive</option>
          <option value="Remove">Remove</option>
        </select>

        <select
          value={selectedStage}
          onChange={(e) => setSelectedStage(e.target.value)}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '0.75rem 1.5rem',
            color: 'var(--text)',
            fontSize: '0.9375rem',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Stages</option>
          <option value="Active Development">Active Development</option>
          <option value="Nearly Complete Application">Nearly Complete Application</option>
          <option value="Substantial Prototype">Substantial Prototype</option>
          <option value="Completed Utility Script">Completed Utility Script</option>
          <option value="Initial Boilerplate">Initial Boilerplate</option>
          <option value="Design Assets Hub">Design Assets Hub</option>
          <option value="Stitch Design Mockup">Stitch Design Mockup</option>
        </select>
      </div>

      {/* Projects Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted)', width: '220px' }}>Project</th>
              <th style={{ padding: '1rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted)', width: '180px' }}>Stage</th>
              <th style={{ padding: '1rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted)' }}>Purpose (Double-click to edit)</th>
              <th style={{ padding: '1rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted)' }}>Built</th>
              <th style={{ padding: '1rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted)' }}>Missing</th>
              <th style={{ padding: '1rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted)', width: '140px' }}>Rating</th>
              <th style={{ padding: '1rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--muted)' }}>Next Step</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((p) => {
              const stageStyle = getTagColor(p.stage);
              const ratingStyle = getRatingColor(p.rating);

              return (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                  <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <strong style={{ color: 'var(--text)' }}>{p.name}</strong>
                      <small style={{ color: 'var(--muted)', fontSize: '0.75rem', wordBreak: 'break-all' }}>{p.location}</small>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                    <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', borderRadius: '6px', background: stageStyle.bg, color: stageStyle.color, border: stageStyle.border, fontSize: '0.75rem', fontWeight: 600 }}>
                      {p.stage}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', verticalAlign: 'top' }} onDoubleClick={() => startEditing(p.id, 'purpose', p.purpose)}>
                    {editingId === p.id && editingField === 'purpose' ? (
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onBlur={() => saveEdit(p.id, 'project', 'purpose')}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(p.id, 'project', 'purpose')}
                        style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--accent)', borderRadius: '6px', padding: '0.5rem', color: 'var(--text)', outline: 'none' }}
                        autoFocus
                      />
                    ) : (
                      <span style={{ color: 'var(--text)', cursor: 'pointer' }}>{p.purpose}</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', verticalAlign: 'top' }} onDoubleClick={() => startEditing(p.id, 'built', p.built)}>
                    {editingId === p.id && editingField === 'built' ? (
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onBlur={() => saveEdit(p.id, 'project', 'built')}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(p.id, 'project', 'built')}
                        style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--accent)', borderRadius: '6px', padding: '0.5rem', color: 'var(--text)', outline: 'none' }}
                        autoFocus
                      />
                    ) : (
                      <span style={{ color: 'var(--muted)', cursor: 'pointer' }}>{p.built}</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', verticalAlign: 'top' }} onDoubleClick={() => startEditing(p.id, 'missing', p.missing)}>
                    {editingId === p.id && editingField === 'missing' ? (
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onBlur={() => saveEdit(p.id, 'project', 'missing')}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(p.id, 'project', 'missing')}
                        style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--accent)', borderRadius: '6px', padding: '0.5rem', color: 'var(--text)', outline: 'none' }}
                        autoFocus
                      />
                    ) : (
                      <span style={{ color: 'var(--muted)', cursor: 'pointer' }}>{p.missing}</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', borderRadius: '6px', background: ratingStyle.bg, color: ratingStyle.color, border: ratingStyle.border, fontSize: '0.75rem', fontWeight: 600, textAlign: 'center', width: 'max-content' }}>
                        {p.rating}
                      </span>
                      <small style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{p.note}</small>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', verticalAlign: 'top' }} onDoubleClick={() => startEditing(p.id, 'next_step', p.next_step)}>
                    {editingId === p.id && editingField === 'next_step' ? (
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onBlur={() => saveEdit(p.id, 'project', 'next_step')}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(p.id, 'project', 'next_step')}
                        style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--accent)', borderRadius: '6px', padding: '0.5rem', color: 'var(--text)', outline: 'none' }}
                        autoFocus
                      />
                    ) : (
                      <span style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}>{p.next_step}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
