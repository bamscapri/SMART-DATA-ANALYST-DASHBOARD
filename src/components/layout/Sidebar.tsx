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
  Server
} from 'lucide-react';

interface MenuItem {
  id: MenuView;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const { currentView, setCurrentView, currentUser, supabaseConnected, supabaseTablesReady, darkMode, mobileMenuOpen, setMobileMenuOpen } = useApp();

  const handleSelectMenu = (id: MenuView) => {
    setCurrentView(id);
    setMobileMenuOpen(false);
  };

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'CORE PLATFORM',
      items: [
        { id: 'overview', label: 'Overview Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'upload', label: 'Upload Dataset', icon: <UploadCloud className="w-4 h-4" />, badge: 'Multi' },
        { id: 'datasets', label: 'My Datasets', icon: <Database className="w-4 h-4" /> },
        { id: 'explorer', label: 'Data Explorer', icon: <TableProperties className="w-4 h-4" /> },
      ]
    },
    {
      title: 'AI & INTELLIGENCE',
      items: [
        { id: 'ai_analyst', label: 'AI Data Analyst', icon: <BotMessageSquare className="w-4 h-4" />, badge: 'Gemini' },
        { id: 'insights', label: 'Automated Insights', icon: <Sparkles className="w-4 h-4" /> },
        { id: 'visualization', label: 'Data Visualization', icon: <PieChart className="w-4 h-4" /> },
        { id: 'forecasting', label: 'Forecasting & ML', icon: <TrendingUp className="w-4 h-4" />, badge: 'Time-Series' },
        { id: 'cleaning', label: 'Data Cleaning', icon: <Wand2 className="w-4 h-4" /> },
      ]
    },
    {
      title: 'EXECUTIVE & EXPORT',
      items: [
        { id: 'summary', label: 'Executive Summary', icon: <FileSpreadsheet className="w-4 h-4" /> },
        { id: 'reports', label: 'Reports & Export', icon: <FileText className="w-4 h-4" /> },
        { id: 'activity', label: 'Activity History', icon: <History className="w-4 h-4" /> },
      ]
    },
    {
      title: 'ENTERPRISE & ADMIN',
      items: [
        { id: 'users', label: 'User Management', icon: <Users className="w-4 h-4" />, adminOnly: true, badge: 'Admin' },
        { id: 'settings', label: 'System Settings', icon: <Settings className="w-4 h-4" /> },
        { id: 'profile', label: 'User Profile', icon: <UserCheck className="w-4 h-4" /> },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden animate-in fade-in"
        />
      )}

      <aside
        className={`w-64 flex-shrink-0 flex flex-col h-screen border-r transition-transform duration-200 z-40 fixed md:static inset-y-0 left-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${
          darkMode ? 'bg-[#081220] border-slate-800 text-slate-300' : 'bg-slate-900 border-slate-800 text-slate-300'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950/40">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 font-bold">
            <Sparkles className="w-5 h-5 text-cyan-200" />
          </div>
          <div>
            <div className="text-xs font-semibold tracking-wider text-cyan-400 uppercase">Enterprise BI</div>
            <div className="text-sm font-bold text-white tracking-tight leading-none">SMART AI ANALYST</div>
          </div>
        </div>

        {/* Nav Menu Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
          {menuSections.map((section, sIdx) => {
            const visibleItems = section.items.filter(item => !item.adminOnly || currentUser.role === 'admin');
            if (visibleItems.length === 0) return null;

            return (
              <div key={sIdx} className="space-y-1">
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400/80 mb-2">
                  {section.title}
                </div>
                {visibleItems.map(item => {
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectMenu(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 group text-left ${
                        isActive
                          ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'}>
                          {item.icon}
                        </span>
                        <span>{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-cyan-500/25 text-cyan-300'
                              : 'bg-slate-800 text-slate-400 border border-slate-700/60'
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
        </div>

        {/* Connection & Auth Status Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-md bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              <span>Database:</span>
            </div>
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                supabaseConnected && supabaseTablesReady
                  ? 'text-emerald-400'
                  : supabaseConnected
                  ? 'text-amber-400'
                  : 'text-slate-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  supabaseConnected && supabaseTablesReady
                    ? 'bg-emerald-400'
                    : supabaseConnected
                    ? 'bg-amber-400'
                    : 'bg-slate-400'
                }`}
              />
              {supabaseConnected && supabaseTablesReady
                ? 'Supabase'
                : supabaseConnected
                ? 'Supabase (Setup DB)'
                : 'Local Persistence'}
            </span>
          </div>

          {/* User Card */}
          <div className="flex items-center justify-between px-2 py-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                alt={currentUser.fullName}
                className="w-7 h-7 rounded-full object-cover ring-1 ring-cyan-500/40"
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-200 truncate">{currentUser.fullName}</div>
                <div className="flex items-center gap-1 text-[10px] text-cyan-400 font-medium">
                  <ShieldCheck className="w-3 h-3" />
                  <span className="uppercase">{currentUser.role}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleSelectMenu('profile')}
              title="Manage Profile"
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
