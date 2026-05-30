'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Copy, Check, Edit2, Shield, Calendar, Info, RefreshCw } from 'lucide-react';

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

export default function NwsContextPage() {
  const [missions, setMissions] = useState<MissionEntry[]>([]);
  const [cards, setCards] = useState<BrandCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const startEditing = (id: string, text: string) => {
    setEditingId(id);
    setEditingText(text);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingText('');
  };

  const saveEdit = async (id: string, type: 'mission' | 'card', field: string) => {
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
          } else {
            setCards((prev) =>
              prev.map((c) => (c.id === id ? { ...c, [field]: editingText.trim(), updated_by: 'user', updated_at: new Date().toISOString() } : c))
            );
          }
        }
      }
    } catch (err) {
      console.error('Error saving update:', err);
    } finally {
      setEditingId(null);
      setEditingText('');
    }
  };

  const filteredMissions = missions.filter((m) => {
    const matchesSearch =
      m.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.best_for.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVersion = selectedVersion === 'all' || m.version === selectedVersion;
    return matchesSearch && matchesVersion;
  });

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
          Mission & Brand Messaging
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: '800px' }}>
          Central source of truth for Novelty Web Solutions brand values, statements, and cards. Used dynamically by Hermes AI and our boardroom assistants to maintain perfect brand alignment.
        </p>
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            position: 'relative',
            flex: 1,
            minWidth: '280px',
          }}
        >
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--muted)',
            }}
          />
          <input
            type="text"
            placeholder="Search mission variants, keywords, best use cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '0.75rem 1rem 0.75rem 2.75rem',
              color: 'var(--text)',
              fontSize: '0.9375rem',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
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
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
        >
          {copiedId === 'all' ? <Check size={18} /> : <Copy size={18} />}
          <span>{copiedId === 'all' ? 'Copied All!' : 'Copy All'}</span>
        </button>
      </div>

      {/* Main Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--muted)' }}>
          <RefreshCw className="animate-spin" size={32} />
        </div>
      ) : (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            overflow: 'hidden',
            marginBottom: '3rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}
        >
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
                <tr
                  key={m.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.01)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '1.25rem', verticalAlign: 'top' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '999px',
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: 'var(--accent)',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                      }}
                    >
                      {m.version}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem', verticalAlign: 'top', color: 'var(--warning)', fontWeight: 500, fontSize: '0.875rem' }}>
                    {m.best_for}
                  </td>
                  <td
                    style={{ padding: '1.25rem', verticalAlign: 'top' }}
                    onDoubleClick={() => startEditing(m.id, m.message)}
                  >
                    {editingId === m.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          style={{
                            width: '100%',
                            minHeight: '120px',
                            background: 'var(--surface-2)',
                            border: '1px solid var(--accent)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            color: 'var(--text)',
                            fontFamily: 'inherit',
                            fontSize: '0.9rem',
                            outline: 'none',
                          }}
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={cancelEditing}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              padding: '0.35rem 0.75rem',
                              color: 'var(--muted)',
                              fontSize: '0.8125rem',
                              cursor: 'pointer',
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveEdit(m.id, 'mission', 'message')}
                            style={{
                              background: 'var(--accent)',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.35rem 0.75rem',
                              color: 'var(--text)',
                              fontSize: '0.8125rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ cursor: 'pointer' }}>
                        <p style={{ color: 'var(--text)', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {m.message}
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Shield size={12} /> Last edited by: <strong>{m.updated_by}</strong>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Calendar size={12} /> {new Date(m.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '1.25rem', verticalAlign: 'top', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleCopy(m.message, m.id)}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '0.5rem',
                          cursor: 'pointer',
                          color: 'var(--muted)',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent)';
                          e.currentTarget.style.color = 'var(--text)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.color = 'var(--muted)';
                        }}
                      >
                        {copiedId === m.id ? <Check size={16} style={{ color: 'var(--success)' }} /> : <Copy size={16} />}
                      </button>
                      <button
                        onClick={() => startEditing(m.id, m.message)}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '0.5rem',
                          cursor: 'pointer',
                          color: 'var(--muted)',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent)';
                          e.currentTarget.style.color = 'var(--text)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.color = 'var(--muted)';
                        }}
                      >
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

      {/* Brand Cards Grid */}
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
        Core Brand Values
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {cards.map((c) => (
          <div
            key={c.id}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)' }}>{c.title}</h3>
                <Info size={16} style={{ color: 'var(--muted)' }} />
              </div>

              {editingId === c.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--accent)',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      color: 'var(--text)',
                      fontFamily: 'inherit',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={cancelEditing}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '0.25rem 0.5rem',
                        color: 'var(--muted)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEdit(c.id, 'card', 'content')}
                      style={{
                        background: 'var(--accent)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.25rem 0.5rem',
                        color: 'var(--text)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  style={{ color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.6, cursor: 'pointer' }}
                  onDoubleClick={() => startEditing(c.id, c.content)}
                >
                  {c.content}
                </p>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '1.5rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border)',
                fontSize: '0.75rem',
                color: 'var(--muted)',
              }}
            >
              <span>By: <strong>{c.updated_by}</strong></span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  onClick={() => handleCopy(c.content, c.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--muted)',
                  }}
                >
                  {copiedId === c.id ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                </button>
                <button
                  onClick={() => startEditing(c.id, c.content)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--muted)',
                    marginLeft: '0.5rem',
                  }}
                >
                  <Edit2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
