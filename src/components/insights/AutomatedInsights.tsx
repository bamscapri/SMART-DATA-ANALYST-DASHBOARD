import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import type { GroundedInsightItem, InsightCategory10 } from '../../utils/intelligenceEngine';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  FlaskConical,
  Cpu,
  SearchCheck,
  BarChart3,
  ArrowUpRight,
  Compass,
  Scale,
} from 'lucide-react';

const ALL_CATEGORIES: { key: 'ALL' | InsightCategory10; label: string }[] = [
  { key: 'ALL', label: 'Semua (10 Kategori)' },
  { key: 'PERFORMANCE', label: 'Performance' },
  { key: 'TREND', label: 'Trend' },
  { key: 'COMPARATIVE', label: 'Comparative' },
  { key: 'CORRELATION', label: 'Correlation' },
  { key: 'ANOMALY', label: 'Anomaly' },
  { key: 'DISTRIBUTION', label: 'Distribution' },
  { key: 'RISK', label: 'Risk' },
  { key: 'OPPORTUNITY', label: 'Opportunity' },
  { key: 'PREDICTIVE', label: 'Predictive' },
  { key: 'STRATEGIC', label: 'Strategic' },
];

export const AutomatedInsights: React.FC = () => {
  const { selectedDataset, intelligenceReport, addToast } = useApp();
  const [insights, setInsights] = useState<GroundedInsightItem[]>(intelligenceReport.insights);
  const [isEnriching, setIsEnriching] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'ALL' | InsightCategory10>('ALL');
  const [activeSection, setActiveSection] = useState<'insights' | 'statistics' | 'mining' | 'rootcause'>('insights');

  useEffect(() => {
    setInsights(intelligenceReport.insights);
  }, [intelligenceReport]);

  const handleEnrichWithAi = async () => {
    setIsEnriching(true);
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetName: selectedDataset?.name,
          computedInsights: intelligenceReport.insights,
          intelligenceSummary: {
            rowCount: intelligenceReport.profile.rowCount,
            qualityScore: intelligenceReport.profile.quality.overallScore,
            topCorrelations: intelligenceReport.eda.topCorrelations.slice(0, 3),
            anomaliesCount: intelligenceReport.mining.anomalies.length,
          },
        }),
      });
      if (!res.ok) throw new Error('Gagal memperkaya narasi insight.');
      const data = await res.json();
      if (Array.isArray(data.insights) && data.insights.length > 0) {
        setInsights(data.insights);
        addToast('success', 'Insights Diperbarui', 'Narasi insight diselaraskan dengan bukti statistik terhitung.');
      }
    } catch (err: any) {
      addToast('warning', 'Menggunakan Insight Deterministik', err.message || 'Backend AI tidak terjangkau.');
    } finally {
      setIsEnriching(false);
    }
  };

  const filteredInsights = insights.filter(item =>
    filterCategory === 'ALL' ? true : item.category === filterCategory
  );

  const getCategoryVisual = (cat: InsightCategory10) => {
    switch (cat) {
      case 'TREND':
        return { color: 'var(--color-success)', icon: <TrendingUp className="w-4 h-4" /> };
      case 'ANOMALY':
        return { color: 'var(--color-warning)', icon: <AlertTriangle className="w-4 h-4" /> };
      case 'RISK':
        return { color: 'var(--color-danger)', icon: <ShieldAlert className="w-4 h-4" /> };
      case 'OPPORTUNITY':
        return { color: 'var(--color-success)', icon: <ArrowUpRight className="w-4 h-4" /> };
      case 'CORRELATION':
        return { color: 'var(--color-primary)', icon: <Scale className="w-4 h-4" /> };
      case 'DISTRIBUTION':
        return { color: 'var(--accent-caramel)', icon: <BarChart3 className="w-4 h-4" /> };
      case 'PREDICTIVE':
        return { color: 'var(--color-primary)', icon: <Sparkles className="w-4 h-4" /> };
      case 'STRATEGIC':
        return { color: 'var(--color-primary)', icon: <Compass className="w-4 h-4" /> };
      default:
        return { color: 'var(--color-primary)', icon: <Lightbulb className="w-4 h-4" /> };
    }
  };

  const getImpactColor = (impact: GroundedInsightItem['impactLevel']) => {
    if (impact === 'CRITICAL') return 'var(--color-danger)';
    if (impact === 'HIGH') return 'var(--color-warning)';
    if (impact === 'MEDIUM') return 'var(--color-primary)';
    return 'var(--text-secondary)';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--accent-caramel)]" />
            <span>Automated Data Intelligence, Statistics & Mining Engine</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Temuan 10 kategori, uji statistik inferensial (T-Test, ANOVA, Chi-Square), Data Mining (K-Means, Apriori, Regresi, Outlier), dan Root Cause pada{' '}
            <span className="text-[var(--color-primary)] font-semibold">{selectedDataset?.name}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={handleEnrichWithAi}
          disabled={isEnriching}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] disabled:opacity-50 text-[var(--text-on-primary)] font-semibold text-xs shadow-xs transition-theme cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isEnriching ? 'animate-spin' : ''}`} />
          <span>{isEnriching ? 'Memperhalus Narasi...' : 'Sempurnakan dengan Gemini AI'}</span>
        </button>
      </div>

      {/* Pipeline Domain Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'insights' as const, label: `Automated Insights (${insights.length})`, icon: Sparkles },
          { key: 'statistics' as const, label: `Statistical Tests & Correlation (${intelligenceReport.statistics.inferentialTests.length})`, icon: FlaskConical },
          { key: 'mining' as const, label: 'Data Mining & Anomalies', icon: Cpu },
          { key: 'rootcause' as const, label: 'Root Cause Diagnostic', icon: SearchCheck },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveSection(tab.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-theme cursor-pointer ${
                activeSection === tab.key
                  ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)] shadow-2xs'
                  : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-caramel-soft)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: 10-CATEGORY INSIGHTS */}
      {activeSection === 'insights' && (
        <>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {ALL_CATEGORIES.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterCategory(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-theme cursor-pointer ${
                  filterCategory === tab.key
                    ? 'bg-[var(--color-primary)] text-[var(--text-on-primary)] shadow-2xs'
                    : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-caramel-soft)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredInsights.map(item => {
              const visual = getCategoryVisual(item.category);
              const impactColor = getImpactColor(item.impactLevel);

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl surface-card hover:border-[var(--accent-caramel)] flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 font-bold uppercase tracking-wide" style={{ color: visual.color }}>
                        {visual.icon}
                        <span>{item.category}</span>
                      </div>
                      <span className="font-bold uppercase tracking-wider" style={{ color: impactColor }}>
                        {item.impactLevel} · CONF {item.confidenceLevel}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-main)]">{item.title}</h3>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                        {item.finding}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl surface-secondary space-y-1 tabular-nums text-[11px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[var(--text-secondary)]">Nilai Pendukung</span>
                        <span className="font-bold text-[var(--color-primary)] font-mono truncate">
                          {item.supportingValues}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[var(--text-secondary)]">Bukti Statistik</span>
                        <span className="text-[var(--text-main)] font-mono truncate max-w-[180px]" title={item.statisticalEvidence}>
                          {item.statisticalEvidence}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[var(--text-secondary)]">Kolom & Periode</span>
                        <span className="text-[var(--text-secondary)] font-mono truncate max-w-[180px]">
                          {item.relatedColumns.join(', ')} · {item.dataPeriod}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-color)] space-y-1 text-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[var(--color-primary)]" />
                      <span>Rekomendasi Tindakan</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-main)] leading-normal">
                      {item.recommendedAction}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* SECTION 2: INFERENTIAL STATISTICS & CORRELATIONS */}
      {activeSection === 'statistics' && (
        <div className="space-y-6 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {intelligenceReport.statistics.inferentialTests.map((test, idx) => (
              <div key={idx} className="p-5 rounded-2xl surface-card space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[var(--text-main)]">{test.testName}</span>
                    <span
                      className="px-2 py-0.5 rounded font-mono text-[10px] font-bold"
                      style={{
                        backgroundColor: !test.executed
                          ? 'var(--bg-secondary)'
                          : test.significantAt05
                          ? 'var(--bg-success-soft)'
                          : 'var(--bg-warning-soft)',
                        color: !test.executed
                          ? 'var(--text-secondary)'
                          : test.significantAt05
                          ? 'var(--color-success)'
                          : 'var(--color-warning)',
                      }}
                    >
                      {!test.executed ? 'SKIPPED' : test.significantAt05 ? 'SIGNIFIKAN (p < 0.05)' : 'TIDAK SIGNIFIKAN'}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-[var(--color-primary)]">
                    Variabel: {test.variables.join(' × ')}
                  </div>

                  {test.executed ? (
                    <>
                      <div className="p-3 rounded-xl surface-secondary font-mono space-y-1 tabular-nums text-[11px]">
                        <div>{test.statisticName} = <strong>{test.statisticValue}</strong></div>
                        <div>p-value = <strong>{test.pValue}</strong></div>
                        <div>{test.effectSizeLabel} = <strong>{test.effectSizeValue}</strong></div>
                        {test.confidenceInterval && <div className="text-[10px]">{test.confidenceInterval}</div>}
                      </div>
                      <p className="text-[11px] text-[var(--text-main)] leading-relaxed">{test.interpretation}</p>
                    </>
                  ) : (
                    <p className="text-[11px] text-[var(--text-secondary)]">{test.skipReason}</p>
                  )}
                </div>

                <div className="pt-2 border-t border-[var(--border-color)] text-[10px] text-[var(--text-secondary)] space-y-1">
                  <div><strong>Asumsi:</strong> {test.assumptionsCheck}</div>
                  <div className="italic">{test.causalCaveat}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Correlation Table */}
          <div className="p-5 rounded-2xl surface-card space-y-3">
            <h2 className="text-sm font-bold text-[var(--text-main)]">
              Analisis Korelasi Multivariat (Pearson r, Spearman ρ, Kendall τ)
            </h2>
            {intelligenceReport.eda.topCorrelations.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[var(--bg-secondary)] uppercase font-bold">
                    <tr>
                      <th className="px-3 py-2">Pasangan Variabel</th>
                      <th className="px-3 py-2">n</th>
                      <th className="px-3 py-2">Pearson r</th>
                      <th className="px-3 py-2">Spearman ρ</th>
                      <th className="px-3 py-2">Kendall τ</th>
                      <th className="px-3 py-2">p-value</th>
                      <th className="px-3 py-2">Interpretasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)] font-mono tabular-nums">
                    {intelligenceReport.eda.topCorrelations.map((c, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-sans font-semibold">{c.colA} ↔ {c.colB}</td>
                        <td className="px-3 py-2">{c.n}</td>
                        <td className="px-3 py-2 font-bold text-[var(--color-primary)]">{c.pearsonR}</td>
                        <td className="px-3 py-2">{c.spearmanRho}</td>
                        <td className="px-3 py-2">{c.kendallTau}</td>
                        <td className="px-3 py-2">{c.pValueApprox}</td>
                        <td className="px-3 py-2 font-sans text-[var(--text-secondary)]">{c.strength} ({c.direction})</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[11px] text-[var(--text-secondary)]">Membutuhkan minimal 2 kolom numerik untuk menghitung korelasi.</p>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: DATA MINING & ANOMALIES */}
      {activeSection === 'mining' && (
        <div className="space-y-5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* K-Means Clustering */}
            <div className="p-5 rounded-2xl surface-card space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[var(--text-main)]">K-Means Segmentation</h2>
                {intelligenceReport.mining.kmeans.executed && (
                  <span className="font-mono text-[11px] font-bold text-[var(--color-primary)]">
                    K={intelligenceReport.mining.kmeans.k} · Silhouette={intelligenceReport.mining.kmeans.silhouetteScore}
                  </span>
                )}
              </div>
              {intelligenceReport.mining.kmeans.executed ? (
                <div className="space-y-2">
                  {intelligenceReport.mining.kmeans.clusters.map(cl => (
                    <div key={cl.clusterId} className="p-3 rounded-xl surface-secondary border border-[var(--border-color)] space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-[var(--text-main)]">Cluster #{cl.clusterId}: {cl.label}</span>
                        <span className="text-[var(--color-primary)] tabular-nums">{cl.size} baris ({cl.sharePct}%)</span>
                      </div>
                      <div className="text-[11px] font-mono text-[var(--text-secondary)] flex flex-wrap gap-2">
                        {Object.entries(cl.centroidSummary).map(([k, v]) => (
                          <span key={k}>{k}: <strong>{Number(v).toLocaleString('id-ID')}</strong></span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[var(--text-secondary)]">{intelligenceReport.mining.kmeans.skipReason}</p>
              )}
            </div>

            {/* Regression & Association Rules */}
            <div className="space-y-4">
              <div className="p-5 rounded-2xl surface-card space-y-2">
                <h2 className="text-sm font-bold text-[var(--text-main)]">Regresi Linear (OLS)</h2>
                {intelligenceReport.mining.regression.executed ? (
                  <div className="p-3 rounded-xl surface-secondary font-mono text-[11px] space-y-1">
                    <div className="font-bold text-[var(--color-primary)]">{intelligenceReport.mining.regression.equation}</div>
                    <div>R² = {intelligenceReport.mining.regression.r2} · RMSE = {intelligenceReport.mining.regression.rmse.toLocaleString('id-ID')}</div>
                  </div>
                ) : (
                  <p className="text-[11px] text-[var(--text-secondary)]">{intelligenceReport.mining.regression.skipReason}</p>
                )}
              </div>

              <div className="p-5 rounded-2xl surface-card space-y-2">
                <h2 className="text-sm font-bold text-[var(--text-main)]">Association Rule Mining (Apriori Co-Occurrence)</h2>
                {intelligenceReport.mining.associationRules.executed ? (
                  <div className="space-y-1.5">
                    {intelligenceReport.mining.associationRules.rules.slice(0, 4).map((r, i) => (
                      <div key={i} className="p-2.5 rounded-lg surface-secondary font-mono text-[11px] flex items-center justify-between gap-2">
                        <span className="truncate">{r.antecedent} ➔ {r.consequent}</span>
                        <span className="shrink-0 text-[var(--color-primary)] font-bold">
                          Lift {r.lift}× · Conf {(r.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-[var(--text-secondary)]">{intelligenceReport.mining.associationRules.skipReason}</p>
                )}
              </div>
            </div>
          </div>

          {/* Anomalies Table */}
          <div className="p-5 rounded-2xl surface-card space-y-3">
            <h2 className="text-sm font-bold text-[var(--text-main)]">
              Deteksi Anomali Multi-Kolom ({intelligenceReport.mining.anomalies.length} Temuan)
            </h2>
            {intelligenceReport.mining.anomalies.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[var(--bg-secondary)] uppercase font-bold">
                    <tr>
                      <th className="px-3 py-2">Baris</th>
                      <th className="px-3 py-2">Konteks</th>
                      <th className="px-3 py-2">Kolom</th>
                      <th className="px-3 py-2">Nilai Aktual</th>
                      <th className="px-3 py-2">Rentang Normal</th>
                      <th className="px-3 py-2">Metode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)] font-mono tabular-nums">
                    {intelligenceReport.mining.anomalies.map((a, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2">#{a.rowIndex}</td>
                        <td className="px-3 py-2 font-sans">{a.contextLabel}</td>
                        <td className="px-3 py-2 font-bold">{a.column}</td>
                        <td className="px-3 py-2 font-bold" style={{ color: 'var(--color-danger)' }}>
                          {a.value.toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-2">{a.expectedBounds}</td>
                        <td className="px-3 py-2">{a.method} {a.zScore !== undefined ? `(Z=${a.zScore})` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[11px] text-[var(--text-secondary)]">Tidak ada nilai ekstrem di luar batas IQR/Z-Score yang terdeteksi.</p>
            )}
          </div>
        </div>
      )}

      {/* SECTION 4: ROOT CAUSE DIAGNOSTIC */}
      {activeSection === 'rootcause' && (
        <div className="p-6 rounded-2xl surface-card space-y-4 text-xs">
          <div className="border-b border-[var(--border-color)] pb-3">
            <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
              <SearchCheck className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Root Cause & Variance Contribution Diagnostic</span>
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Memisahkan secara ketat antara Fakta Terukur, Faktor Berkorelasi, Dugaan Penyebab, dan Hipotesis Uji Lanjutan (tidak mencampuradukkan korelasi dengan kausalitas).
            </p>
          </div>

          {intelligenceReport.rootCause ? (
            <div className="space-y-3">
              {intelligenceReport.rootCause.factors.map((f, idx) => {
                const badgeColor =
                  f.tier === 'Fakta Terukur'
                    ? 'var(--color-success)'
                    : f.tier === 'Faktor Berkorelasi'
                    ? 'var(--color-primary)'
                    : f.tier === 'Dugaan Penyebab'
                    ? 'var(--color-warning)'
                    : 'var(--text-secondary)';
                return (
                  <div key={idx} className="p-4 rounded-xl surface-secondary border border-[var(--border-color)] space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-[var(--text-main)]">{f.title}</span>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0"
                        style={{ backgroundColor: 'var(--bg-card)', color: badgeColor, border: '1px solid var(--border-color)' }}
                      >
                        {f.tier}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{f.detail}</p>
                    <div className="text-[11px] font-mono text-[var(--color-primary)] font-semibold">
                      Bukti: {f.evidenceMetric}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-[var(--text-secondary)]">
              Membutuhkan minimal 1 metrik numerik dan 1 kolom kategori dengan ≥2 kelompok untuk dekomposisi kontribusi.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
