import React from 'react';
import { useApp, MenuView } from '../../context/AppContext';
import {
  LayoutDashboard,
  UploadCloud,
  Database,
  TableProperties,
  BotMessageSquare,
  Sparkles,
  PieChart,
  TrendingUp,
  Wand2,
  FileSpreadsheet,
  FileText,
  History,
  Users,
  Settings,
  UserCheck,
  ChevronRight,
  ShieldCheck,
  Server,
  X
} from 'lucide-react';

interface MenuItem {
  id: MenuView;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    currentUser,
    supabaseConnected,
    supabaseTablesReady,
    mobileMenuOpen,
    setMobileMenuOpen
  } = useApp();

  const handleSelectMenu = (id: MenuView) => {
    setCurrentView(id);
    setMobileMenuOpen(false);
  };

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Core Platform',
      items: [
        { id: 'overview', label: 'Overview Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'upload', label: 'Upload Dataset', icon: <UploadCloud className="w-4 h-4" />, badge: 'Multi' },
        { id: 'datasets', label: 'My Datasets', icon: <Database className="w-4 h-4" /> },
        { id: 'explorer', label: 'Data Explorer', icon: <TableProperties className="w-4 h-4" /> }
      ]
    },
    {
      title: 'AI & Intelligence',
      items: [
        { id: 'ai_analyst', label: 'AI Data Analyst', icon: <BotMessageSquare className="w-4 h-4" />, badge: 'Gemini' },
        { id: 'insights', label: 'Automated Insights', icon: <Sparkles className="w-4 h-4" /> },
        { id: 'visualization', label: 'Data Visualization', icon: <PieChart className="w-4 h-4" /> },
        { id: 'forecasting', label: 'Forecasting & ML', icon: <TrendingUp className="w-4 h-4" />, badge: 'CI 95%' },
        { id: 'cleaning', label: 'Data Cleaning', icon: <Wand2 className="w-4 h-4" /> }
      ]
    },
    {
      title: 'Executive & Export',
      items: [
        { id: 'summary', label: 'Executive Summary', icon: <FileSpreadsheet className="w-4 h-4" /> },
        { id: 'reports', label: 'Reports & Export', icon: <FileText className="w-4 h-4" /> },
        { id: 'activity', label: 'Activity History', icon: <History className="w-4 h-4" /> }
      ]
    },
    {
      title: 'Enterprise & Admin',
      items: [
        { id: 'users', label: 'User Management', icon: <Users className="w-4 h-4" />, adminOnly: true, badge: 'Admin' },
        { id: 'settings', label: 'System Settings', icon: <Settings className="w-4 h-4" /> },
        { id: 'profile', label: 'User Profile', icon: <UserCheck className="w-4 h-4" /> }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-[#211C19]/60 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      <aside
        aria-label="Navigasi Utama"
        className={`w-64 flex-shrink-0 flex flex-col h-screen border-r border-[var(--border-color)] bg-[var(--bg-sidebar)] text-[var(--text-main)] transition-transform duration-200 transition-theme z-40 fixed md:static inset-y-0 left-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-sidebar)] transition-theme">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--accent-caramel)] flex items-center justify-center text-[var(--text-on-primary)] shadow-sm shrink-0">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold tracking-wider text-[var(--color-primary)] uppercase truncate">
                Enterprise BI
              </div>
              <div className="text-sm font-bold tracking-tight leading-tight text-[var(--text-main)] truncate">
                SMART AI ANALYST
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Tutup Menu Navigasi"
            className="p-1.5 rounded-lg md:hidden text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-caramel-soft)] transition-theme"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav Menu Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {menuSections.map((section, sIdx) => {
            const visibleItems = section.items.filter(item => !item.adminOnly || currentUser.role === 'admin');
            if (visibleItems.length === 0) return null;

            return (
              <div key={sIdx} className="space-y-1">
                <div className="px-3 text-[11px] font-semibold tracking-wide text-[var(--text-secondary)] mb-1.5">
                  {section.title}
                </div>
                {visibleItems.map(item => {
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectMenu(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-theme group text-left cursor-pointer ${
                        isActive
                          ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)] shadow-xs font-semibold'
                          : 'text-[var(--text-main)]/85 hover:text-[var(--text-main)] hover:bg-[var(--bg-caramel-soft)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`shrink-0 ${
                            isActive
                              ? 'text-[var(--text-on-primary)]'
                              : 'text-[var(--color-primary)] group-hover:text-[var(--text-main)]'
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span className="truncate whitespace-nowrap">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[10px] font-medium shrink-0 ml-2 ${
                            isActive
                              ? 'text-[var(--text-on-primary)]/85'
                              : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Connection & Auth Status Footer */}
        <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)] space-y-2.5 transition-theme">
          <div className="flex items-center justify-between text-[11px] px-2.5 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] transition-theme">
            <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <Server className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span>Database</span>
            </div>
            <span
              className="inline-flex items-center gap-1 font-semibold"
              style={{
                color:
                  supabaseConnected && supabaseTablesReady
                    ? 'var(--color-success)'
                    : supabaseConnected
                    ? 'var(--color-warning)'
                    : 'var(--text-secondary)'
              }}
            >
              {supabaseConnected && supabaseTablesReady
                ? 'Supabase'
                : supabaseConnected
                ? 'Setup DB'
                : 'Local Storage'}
            </span>
          </div>

          {/* User Card */}
          <div className="flex items-center justify-between px-2.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] transition-theme">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={currentUser.avatarUrl || '/src/assets/images/avatar_admin_1794548316205.jpg'}
                alt={currentUser.fullName}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover ring-1 ring-[var(--accent-caramel)] shrink-0 bg-[var(--bg-secondary)]"
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate text-[var(--text-main)]">
                  {currentUser.fullName}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--color-primary)] font-semibold">
                  <ShieldCheck className="w-3 h-3 shrink-0" />
                  <span className="uppercase">{currentUser.role}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSelectMenu('profile')}
              aria-label="Kelola Profil Pengguna"
              title="Kelola Profil"
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-caramel-soft)] transition-theme cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
