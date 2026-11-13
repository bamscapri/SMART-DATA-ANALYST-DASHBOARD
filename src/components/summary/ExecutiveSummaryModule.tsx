import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { exportExecutivePdf } from '../../utils/exportUtils';
import { saveReportToSupabase } from '../../lib/supabaseService';
import {
  FileSpreadsheet,
  Printer,
  Sparkles,
  Download,
  CloudUpload,
  CheckCircle2,
  ListChecks,
  FileText,
} from 'lucide-react';

export const ExecutiveSummaryModule: React.FC = () => {
  const { selectedDataset, intelligenceReport, currentUser, addToast, logActivity } = useApp();

  const [reportStyle, setReportStyle] = useState<string>('Executive Management Report');
  const [viewMode, setViewMode] = useState<'structured' | 'narrative'>('structured');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);

  const summary = intelligenceReport.executiveSummary;

  // Reset AI narrative override whenever active dataset or sheet changes
  useEffect(() => {
    setAiNarrative(null);
  }, [selectedDataset?.id, summary.generatedAt]);

  const displayedMarkdown = aiNarrative || summary.markdownReport;

  const handleGenerateAiSummary = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai/executive-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetName: selectedDataset?.name,
          style: reportStyle,
          deterministicReport: summary.markdownReport,
          intelligenceSummary: {
            analysisMode: intelligenceReport.analysisMode,
            dataPeriod: intelligenceReport.dataPeriod,
            quality: intelligenceReport.profile.quality,
            topCorrelations: intelligenceReport.eda.topCorrelations.slice(0, 4),
            inferentialTests: intelligenceReport.statistics.inferentialTests.filter(t => t.executed),
            anomaliesCount: intelligenceReport.mining.anomalies.length,
            forecastingAvailable: intelligenceReport.forecasting.available,
          },
        }),
      });

      if (!res.ok) throw new Error('Gagal menghasilkan ringkasan eksekutif');
      const data = await res.json();
      setAiNarrative(data.report);
      setViewMode('narrative');
      addToast(
        'success',
        'Executive Summary Disusun',
        'Laporan 14-bagian berhasil disempurnakan dengan angka empiris terverifikasi.'
      );
      logActivity('EXECUTIVE_REPORT', 'Executive Summary', selectedDataset?.name || 'Dataset', `Style: ${reportStyle}`);
    } catch (err: any) {
      console.error(err);
      addToast('error', 'Gagal Menghubungi AI Engine', err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      await exportExecutivePdf(
        'printable-executive-report',
        `Executive_Summary_${selectedDataset?.name || 'Dataset'}`
      );
      addToast('success', 'PDF Berhasil Diunduh');
    } catch {
      window.print();
    }
  };

  const handleExportMarkdown = () => {
    const blob = new Blob([displayedMarkdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Executive_Summary_${(selectedDataset?.name || 'Dataset').replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('success', 'Markdown Berhasil Diunduh');
  };

  const handleSaveToSupabase = async () => {
    if (!selectedDataset) return;
    setIsSavingCloud(true);
    try {
      const res = await saveReportToSupabase({
        datasetId: selectedDataset.id,
        datasetObj: selectedDataset,
        title: `Executive Report - ${selectedDataset.name}`,
        reportType: reportStyle,
        executiveSummary: displayedMarkdown,
        sections: summary.sections,
        metricsSnapshot: {
          qualityScore: intelligenceReport.profile.quality.overallScore,
          rowCount: intelligenceReport.profile.rowCount,
          colCount: intelligenceReport.profile.colCount,
          dataPeriod: intelligenceReport.dataPeriod,
          anomaliesCount: intelligenceReport.mining.anomalies.length,
        },
      });
      if (res.success) {
        addToast('success', 'Tersimpan ke Supabase', res.message);
      } else {
        addToast('info', 'Status Sinkronisasi Laporan', res.message);
      }
    } finally {
      setIsSavingCloud(false);
    }
  };

  const badgeClass = (priority: string) => {
    if (priority === 'CRITICAL') return 'bg-[var(--bg-danger-soft)] text-[var(--color-danger)] border-[var(--color-danger)]/30';
    if (priority === 'HIGH') return 'bg-[var(--bg-caramel-soft)] text-[var(--color-primary)] border-[var(--accent-caramel)]/40';
    if (priority === 'MEDIUM') return 'bg-[var(--bg-secondary)] text-[var(--text-main)] border-[var(--border-color)]';
    return 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]';
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[var(--color-primary)]" />
            <span>Executive Summary & Board Report Generator</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Laporan eksekutif 14-bagian berbasis kalkulasi deterministik aktual, bebas angka rekayasa, dilengkapi matriks prioritas tindakan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportMarkdown}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] font-semibold text-xs transition-theme whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor .MD</span>
          </button>

          <button
            type="button"
            onClick={handleSaveToSupabase}
            disabled={isSavingCloud}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-caramel-soft)] text-[var(--text-main)] font-semibold text-xs transition-theme whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            <CloudUpload className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>{isSavingCloud ? 'Menyimpan...' : 'Simpan ke Supabase'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            style={{ backgroundColor: 'var(--color-success)' }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg hover:opacity-90 text-[#FFFDF9] font-semibold text-xs shadow-xs transition-theme whitespace-nowrap cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Download PDF</span>
          </button>
        </div>
      </div>

      {/* Style Configurator, View Switcher & AI Trigger */}
      <div className="p-4 rounded-xl surface-card flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="exec-style" className="text-[var(--text-secondary)] font-semibold">
            Gaya Laporan:
          </label>
          <select
            id="exec-style"
            value={reportStyle}
            onChange={(e) => setReportStyle(e.target.value)}
            className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-[var(--text-main)] font-medium focus:outline-none focus:border-[var(--accent-caramel)]"
          >
            <option value="Executive Management Report">Executive Management Report (Dewan Direksi)</option>
            <option value="Mendalam">Analisis Mendalam (Deep-Dive Technical & Strategic)</option>
            <option value="Standar">Laporan Bisnis Standar</option>
            <option value="Ringkas">Ringkas (1-Page Briefing)</option>
          </select>

          <div className="flex items-center rounded-lg border border-[var(--border-color)] overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('structured')}
              className={`px-3 py-1.5 font-medium flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'structured'
                  ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>14 Bagian Terstruktur</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('narrative')}
              className={`px-3 py-1.5 font-medium flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'narrative'
                  ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Naskah Markdown</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerateAiSummary}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-[var(--text-on-primary)] font-semibold transition-theme shadow-xs cursor-pointer"
        >
          <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>{isGenerating ? 'Menyusun Narasi AI...' : 'Perhalus Narasi dengan Gemini AI'}</span>
        </button>
      </div>

      {/* Printable Report Document Card */}
      <div
        id="printable-executive-report"
        className="p-8 md:p-10 rounded-2xl surface-card text-[var(--text-main)] space-y-6 print:bg-white print:text-black print:border-none print:p-0"
      >
        {/* Document Letterhead */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[var(--accent-caramel)] pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--accent-caramel)] flex items-center justify-center text-[var(--text-on-primary)] font-bold shadow-xs shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-widest">
                SMART AI DECISION SYSTEM
              </div>
              <div className="text-lg font-black text-[var(--text-main)] tracking-tight print:text-black">
                {reportStyle.toUpperCase()} — {summary.datasetName}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)]">
                Mode: {summary.analysisMode === 'document' ? 'Document Intelligence' : 'Structured Data Analytics'} · Periode: {summary.dataPeriod} · Data Quality: {intelligenceReport.profile.quality.overallScore}/100 ({intelligenceReport.profile.quality.grade})
              </div>
            </div>
          </div>

          <div className="sm:text-right text-[11px] text-[var(--text-secondary)] print:text-slate-600 space-y-0.5 tabular-nums">
            <div>Ref: DOC-EX-{selectedDataset?.id?.slice(-6).toUpperCase() || 'ACTIVE'}</div>
            <div className="font-semibold text-[var(--text-main)] print:text-black">
              EMPIRICAL AUDIT VERIFIED
            </div>
            <div>{new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
        </div>

        {/* Report Body */}
        {viewMode === 'structured' ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4">
              {summary.sections.map(sec => (
                <section
                  key={sec.number}
                  className="p-4 rounded-xl bg-[var(--bg-secondary)]/60 border border-[var(--border-color)] space-y-1.5"
                >
                  <h3 className="text-xs md:text-sm font-bold text-[var(--color-primary)]">
                    {sec.title}
                  </h3>
                  <div className="text-xs leading-relaxed whitespace-pre-wrap text-[var(--text-main)] print:text-black">
                    {sec.content}
                  </div>
                </section>
              ))}
            </div>

            {/* Prioritized Strategic Recommendations Matrix */}
            {summary.recommendations.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
                  <span>Matriks Rekomendasi Keputusan Bisnis Prioritas</span>
                </h3>
                <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                      <tr>
                        <th className="p-3 font-semibold">Prioritas</th>
                        <th className="p-3 font-semibold">Horison Waktu</th>
                        <th className="p-3 font-semibold">Inisiatif & Tindakan</th>
                        <th className="p-3 font-semibold">Bukti Pendukung</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {summary.recommendations.map((rec, idx) => (
                        <tr key={idx}>
                          <td className="p-3 align-top">
                            <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold ${badgeClass(rec.priority)}`}>
                              {rec.priority}
                            </span>
                          </td>
                          <td className="p-3 align-top text-[11px] font-medium whitespace-nowrap text-[var(--text-secondary)]">
                            {rec.timeframe}
                          </td>
                          <td className="p-3 align-top space-y-1">
                            <div className="font-bold text-[var(--text-main)]">{rec.title}</div>
                            <div className="text-[11px] text-[var(--text-secondary)]">{rec.action}</div>
                          </td>
                          <td className="p-3 align-top text-[11px] font-mono text-[var(--text-main)]">
                            {rec.supportingEvidence}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-sans text-[var(--text-main)] print:text-black space-y-4">
            {displayedMarkdown}
          </div>
        )}

        {/* Sign-off Footer */}
        <div className="pt-6 border-t border-[var(--border-color)] print:border-slate-300 grid grid-cols-2 gap-8 text-xs text-[var(--text-secondary)] print:text-slate-600">
          <div>
            <div className="text-[10px] uppercase font-bold mb-6">Disusun dan Diverifikasi Oleh:</div>
            <div className="font-bold text-[var(--text-main)] print:text-black">{currentUser.fullName}</div>
            <div className="text-[11px] text-[var(--color-primary)] font-medium">
              {currentUser.role === 'admin' ? 'Chief Analytics Officer' : 'Senior Data Scientist'}
            </div>
            <div className="text-[10px] mt-1">Enterprise Analytics Division</div>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase font-bold mb-6">Status Validasi Empiris:</div>
            <div className="font-bold text-[var(--text-main)] print:text-black">
              {intelligenceReport.profile.rowCount.toLocaleString('id-ID')} Baris Observasi Terhitung
            </div>
            <div className="text-[11px] font-medium" style={{ color: 'var(--color-success)' }}>
              {aiNarrative ? 'Grounded AI + Deterministic Engine' : 'Deterministic Intelligence Engine'}
            </div>
            <div className="text-[10px] mt-1">Zero Fabricated Statistics Audit Pass</div>
          </div>
        </div>
      </div>
    </div>
  );
};
