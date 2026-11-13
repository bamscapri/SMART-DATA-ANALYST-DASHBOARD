import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { exportToCsv } from '../../utils/exportUtils';
import {
  History,
  Search,
  Download,
  Clock,
  User,
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
          <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <History className="w-5 h-5 text-[var(--color-primary)]" />
            <span>Audit Trail & Riwayat Aktivitas Sistem</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Log operasional komprehensif mencatat setiap upload file, inferensi AI, peramalan statistik, dan pembersihan dataset.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportLogs}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] font-semibold text-xs border border-[var(--border-color)] transition-theme self-start sm:self-auto whitespace-nowrap cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-[var(--color-primary)]" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-2.5" />
          <input
            type="text"
            aria-label="Cari aktivitas sistem"
            placeholder="Cari aktivitas, user, atau entitas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-caramel)]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 self-start sm:self-auto max-w-full">
          {['ALL', 'LOAD_DATASET', 'AI_QUERY', 'AI_ANALYSIS', 'RUN_FORECAST', 'DATA_CLEANING', 'UPLOAD_FILE'].map(action => (
            <button
              key={action}
              type="button"
              onClick={() => setFilterAction(action)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-theme whitespace-nowrap cursor-pointer ${
                filterAction === action
                  ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)]'
                  : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-caramel-soft)]'
              }`}
            >
              {action.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="rounded-2xl surface-card divide-y divide-[var(--border-color)] overflow-hidden">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log, index) => {
            let accentColor = 'var(--color-primary)';
            let icon = <Database className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />;

            if (log.action.includes('AI')) {
              accentColor = 'var(--accent-caramel)';
              icon = <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-caramel)' }} />;
            } else if (log.action.includes('FORECAST')) {
              accentColor = 'var(--color-warning)';
              icon = <TrendingUp className="w-4 h-4" style={{ color: 'var(--color-warning)' }} />;
            } else if (log.action.includes('CLEAN')) {
              accentColor = 'var(--color-success)';
              icon = <Wand2 className="w-4 h-4" style={{ color: 'var(--color-success)' }} />;
            }

            return (
              <div
                key={`${log.id}-${index}`}
                className="p-4 hover:bg-[var(--bg-caramel-soft)] transition-theme flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl surface-secondary shrink-0 mt-0.5">{icon}</div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[var(--text-main)]">{log.entityName}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: accentColor }}>
                        · {log.action}
                      </span>
                      <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {log.userName}
                      </span>
                    </div>

                    {log.details && (
                      <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                        {log.details}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-[var(--text-secondary)] font-mono tabular-nums flex items-center gap-1.5 shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(log.timestamp).toLocaleString('id-ID')}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
            Tidak ditemukan catatan aktivitas yang sesuai dengan filter
          </div>
        )}
      </div>
    </div>
  );
};
