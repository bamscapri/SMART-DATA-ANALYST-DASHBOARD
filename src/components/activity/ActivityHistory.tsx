import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { exportToCsv } from '../../utils/exportUtils';
import {
  History,
  Search,
  Filter,
  Download,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  Database,
  Sparkles,
  TrendingUp,
  Wand2
} from 'lucide-react';

export const ActivityHistory: React.FC = () => {
  const { activityLogs, addToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  const filteredLogs = activityLogs.filter(log => {
    const matchesSearch =
      log.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = filterAction === 'ALL' || log.action === filterAction;
    return matchesSearch && matchesFilter;
  });

  const handleExportLogs = () => {
    exportToCsv(filteredLogs, 'audit_activity_history.csv');
    addToast('success', 'Riwayat Aktivitas Diekspor', 'File audit CSV telah diunduh.');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            Audit Trail & Riwayat Aktivitas Sistem
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Log operasional komprehensif mencatat setiap upload file, inferensi AI, peramalan statistik, dan pembersihan dataset.
          </p>
        </div>

        <button
          onClick={handleExportLogs}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari aktivitas, user, atau entitas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none self-start sm:self-auto">
          {['ALL', 'LOAD_DATASET', 'AI_QUERY', 'AI_ANALYSIS', 'RUN_FORECAST', 'DATA_CLEANING', 'UPLOAD_FILE'].map(action => (
            <button
              key={action}
              onClick={() => setFilterAction(action)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                filterAction === action
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {action.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 divide-y divide-slate-800 shadow-xl overflow-hidden">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log, index) => {
            let badgeClass = 'bg-blue-500/20 text-blue-300';
            let icon = <Database className="w-4 h-4 text-blue-400" />;

            if (log.action.includes('AI')) {
              badgeClass = 'bg-cyan-500/20 text-cyan-300';
              icon = <Sparkles className="w-4 h-4 text-cyan-400" />;
            } else if (log.action.includes('FORECAST')) {
              badgeClass = 'bg-amber-500/20 text-amber-300';
              icon = <TrendingUp className="w-4 h-4 text-amber-400" />;
            } else if (log.action.includes('CLEAN')) {
              badgeClass = 'bg-purple-500/20 text-purple-300';
              icon = <Wand2 className="w-4 h-4 text-purple-400" />;
            }

            return (
              <div key={`${log.id}-${index}`} className="p-4 hover:bg-slate-800/40 transition flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex-shrink-0 mt-0.5">
                    {icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white">{log.entityName}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${badgeClass}`}>
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {log.userName}
                      </span>
                    </div>

                    {log.details && (
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {log.details}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 flex-shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(log.timestamp).toLocaleString('id-ID')}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-xs text-slate-400">
            Tidak ditemukan catatan aktivitas yang sesuai dengan filter
          </div>
        )}
      </div>
    </div>
  );
};
