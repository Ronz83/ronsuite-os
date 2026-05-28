import { Sidebar } from '@/components/Sidebar';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout-container">
      <Sidebar />
      <main className="layout-main">{children}</main>
    </div>
  );
}
