'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const NAV = [
  { href: '/dashboard', icon: '⬛', label: 'Dashboard' },
  { href: '/hermes', icon: '🤖', label: 'Hermes' },
  { href: '/chat', icon: '💬', label: 'Chat' },
  { href: '/boardroom', icon: '🤝', label: 'Boardroom' },
  { href: '/meeting-copilot', icon: '📞', label: 'Meeting Copilot' },
  { href: '/projects', icon: '🗂', label: 'Projects' },
  { href: '/goals', icon: '🎯', label: 'Goals' },
  { href: '/board', icon: '📋', label: 'Board' },
  { href: '/memory', icon: '🧠', label: 'Memory' },
  { href: '/openhuman', icon: '👤', label: 'OpenHuman' },
  { href: '/nws-context', icon: '⚡', label: 'NWS Context' },
  { href: '/onboarding', icon: '🚀', label: 'Onboarding Hub' },
  { href: '/settings', icon: '⚙️', label: 'Settings' },
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
    <aside className="app-sidebar" style={{
      width: '220px', minHeight: '100vh', background: 'var(--surface)',
      borderRight: '1px solid var(--border)', display: 'flex',
      flexDirection: 'column', padding: '1.25rem 0', flexShrink: 0
    }}>
      {/* Logo */}
      <div className="sidebar-logo" style={{ padding: '0 1.25rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'var(--accent)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '1rem'
          }}>⚡</div>
          <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text)' }}>RonSuite OS</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 0.75rem' }}>
        {NAV.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.625rem 0.75rem', borderRadius: '8px',
              color: active ? 'var(--text)' : 'var(--muted)',
              background: active ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              textDecoration: 'none', fontSize: '0.9rem', fontWeight: active ? 600 : 400,
              transition: 'all 0.15s'
            }}>
              <span style={{ fontSize: '1rem' }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="sidebar-signout" style={{ padding: '0 0.75rem' }}>
        <button onClick={signOut} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.625rem 0.75rem', borderRadius: '8px',
          color: 'var(--muted)', background: 'transparent', border: 'none',
          fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-ui)',
          transition: 'color 0.15s'
        }}>
          <span>↩</span> Sign out
        </button>
      </div>
    </aside>
  );
}
