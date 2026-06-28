'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const NAV_GROUPS = [
  {
    title: 'Platform',
    items: [
      { href: '/dashboard', icon: '⬛', label: 'Dashboard' },
      { href: '/hermes', icon: '🤖', label: 'Head Master' },
    ]
  },
  {
    title: 'Operations',
    items: [
      { href: '/board', icon: '📋', label: 'Board' },
    ]
  },
  {
    title: 'Projects',
    items: [
      { href: '/businesses-os', icon: '🌐', label: 'NWS OS' },
    ]
  },
  {
    title: 'Knowledge',
    items: [
      { href: '/memory', icon: '🧠', label: 'Memory' },
    ]
  },
  {
    title: 'System',
    items: [
      { href: '/settings', icon: '⚙️', label: 'Settings' },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  return (
    <aside className="app-sidebar metallic-blue" style={{
      width: '220px', minHeight: '100vh',
      display: 'flex', flexDirection: 'column', padding: '1.25rem 0', flexShrink: 0
    }}>
      {/* Logo */}
      <div className="sidebar-logo" style={{ padding: '0 1.25rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div className="metallic-badge icon-float" style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.22)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
          }}>⚡</div>
          <span style={{
            fontWeight: 700, fontSize: '0.9375rem', color: '#ffffff',
            textShadow: '0 1px 3px rgba(0,0,0,0.4)'
          }}>RonSuite OS</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0', padding: '0 0.75rem', overflowY: 'auto' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} style={{ marginBottom: '1.25rem' }}>
            <div style={{
              fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em',
              color: '#ffffff', padding: '0 0.75rem',
              marginBottom: '0.375rem', textTransform: 'uppercase',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}>
              {group.title}
            </div>
            {group.items.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? 'sidebar-active-item' : ''}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.5625rem 0.75rem', borderRadius: '8px',
                    color: '#ffffff',
                    background: active ? undefined : 'transparent',
                    textDecoration: 'none', fontSize: '0.875rem',
                    fontWeight: active ? 600 : 500,
                    transition: 'all 0.18s',
                    border: active ? undefined : '1px solid transparent',
                    textShadow: active ? '0 1px 3px rgba(0,0,0,0.4)' : 'none',
                    marginBottom: '1px',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.1)';
                      (e.currentTarget as HTMLAnchorElement).style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                      (e.currentTarget as HTMLAnchorElement).style.color = '#ffffff';
                    }
                  }}
                >
                  <span className="icon-float" style={{ fontSize: '0.9375rem', lineHeight: 1 }}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Sign out */}
      <div className="sidebar-signout" style={{ padding: '0 0.75rem' }}>
        <button
          onClick={signOut}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.625rem 0.75rem', borderRadius: '8px',
            color: '#ffffff', background: 'transparent',
            border: '1px solid transparent',
            fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-ui)',
            transition: 'all 0.18s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.borderColor = 'transparent';
          }}
        >
          <span className="icon-float">↩</span> Sign out
        </button>
      </div>
    </aside>
  );
}
