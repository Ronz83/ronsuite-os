'use client';

import { useState, useEffect } from 'react';
import pkg from '@/package.json';

export default function SettingsPage() {
  const [bridgeUrl, setBridgeUrl] = useState('');
  const [forceCloud, setForceCloud] = useState(false);
  const [pingStatus, setPingStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [showInstructions, setShowInstructions] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState('');

  // 1. Load initial settings on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUrl = localStorage.getItem('ronsuite_bridge_url') || '';
      const storedForceCloud = localStorage.getItem('ronsuite_force_cloud') === 'true';
      setBridgeUrl(storedUrl);
      setForceCloud(storedForceCloud);
      setSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not Configured');
    }
  }, []);

  // 2. Ping bridge health whenever bridgeUrl changes (or on mount/refresh)
  useEffect(() => {
    if (!bridgeUrl) {
      setPingStatus('offline');
      return;
    }

    let isMounted = true;
    setPingStatus('checking');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    fetch(`${bridgeUrl}/health`, { signal: controller.signal, headers: { 'ngrok-skip-browser-warning': 'true' } })
      .then((res) => {
        if (!res.ok) throw new Error('Not ok');
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          if (data && data.status === 'ok') {
            setPingStatus('online');
          } else {
            setPingStatus('offline');
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setPingStatus('offline');
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [bridgeUrl]);

  // 3. Save Handlers
  const handleSaveUrl = (val: string) => {
    setBridgeUrl(val);
    localStorage.setItem('ronsuite_bridge_url', val);
  };

  const handleToggleForceCloud = (checked: boolean) => {
    setForceCloud(checked);
    localStorage.setItem('ronsuite_force_cloud', String(checked));
  };

  return (
    <div style={{ padding: '2.5rem', maxWidth: '800px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text)' }}>System Settings</h1>
        <p style={{ color: 'var(--muted)', marginTop: '0.25rem' }}>Configure local CLI bridges and manage system preferences</p>
      </div>

      {/* Main Settings Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Section 1: Bridge Settings */}
        <section style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>Bridge Settings</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Connect boardroom to your local machine for native CLI execution and Obsidian syncing</p>
          </div>

          {/* Bridge URL Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>Bridge URL</label>
              
              {/* Status Indicator Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 500 }}>
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: pingStatus === 'online' ? 'var(--success)' : pingStatus === 'checking' ? 'var(--warning)' : 'var(--danger)',
                  boxShadow: pingStatus === 'online' ? '0 0 8px var(--success)' : 'none'
                }} />
                <span style={{ color: pingStatus === 'online' ? 'var(--success)' : 'var(--muted)' }}>
                  {pingStatus === 'online' ? 'Online (Power Mode Available)' : pingStatus === 'checking' ? 'Pinging bridge...' : 'Offline (Cloud Mode fallback)'}
                </span>
              </div>
            </div>
            <input
              type="text"
              value={bridgeUrl}
              onChange={(e) => handleSaveUrl(e.target.value)}
              placeholder="e.g. https://your-ngrok-url.ngrok-free.dev"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                color: 'var(--text)',
                fontSize: '0.9375rem',
                outline: 'none',
                transition: 'border-color 0.15s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Force Cloud Mode Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 0',
            borderTop: '1px solid var(--border)'
          }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)' }}>Force Cloud Mode</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Bypass local bridge even if it is online</div>
            </div>
            
            {/* Custom Toggle Switch */}
            <label style={{
              position: 'relative',
              display: 'inline-block',
              width: '46px',
              height: '24px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={forceCloud}
                onChange={(e) => handleToggleForceCloud(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: forceCloud ? 'var(--accent)' : 'var(--border)',
                transition: '0.3s',
                borderRadius: '24px'
              }}>
                <span style={{
                  position: 'absolute',
                  content: '""',
                  height: '18px',
                  width: '18px',
                  left: forceCloud ? '24px' : '3px',
                  bottom: '3px',
                  backgroundColor: '#ffffff',
                  transition: '0.3s',
                  borderRadius: '50%'
                }} />
              </span>
            </label>
          </div>

          {/* Instructions Inline Toggle Link */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              {showInstructions ? '▼ Hide Setup Instructions' : '▶ Show Setup Instructions (bridge/README.md)'}
            </button>

            {showInstructions && (
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: 'var(--surface-2)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.825rem',
                color: 'var(--muted)',
                lineHeight: '1.6',
                overflowX: 'auto'
              }}>
                <h3 style={{ color: 'var(--text)', fontSize: '0.9rem', marginBottom: '0.5rem', fontFamily: 'var(--font-ui)' }}>RonSuite Bridge — Power Mode</h3>
                
                <h4 style={{ color: 'var(--text)', fontSize: '0.85rem', marginTop: '0.75rem', marginBottom: '0.25rem', fontFamily: 'var(--font-ui)' }}>Setup</h4>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.75rem' }}>
                  cd bridge && npm install
                </div>

                <h4 style={{ color: 'var(--text)', fontSize: '0.85rem', marginTop: '0.75rem', marginBottom: '0.25rem', fontFamily: 'var(--font-ui)' }}>Start</h4>
                <div>From the project root:</div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                  npm run bridge
                </div>
                <div>In a separate terminal:</div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.75rem' }}>
                  ngrok http 3001
                </div>

                <h4 style={{ color: 'var(--text)', fontSize: '0.85rem', marginTop: '0.75rem', marginBottom: '0.25rem', fontFamily: 'var(--font-ui)' }}>Update bridge URL</h4>
                <div>Copy the ngrok HTTPS URL into Bridge URL field above.</div>

                <h4 style={{ color: 'var(--text)', fontSize: '0.85rem', marginTop: '0.75rem', marginBottom: '0.25rem', fontFamily: 'var(--font-ui)' }}>Notes</h4>
                <ul style={{ paddingLeft: '1.2rem', fontFamily: 'var(--font-ui)', fontSize: '0.8rem' }}>
                  <li>Free ngrok URL changes on every restart — update Settings each time</li>
                  <li>Paid ngrok ($8/mo) gives a fixed subdomain</li>
                  <li>Bridge must be running for Power Mode and Obsidian sync to work</li>
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Section 2: Environment Info */}
        <section style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>Environment Information</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Read-only application and deployment constants</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Supabase Project URL</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text)', wordBreak: 'break-all' }}>{supabaseUrl}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>App Version</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>v{pkg.version}</div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
