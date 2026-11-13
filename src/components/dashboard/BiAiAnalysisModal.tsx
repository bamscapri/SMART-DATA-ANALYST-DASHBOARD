import React from 'react';
import { BiAiInsightsPayload } from '../../utils/biDashboard';
import { Sparkles, X, TrendingUp, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

interface BiAiAnalysisModalProps {
  isOpen: boolean;
  isLoading: boolean;
  insights: BiAiInsightsPayload | null;
  liveNarrative: string | null;
  focusLabel?: string | null;
  onClose: () => void;
  onOpenFullAnalyst: () => void;
}

export const BiAiAnalysisModal: React.FC<BiAiAnalysisModalProps> = ({
  isOpen,
  isLoading,
  insights,
  liveNarrative,
  focusLabel,
  onClose,
  onOpenFullAnalyst,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Hasil Analisis AI Dashboard"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="fixed inset-0 bg-[#211C19]/65 backdrop-blur-xs" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl max-h-[86vh] flex flex-col rounded-2xl surface-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-[var(--bg-primary-soft)] text-[var(--color-primary)] shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[var(--text-main)] truncate">
                AI Executive Analytics Brief{focusLabel ? ` — ${focusLabel}` : ''}
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)] truncate tabular-nums">
                {insights
                  ? `${insights.datasetName} · ${insights.filteredRowCount} / ${insights.totalRowCount} records terfilter`
                  : 'Menganalisis data aktual dashboard...'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Panel AI"
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-caramel-soft)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {isLoading && (
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center gap-3 text-[var(--text-main)]">
              <div className="w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin shrink-0" />
              <span>Menghubungkan ringkasan metrik terfilter ke AI Data Analyst...</span>
            </div>
          )}

          {insights && (
            <>
              {/* Performance & Trend Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)]/70 border border-[var(--border-color)] space-y-1">
                  <div className="text-[11px] font-bold text-[var(--color-primary)]">Performance Summary</div>
                  <p className="text-[var(--text-main)] leading-relaxed">{insights.performanceSummary}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)]/70 border border-[var(--border-color)] space-y-1">
                  <div className="text-[11px] font-bold text-[var(--color-primary)] flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Trend Analysis</span>
                  </div>
                  <p className="text-[var(--text-main)] leading-relaxed">{insights.trendAnalysis}</p>
                </div>
              </div>

              {/* Key Insights */}
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-caramel-soft)]/45 space-y-2">
                <div className="font-bold text-[var(--text-main)]">Key Insights (Data Aktual)</div>
                <ul className="space-y-1.5 list-disc pl-4 text-[var(--text-main)]">
                  {insights.keyInsights.map((item, i) => (
                    <li key={i} className="leading-relaxed">{item}</li>
                  ))}
                </ul>
              </div>

              {/* Anomalies & Significant Changes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-1.5">
                  <div className="font-bold text-[var(--color-warning)] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Anomaly Detection (IQR)</span>
                  </div>
                  {insights.anomalyDetection.map((a, i) => (
                    <p key={i} className="text-[var(--text-main)] leading-relaxed">{a}</p>
                  ))}
                </div>

                <div className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-1.5">
                  <div className="font-bold text-[var(--color-primary)]">Significant Changes</div>
                  {insights.significantChanges.length > 0 ? (
                    insights.significantChanges.map((c, i) => (
                      <p key={i} className="text-[var(--text-main)] leading-relaxed">{c}</p>
                    ))
                  ) : (
                    <p className="text-[var(--text-secondary)]">Memerlukan minimal 2 periode untuk perbandingan perubahan.</p>
                  )}
                </div>
              </div>

              {/* Business Recommendations */}
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-success-soft)]/55 space-y-2">
                <div className="font-bold flex items-center gap-1.5" style={{ color: 'var(--color-success)' }}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Business Recommendations</span>
                </div>
                <ul className="space-y-1.5 list-disc pl-4 text-[var(--text-main)]">
                  {insights.recommendedActions.map((rec, i) => (
                    <li key={i} className="leading-relaxed">{rec}</li>
                  ))}
                </ul>
              </div>

              {/* Optional Live Gemini Narrative */}
              {liveNarrative && (
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-2">
                  <div className="text-[11px] font-bold text-[var(--color-primary)]">
                    Sintesis Lanjutan AI Data Analyst
                  </div>
                  <div className="whitespace-pre-wrap text-[var(--text-main)] leading-relaxed">
                    {liveNarrative}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-color)] bg-[var(--bg-card)] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-xs font-medium text-[var(--text-main)] cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFullAnalyst();
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--text-on-primary)] text-xs font-semibold cursor-pointer"
          >
            <span>Lanjutkan Diskusi di AI Data Analyst</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
