'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  FolderOpen, Link2, Shield, Eye, HelpCircle, Save, Check, RefreshCw 
} from 'lucide-react';

export default function OpenHumanPage() {
  const [context, setContext] = useState<any>(null);
  const [vaultPath, setVaultPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [vaultStatus, setVaultStatus] = useState<'checking' | 'active' | 'empty'>('checking');

  const supabase = createClient();

  useEffect(() => {
    fetchContext();
  }, []);

  const fetchContext = async () => {
    try {
      const res = await fetch('/api/hermes/context');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.context) {
          setContext(data.context);
          const currentPath = data.context.raw_intake?.openhuman?.vault_path || '';
          setVaultPath(currentPath);
          
          if (currentPath) {
            setVaultStatus('active');
          } else {
            setVaultStatus('empty');
          }
        }
      }
    } catch (err) {
      console.error('Failed to load context:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context) return;
    
    setSaving(true);
    setSaveStatus('idle');

    try {
      const updatedRawIntake = {
        ...(context.raw_intake || {}),
        openhuman: {
          vault_path: vaultPath.trim()
        }
      };

      const res = await fetch('/api/hermes/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_intake: updatedRawIntake
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setContext(data.context);
          setSaveStatus('success');
          setVaultStatus(vaultPath.trim() ? 'active' : 'empty');
          setTimeout(() => setSaveStatus('idle'), 3000);
        } else {
          setSaveStatus('error');
        }
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <p style={{ marginTop: '1rem', color: 'var(--muted)', fontSize: '0.875rem' }}>Loading integration context...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2.5rem', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px',
          background: 'rgba(99, 102, 241, 0.15)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'
        }}>
          <FolderOpen size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text)' }}>OpenHuman Sync</h1>
          <p style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>Ingest personal context, OAuth feeds, and memories from your local OpenHuman vault</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Status Indicator */}
        <section style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>Integration Status</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
              {vaultStatus === 'active' 
                ? `Syncing from local vault path: ${vaultPath}` 
                : 'No memory vault configured. Enter the local path below to sync.'}
            </p>
          </div>
          <span style={{
            fontSize: '0.75rem', fontWeight: 600, padding: '0.35rem 0.75rem', borderRadius: '20px',
            background: vaultStatus === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
            color: vaultStatus === 'active' ? 'var(--success)' : 'var(--danger)',
            display: 'flex', alignItems: 'center', gap: '0.25rem'
          }}>
            {vaultStatus === 'active' ? <Check size={12} /> : null}
            {vaultStatus === 'active' ? 'Linked & Active' : 'Not Configured'}
          </span>
        </section>

        {/* Configuration Panel */}
        <section style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem',
          display: 'flex', flexDirection: 'column', gap: '1.5rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>Local Memory Path</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              OpenHuman generates an Obsidian-compatible markdown directory. Specify the absolute directory path of the OpenHuman output folder.
            </p>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>Obsidian Vault / Memory Path</label>
              <input
                type="text"
                value={vaultPath}
                onChange={e => setVaultPath(e.target.value)}
                placeholder="e.g. C:\Users\Ronald\openhuman\memory"
                style={{
                  background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px',
                  padding: '0.75rem 1rem', color: 'var(--text)', fontSize: '0.9375rem', outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', alignItems: 'center' }}>
              {saveStatus === 'success' && (
                <span style={{ fontSize: '0.85rem', color: 'var(--success)' }}>✓ Path successfully saved to context!</span>
              )}
              {saveStatus === 'error' && (
                <span style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>Failed to save. Please try again.</span>
              )}
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px',
                  padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.375rem', transition: 'opacity 0.2s'
                }}
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                Save Configuration
              </button>
            </div>
          </form>
        </section>

        {/* Informational Panel */}
        <section style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem',
          display: 'flex', flexDirection: 'column', gap: '1.25rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>How the Integration Works</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Leverage OpenHuman connectors directly within RonSuite OS</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', marginBottom: '0.5rem' }}>
                <Link2 size={16} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>1. Connect Accounts</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: '1.4' }}>
                Link your Gmail, Notion, Slack, and calendars inside OpenHuman desktop app via one-click local OAuth.
              </p>
            </div>

            <div style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', marginBottom: '0.5rem' }}>
                <Shield size={16} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>2. Local Processing</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: '1.4' }}>
                OpenHuman fetches, compresses, and compiles your logs into clean Obsidian Markdown files saved on your computer.
              </p>
            </div>

            <div style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ea580c', marginBottom: '0.5rem' }}>
                <Eye size={16} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>3. Hermes Ingestion</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: '1.4' }}>
                Hermes references the synced markdown files using local filesystem tools, inheriting full workspace context.
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
