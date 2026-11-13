import { profileDataset, DataProfileReport, DetailedColumnProfile } from './dataProfiler';
import { runAdvancedForecastPipeline, ForecastOutput } from './forecasting';
import type { StoredDataset } from '../data/seedDatasets';

// ============================================================================
// TYPES
// ============================================================================

export type InsightCategory10 =
  | 'PERFORMANCE'
  | 'TREND'
  | 'COMPARATIVE'
  | 'CORRELATION'
  | 'ANOMALY'
  | 'DISTRIBUTION'
  | 'RISK'
  | 'OPPORTUNITY'
  | 'PREDICTIVE'
  | 'STRATEGIC';

export type ImpactLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface GroundedInsightItem {
  id: string;
  title: string;
  category: InsightCategory10;
  finding: string;
  statisticalEvidence: string;
  supportingValues: string;
  relatedColumns: string[];
  dataPeriod: string;
  sourceDataset: string;
  impactLevel: ImpactLevel;
  confidenceLevel: ConfidenceLevel;
  recommendedAction: string;
}

export interface CorrelationPair {
  colA: string;
  colB: string;
  n: number;
  pearsonR: number;
  spearmanRho: number;
  kendallTau: number;
  strength: 'Sangat Kuat' | 'Kuat' | 'Sedang' | 'Lemah';
  direction: 'Positif' | 'Negatif';
  pValueApprox: number;
  note: string;
}

export interface GroupComparisonEntry {
  groupValue: string;
  count: number;
  sum: number;
  mean: number;
  sharePct: number;
  deltaFromMeanPct: number;
}

export interface InferentialTestResult {
  testName: 'Welch Two-Sample T-Test' | 'One-Way ANOVA' | 'Chi-Square Independence Test';
  executed: boolean;
  skipReason?: string;
  variables: string[];
  statisticName: string;
  statisticValue: number | null;
  pValue: number | null;
  significantAt05: boolean;
  effectSizeLabel: string;
  effectSizeValue: number | null;
  confidenceInterval?: string;
  assumptionsCheck: string;
  interpretation: string;
  causalCaveat: string;
}

export interface ClusterProfile {
  clusterId: number;
  label: string;
  size: number;
  sharePct: number;
  centroidSummary: Record<string, number>;
}

export interface AssociationRuleItem {
  antecedent: string;
  consequent: string;
  support: number;
  confidence: number;
  lift: number;
  coOccurrences: number;
}

export interface RegressionSummary {
  executed: boolean;
  skipReason?: string;
  targetCol: string;
  featureCol: string;
  slope: number;
  intercept: number;
  r2: number;
  rmse: number;
  equation: string;
}

export interface AnomalyRecord {
  rowIndex: number;
  column: string;
  value: number;
  method: 'IQR' | 'Z-Score';
  expectedBounds: string;
  zScore?: number;
  contextLabel: string;
}

export interface DataMiningReport {
  kmeans: {
    executed: boolean;
    skipReason?: string;
    features: string[];
    k: number;
    silhouetteScore: number;
    clusters: ClusterProfile[];
  };
  hierarchical: {
    executed: boolean;
    skipReason?: string;
    sampleSize: number;
    clusterCount: number;
    clusters: ClusterProfile[];
  };
  associationRules: {
    executed: boolean;
    skipReason?: string;
    rules: AssociationRuleItem[];
  };
  regression: RegressionSummary;
  anomalies: AnomalyRecord[];
}

export interface RootCauseFactor {
  tier: 'Fakta Terukur' | 'Faktor Berkorelasi' | 'Dugaan Penyebab' | 'Hipotesis Uji Lanjutan';
  title: string;
  detail: string;
  evidenceMetric: string;
  impactContributionPct?: number;
}

export interface RootCauseDiagnosticReport {
  targetMetric: string;
  dimensionAnalyzed: string;
  overallMean: number;
  topPositiveDriver: GroupComparisonEntry | null;
  topNegativeDrag: GroupComparisonEntry | null;
  factors: RootCauseFactor[];
}

export interface ChartRecommendation {
  id: string;
  chartType:
    | 'bar'
    | 'line'
    | 'area'
    | 'stacked_area'
    | 'pie'
    | 'donut'
    | 'scatter'
    | 'histogram'
    | 'boxplot'
    | 'heatmap'
    | 'treemap'
    | 'radar';
  title: string;
  reason: string;
  xCol: string;
  yCol: string;
  secondaryCol?: string;
  aggMode: 'sum' | 'avg' | 'count';
  priority: number;
}

export interface ExecutiveRecommendationItem {
  priority: ImpactLevel;
  timeframe: 'Segera (0–30 Hari)' | 'Jangka Menengah (30–90 Hari)' | 'Jangka Panjang (3–12 Bulan)';
  title: string;
  action: string;
  expectedImpact: string;
  supportingEvidence: string;
}

export interface ExecutiveSectionBlock {
  number: number;
  title: string;
  content: string;
}

export interface ExecutiveSummaryReport {
  datasetName: string;
  analysisMode: 'structured' | 'document';
  generatedAt: string;
  dataPeriod: string;
  sections: ExecutiveSectionBlock[];
  recommendations: ExecutiveRecommendationItem[];
  markdownReport: string;
}

export interface IntelligenceReport {
  datasetId: string;
  datasetName: string;
  analysisMode: 'structured' | 'document';
  generatedAt: string;
  dataPeriod: string;
  profile: DataProfileReport;
  eda: {
    correlationMatrix: {
      columns: string[];
      matrix: number[][];
    };
    topCorrelations: CorrelationPair[];
    primaryGroupComparison: {
      metricCol: string;
      dimensionCol: string;
      groups: GroupComparisonEntry[];
    } | null;
    timeSeriesSummary: {
      available: boolean;
      dateCol?: string;
      metricCol?: string;
      periodsCount: number;
      startDate?: string;
      endDate?: string;
      firstValue?: number;
      lastValue?: number;
      overallGrowthPct?: number;
      avgPeriodGrowthPct?: number;
      peakPeriod?: { date: string; value: number };
      troughPeriod?: { date: string; value: number };
      skipReason?: string;
    };
  };
  statistics: {
    inferentialTests: InferentialTestResult[];
  };
  mining: DataMiningReport;
  rootCause: RootCauseDiagnosticReport | null;
  forecasting: {
    available: boolean;
    skipReason?: string;
    output?: ForecastOutput;
  };
  insights: GroundedInsightItem[];
  chartRecommendations: ChartRecommendation[];
  executiveSummary: ExecutiveSummaryReport;
}

// ============================================================================
// MATHEMATICAL & P-VALUE HELPERS
// ============================================================================

function roundN(v: number, digits = 4): number {
  const m = Math.pow(10, digits);
  return Math.round(v * m) / m;
}

function fmtId(v: number): string {
  return Number.isFinite(v) ? v.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '0';
}

function parseNum(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'boolean') return null;
  const cleaned = String(v).trim().replace(/^(rp\.?|idr|\$|€|£)\s*/i, '').replace(/[, %]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Log-gamma using Lanczos approximation
function logGamma(z: number): number {
  const g = 7;
  const p = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  z -= 1;
  let x = p[0];
  for (let i = 1; i < g + 2; i++) {
    x += p[i] / (z + i);
  }
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// Regularized incomplete beta I_x(a, b) via continued fraction (Lentz)
function betacf(a: number, b: number, x: number): number {
  const maxIter = 120;
  const eps = 3e-7;
  const fpMin = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < fpMin) d = fpMin;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpMin) d = fpMin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpMin) c = fpMin;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpMin) d = fpMin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpMin) c = fpMin;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  return h;
}

function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(a, b, x)) / a;
  }
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

// Two-tailed p-value for Student/Welch t-statistic
export function twoTailedTTestPValue(tAbs: number, df: number): number {
  if (!Number.isFinite(tAbs) || df <= 0) return 1;
  const x = df / (df + tAbs * tAbs);
  return Math.max(0, Math.min(1, regularizedBeta(x, df / 2, 0.5)));
}

// Upper-tail p-value for F-statistic (ANOVA)
export function fTestPValue(fStat: number, df1: number, df2: number): number {
  if (!Number.isFinite(fStat) || fStat <= 0 || df1 <= 0 || df2 <= 0) return 1;
  const x = df2 / (df2 + df1 * fStat);
  return Math.max(0, Math.min(1, regularizedBeta(x, df2 / 2, df1 / 2)));
}

// Upper-tail p-value for Chi-Square via Wilson-Hilferty normal approximation
export function chiSquarePValue(chi2: number, df: number): number {
  if (!Number.isFinite(chi2) || chi2 <= 0 || df <= 0) return 1;
  const z =
    (Math.pow(chi2 / df, 1 / 3) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
  // Standard normal upper tail
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.39894228 * Math.exp((-z * z) / 2);
  const p =
    d *
    t *
    (0.31938153 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const upper = z > 0 ? p : 1 - p;
  return Math.max(0, Math.min(1, upper));
}

// ============================================================================
// CORRELATION FUNCTIONS (PEARSON, SPEARMAN, KENDALL)
// ============================================================================

function averageRanks(values: number[]): number[] {
  const indexed = values.map((v, idx) => ({ v, idx })).sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(values.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) {
      j++;
    }
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) {
      ranks[indexed[k].idx] = avgRank;
    }
    i = j + 1;
  }
  return ranks;
}

export function computePearsonR(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const ax = xs[i] - mx;
    const by = ys[i] - my;
    num += ax * by;
    dx += ax * ax;
    dy += by * by;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? 0 : Math.max(-1, Math.min(1, num / denom));
}

export function computeSpearmanRho(xs: number[], ys: number[]): number {
  if (xs.length < 3 || ys.length < 3) return 0;
  return computePearsonR(averageRanks(xs), averageRanks(ys));
}

export function computeKendallTau(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  // Cap at 200 pairs for O(n^2) speed
  const limit = Math.min(n, 200);
  let concordant = 0;
  let discordant = 0;
  for (let i = 0; i < limit; i++) {
    for (let j = i + 1; j < limit; j++) {
      const dx = xs[i] - xs[j];
      const dy = ys[i] - ys[j];
      const prod = dx * dy;
      if (prod > 0) concordant++;
      else if (prod < 0) discordant++;
    }
  }
  const total = concordant + discordant;
  return total === 0 ? 0 : (concordant - discordant) / total;
}

// ============================================================================
// INFERENTIAL STATISTICAL TESTS
// ============================================================================

export function runWelchTTest(
  data: Record<string, any>[],
  catCol: string,
  metricCol: string
): InferentialTestResult {
  const groupsMap = new Map<string, number[]>();
  for (const row of data) {
    const g = String(row[catCol] ?? '').trim();
    const v = parseNum(row[metricCol]);
    if (g && v !== null) {
      if (!groupsMap.has(g)) groupsMap.set(g, []);
      groupsMap.get(g)!.push(v);
    }
  }

  const eligibleGroups = Array.from(groupsMap.entries())
    .filter(([, vals]) => vals.length >= 2)
    .sort((a, b) => b[1].length - a[1].length);

  if (eligibleGroups.length < 2) {
    return {
      testName: 'Welch Two-Sample T-Test',
      executed: false,
      skipReason: `Kolom [${catCol}] tidak memiliki minimal 2 kelompok kategori dengan ≥2 observasi valid untuk [${metricCol}].`,
      variables: [catCol, metricCol],
      statisticName: 't',
      statisticValue: null,
      pValue: null,
      significantAt05: false,
      effectSizeLabel: "Cohen's d",
      effectSizeValue: null,
      assumptionsCheck: 'Syarat minimum ≥2 kelompok independen masing-masing n≥2 belum terpenuhi.',
      interpretation: 'Uji T-Test dilewati.',
      causalCaveat: 'Perbedaan rata-rata antar kelompok tidak otomatis membuktikan hubungan sebab-akibat.',
    };
  }

  const [nameA, valsA] = eligibleGroups[0];
  const [nameB, valsB] = eligibleGroups[1];
  const nA = valsA.length;
  const nB = valsB.length;
  const meanA = valsA.reduce((s, v) => s + v, 0) / nA;
  const meanB = valsB.reduce((s, v) => s + v, 0) / nB;
  const varA = valsA.reduce((s, v) => s + Math.pow(v - meanA, 2), 0) / (nA - 1);
  const varB = valsB.reduce((s, v) => s + Math.pow(v - meanB, 2), 0) / (nB - 1);

  const se = Math.sqrt(varA / nA + varB / nB);
  const diff = meanA - meanB;
  const tStat = se === 0 ? 0 : diff / se;
  const dfNum = Math.pow(varA / nA + varB / nB, 2);
  const dfDen =
    Math.pow(varA / nA, 2) / (nA - 1) + Math.pow(varB / nB, 2) / (nB - 1);
  const df = dfDen === 0 ? nA + nB - 2 : dfNum / dfDen;
  const pValue = se === 0 ? 1 : twoTailedTTestPValue(Math.abs(tStat), df);

  const pooledSd = Math.sqrt(((nA - 1) * varA + (nB - 1) * varB) / (nA + nB - 2));
  const cohensD = pooledSd === 0 ? 0 : Math.abs(diff) / pooledSd;
  const ciHalf = 1.96 * se;

  return {
    testName: 'Welch Two-Sample T-Test',
    executed: true,
    variables: [catCol, metricCol],
    statisticName: `t (df=${roundN(df, 1)})`,
    statisticValue: roundN(tStat, 3),
    pValue: roundN(pValue, 4),
    significantAt05: pValue < 0.05,
    effectSizeLabel: "Cohen's d",
    effectSizeValue: roundN(cohensD, 3),
    confidenceInterval: `95% CI selisih mean [${fmtId(diff - ciHalf)} s/d ${fmtId(diff + ciHalf)}]`,
    assumptionsCheck: `Menguji 2 kelompok terbesar [${nameA} (n=${nA})] vs [${nameB} (n=${nB})] tanpa mengasumsikan varians setara (Welch).`,
    interpretation:
      pValue < 0.05
        ? `Terdapat perbedaan rata-rata [${metricCol}] yang signifikan secara statistik antara '${nameA}' (${fmtId(meanA)}) dan '${nameB}' (${fmtId(meanB)}) pada α=0.05 (p=${roundN(pValue, 4)}).`
        : `Tidak ditemukan perbedaan rata-rata [${metricCol}] yang signifikan secara statistik antara '${nameA}' (${fmtId(meanA)}) dan '${nameB}' (${fmtId(meanB)}) (p=${roundN(pValue, 4)}).`,
    causalCaveat: 'Hasil ini menunjukkan perbedaan statistik antar grup observasional, bukan bukti kausalitas langsung tanpa eksperimen terkontrol.',
  };
}

export function runOneWayAnova(
  data: Record<string, any>[],
  catCol: string,
  metricCol: string
): InferentialTestResult {
  const groupsMap = new Map<string, number[]>();
  for (const row of data) {
    const g = String(row[catCol] ?? '').trim();
    const v = parseNum(row[metricCol]);
    if (g && v !== null) {
      if (!groupsMap.has(g)) groupsMap.set(g, []);
      groupsMap.get(g)!.push(v);
    }
  }

  const eligible = Array.from(groupsMap.entries())
    .filter(([, vals]) => vals.length >= 2)
    .slice(0, 12);

  const totalN = eligible.reduce((s, [, vals]) => s + vals.length, 0);
  if (eligible.length < 2 || totalN <= eligible.length) {
    return {
      testName: 'One-Way ANOVA',
      executed: false,
      skipReason: `Kurang dari 2 kategori dengan ≥2 observasi valid pada [${catCol}] × [${metricCol}].`,
      variables: [catCol, metricCol],
      statisticName: 'F',
      statisticValue: null,
      pValue: null,
      significantAt05: false,
      effectSizeLabel: 'Eta-Squared (η²)',
      effectSizeValue: null,
      assumptionsCheck: 'Minimal 2 grup masing-masing n≥2 tidak terpenuhi.',
      interpretation: 'One-Way ANOVA dilewati.',
      causalCaveat: 'ANOVA hanya menguji kesetaraan rata-rata antar kelompok, bukan kausalitas.',
    };
  }

  const allVals = eligible.flatMap(([, v]) => v);
  const grandMean = allVals.reduce((s, v) => s + v, 0) / allVals.length;
  let ssBetween = 0;
  let ssWithin = 0;

  for (const [, vals] of eligible) {
    const gMean = vals.reduce((s, v) => s + v, 0) / vals.length;
    ssBetween += vals.length * Math.pow(gMean - grandMean, 2);
    for (const v of vals) {
      ssWithin += Math.pow(v - gMean, 2);
    }
  }

  const df1 = eligible.length - 1;
  const df2 = totalN - eligible.length;
  const msBetween = ssBetween / df1;
  const msWithin = df2 > 0 ? ssWithin / df2 : 0;
  const fStat = msWithin === 0 ? 0 : msBetween / msWithin;
  const pValue = msWithin === 0 ? 1 : fTestPValue(fStat, df1, df2);
  const ssTotal = ssBetween + ssWithin;
  const etaSq = ssTotal === 0 ? 0 : ssBetween / ssTotal;

  return {
    testName: 'One-Way ANOVA',
    executed: true,
    variables: [catCol, metricCol],
    statisticName: `F(${df1}, ${df2})`,
    statisticValue: roundN(fStat, 3),
    pValue: roundN(pValue, 4),
    significantAt05: pValue < 0.05,
    effectSizeLabel: 'Eta-Squared (η²)',
    effectSizeValue: roundN(etaSq, 3),
    assumptionsCheck: `Menguji ${eligible.length} kategori (total n=${totalN}). Mengasumsikan independensi antar baris.`,
    interpretation:
      pValue < 0.05
        ? `Variasi [${metricCol}] berbeda secara signifikan antar kategori [${catCol}] (F=${roundN(fStat, 2)}, p=${roundN(pValue, 4)}, menjelaskan ${roundN(etaSq * 100, 1)}% varians).`
        : `Tidak ada bukti signifikan bahwa rata-rata [${metricCol}] berbeda antar kategori [${catCol}] (F=${roundN(fStat, 2)}, p=${roundN(pValue, 4)}).`,
    causalCaveat: 'Signifikansi ANOVA menunjukkan asosiasi antar kelompok kategori dan metrik, bukan sebab-akibat kausal.',
  };
}

export function runChiSquareTest(
  data: Record<string, any>[],
  catA: string,
  catB: string
): InferentialTestResult {
  const contingency = new Map<string, Map<string, number>>();
  const colTotals = new Map<string, number>();
  let grandTotal = 0;

  for (const row of data) {
    const a = String(row[catA] ?? '').trim();
    const b = String(row[catB] ?? '').trim();
    if (!a || !b) continue;
    if (!contingency.has(a)) contingency.set(a, new Map());
    const rowMap = contingency.get(a)!;
    rowMap.set(b, (rowMap.get(b) || 0) + 1);
    colTotals.set(b, (colTotals.get(b) || 0) + 1);
    grandTotal++;
  }

  const rowKeys = Array.from(contingency.keys()).slice(0, 10);
  const colKeys = Array.from(colTotals.keys()).slice(0, 10);

  if (rowKeys.length < 2 || colKeys.length < 2 || grandTotal < 10) {
    return {
      testName: 'Chi-Square Independence Test',
      executed: false,
      skipReason: `Membutuhkan minimal 2 kategori per variabel dan n≥10 untuk menguji independensi [${catA}] × [${catB}].`,
      variables: [catA, catB],
      statisticName: 'χ²',
      statisticValue: null,
      pValue: null,
      significantAt05: false,
      effectSizeLabel: "Cramér's V",
      effectSizeValue: null,
      assumptionsCheck: 'Tabel kontingensi minimal 2×2 dengan n≥10 belum terpenuhi.',
      interpretation: 'Chi-Square Test dilewati.',
      causalCaveat: 'Asosiasi kategorikal tidak menyiratkan hubungan kausal.',
    };
  }

  let chi2 = 0;
  let lowExpectedCells = 0;
  const totalCells = rowKeys.length * colKeys.length;

  for (const r of rowKeys) {
    const rowMap = contingency.get(r)!;
    const rowSum = colKeys.reduce((s, c) => s + (rowMap.get(c) || 0), 0);
    for (const c of colKeys) {
      const obs = rowMap.get(c) || 0;
      const colSum = colKeys.includes(c)
        ? rowKeys.reduce((s, rk) => s + (contingency.get(rk)?.get(c) || 0), 0)
        : 0;
      const exp = (rowSum * colSum) / Math.max(grandTotal, 1);
      if (exp < 5) lowExpectedCells++;
      if (exp > 0) {
        chi2 += Math.pow(obs - exp, 2) / exp;
      }
    }
  }

  const df = (rowKeys.length - 1) * (colKeys.length - 1);
  const pValue = chiSquarePValue(chi2, df);
  const minDim = Math.min(rowKeys.length - 1, colKeys.length - 1);
  const cramersV = minDim > 0 && grandTotal > 0 ? Math.sqrt(chi2 / (grandTotal * minDim)) : 0;

  return {
    testName: 'Chi-Square Independence Test',
    executed: true,
    variables: [catA, catB],
    statisticName: `χ² (df=${df})`,
    statisticValue: roundN(chi2, 3),
    pValue: roundN(pValue, 4),
    significantAt05: pValue < 0.05,
    effectSizeLabel: "Cramér's V",
    effectSizeValue: roundN(cramersV, 3),
    assumptionsCheck:
      lowExpectedCells / totalCells > 0.2
        ? `Peringatan: ${lowExpectedCells}/${totalCells} sel memiliki ekspektasi < 5; interpretasikan p-value dengan hati-hati.`
        : `Asumsi frekuensi ekspektasi terpenuhi (n=${grandTotal}, tabel ${rowKeys.length}×${colKeys.length}).`,
    interpretation:
      pValue < 0.05
        ? `Terdapat asosiasi kategorikal yang signifikan antara [${catA}] dan [${catB}] (χ²=${roundN(chi2, 2)}, p=${roundN(pValue, 4)}, Cramér's V=${roundN(cramersV, 2)}).`
        : `Distribusi [${catA}] dan [${catB}] cenderung independen secara statistik (p=${roundN(pValue, 4)}).`,
    causalCaveat: 'Keterkaitan dua kategori hanya menggambarkan pola ko-eksistensi dalam data.',
  };
}

// ============================================================================
// DATA MINING (K-MEANS, HIERARCHICAL, ASSOCIATION RULES, REGRESSION, ANOMALIES)
// ============================================================================

function runKMeansClustering(
  data: Record<string, any>[],
  featureCols: string[],
  kRequested = 3
): DataMiningReport['kmeans'] {
  if (data.length < 6 || featureCols.length < 2) {
    return {
      executed: false,
      skipReason: 'Membutuhkan ≥6 baris dan ≥2 kolom numerik terukur untuk K-Means Clustering.',
      features: featureCols,
      k: 0,
      silhouetteScore: 0,
      clusters: [],
    };
  }

  const cols = featureCols.slice(0, 4);
  const rawVectors: number[][] = [];
  for (const row of data) {
    const vec = cols.map(c => parseNum(row[c]));
    if (vec.every((v): v is number => v !== null)) {
      rawVectors.push(vec);
    }
  }

  if (rawVectors.length < 6) {
    return {
      executed: false,
      skipReason: 'Terlalu banyak sel kosong pada fitur numerik untuk menjalankan K-Means.',
      features: cols,
      k: 0,
      silhouetteScore: 0,
      clusters: [],
    };
  }

  const k = Math.min(kRequested, Math.max(2, Math.floor(rawVectors.length / 3)));
  // Standardize Z-score
  const d = cols.length;
  const means = Array.from({ length: d }, (_, j) => rawVectors.reduce((s, v) => s + v[j], 0) / rawVectors.length);
  const sds = Array.from({ length: d }, (_, j) => {
    const varJ = rawVectors.reduce((s, v) => s + Math.pow(v[j] - means[j], 2), 0) / rawVectors.length;
    return Math.sqrt(varJ) || 1;
  });
  const scaled = rawVectors.map(v => v.map((val, j) => (val - means[j]) / sds[j]));

  // Deterministic spread initialization (evenly spaced along norm)
  const sortedIndices = scaled
    .map((v, idx) => ({ idx, norm: v.reduce((s, x) => s + x, 0) }))
    .sort((a, b) => a.norm - b.norm)
    .map(item => item.idx);

  let centroids = Array.from({ length: k }, (_, c) => {
    const pickIdx = sortedIndices[Math.floor(((c + 0.5) / k) * sortedIndices.length)];
    return [...scaled[pickIdx]];
  });

  const assignments = new Array<number>(scaled.length).fill(0);
  const distSq = (a: number[], b: number[]) => a.reduce((s, v, j) => s + Math.pow(v - b[j], 2), 0);

  for (let iter = 0; iter < 25; iter++) {
    let changed = false;
    for (let i = 0; i < scaled.length; i++) {
      let bestC = 0;
      let bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const dst = distSq(scaled[i], centroids[c]);
        if (dst < bestD) {
          bestD = dst;
          bestC = c;
        }
      }
      if (assignments[i] !== bestC) {
        assignments[i] = bestC;
        changed = true;
      }
    }
    const nextCentroids = Array.from({ length: k }, () => new Array<number>(d).fill(0));
    const counts = new Array<number>(k).fill(0);
    for (let i = 0; i < scaled.length; i++) {
      const c = assignments[i];
      counts[c]++;
      for (let j = 0; j < d; j++) nextCentroids[c][j] += scaled[i][j];
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        for (let j = 0; j < d; j++) nextCentroids[c][j] /= counts[c];
      } else {
        nextCentroids[c] = [...centroids[c]];
      }
    }
    centroids = nextCentroids;
    if (!changed) break;
  }

  // Approximate Silhouette score (sample max 150 points for speed)
  const sampleN = Math.min(scaled.length, 150);
  let silSum = 0;
  let silCount = 0;
  for (let i = 0; i < sampleN; i++) {
    const myC = assignments[i];
    let aSum = 0;
    let aCnt = 0;
    const otherSums = new Array<number>(k).fill(0);
    const otherCnts = new Array<number>(k).fill(0);
    for (let j = 0; j < sampleN; j++) {
      if (i === j) continue;
      const euc = Math.sqrt(distSq(scaled[i], scaled[j]));
      if (assignments[j] === myC) {
        aSum += euc;
        aCnt++;
      } else {
        otherSums[assignments[j]] += euc;
        otherCnts[assignments[j]]++;
      }
    }
    const a = aCnt > 0 ? aSum / aCnt : 0;
    let b = Infinity;
    for (let c = 0; c < k; c++) {
      if (c !== myC && otherCnts[c] > 0) {
        b = Math.min(b, otherSums[c] / otherCnts[c]);
      }
    }
    if (b < Infinity && Math.max(a, b) > 0) {
      silSum += (b - a) / Math.max(a, b);
      silCount++;
    }
  }
  const silhouetteScore = silCount > 0 ? roundN(silSum / silCount, 3) : 0;

  // Build unstandardized cluster summaries sorted by primary feature descending
  const clusters: ClusterProfile[] = [];
  for (let c = 0; c < k; c++) {
    const members = rawVectors.filter((_, idx) => assignments[idx] === c);
    if (members.length === 0) continue;
    const summary: Record<string, number> = {};
    cols.forEach((colName, j) => {
      summary[colName] = roundN(members.reduce((s, v) => s + v[j], 0) / members.length, 2);
    });
    clusters.push({
      clusterId: c + 1,
      label: '',
      size: members.length,
      sharePct: roundN((members.length / rawVectors.length) * 100, 1),
      centroidSummary: summary,
    });
  }

  clusters.sort((a, b) => (b.centroidSummary[cols[0]] || 0) - (a.centroidSummary[cols[0]] || 0));
  const labelNames = ['Segmen High-Value / Intensif', 'Segmen Menengah / Stabil', 'Segmen Entry / Volume Dasar'];
  clusters.forEach((cl, idx) => {
    cl.clusterId = idx + 1;
    cl.label = labelNames[idx] || `Segmen ${idx + 1}`;
  });

  return {
    executed: true,
    features: cols,
    k: clusters.length,
    silhouetteScore,
    clusters,
  };
}

function runHierarchicalSummary(
  data: Record<string, any>[],
  featureCols: string[],
  targetClusters = 3
): DataMiningReport['hierarchical'] {
  if (data.length < 6 || featureCols.length < 2) {
    return {
      executed: false,
      skipReason: 'Membutuhkan ≥6 baris dan ≥2 kolom numerik untuk Hierarchical Clustering.',
      sampleSize: 0,
      clusterCount: 0,
      clusters: [],
    };
  }

  const cols = featureCols.slice(0, 3);
  const rawVectors: number[][] = [];
  for (const row of data.slice(0, 80)) {
    const vec = cols.map(c => parseNum(row[c]));
    if (vec.every((v): v is number => v !== null)) rawVectors.push(vec);
  }
  if (rawVectors.length < 6) {
    return {
      executed: false,
      skipReason: 'Tidak cukup baris lengkap untuk pengelompokan hierarkis.',
      sampleSize: rawVectors.length,
      clusterCount: 0,
      clusters: [],
    };
  }

  const d = cols.length;
  const means = Array.from({ length: d }, (_, j) => rawVectors.reduce((s, v) => s + v[j], 0) / rawVectors.length);
  const sds = Array.from({ length: d }, (_, j) => {
    const vJ = rawVectors.reduce((s, v) => s + Math.pow(v[j] - means[j], 2), 0) / rawVectors.length;
    return Math.sqrt(vJ) || 1;
  });
  const scaled = rawVectors.map(v => v.map((val, j) => (val - means[j]) / sds[j]));

  interface HNode {
    indices: number[];
    centroid: number[];
  }
  let nodes: HNode[] = scaled.map((vec, idx) => ({ indices: [idx], centroid: vec }));
  const goalK = Math.min(targetClusters, nodes.length);

  while (nodes.length > goalK) {
    let bestI = 0;
    let bestJ = 1;
    let bestD = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dist = 0;
        for (let k = 0; k < d; k++) dist += Math.pow(nodes[i].centroid[k] - nodes[j].centroid[k], 2);
        if (dist < bestD) {
          bestD = dist;
          bestI = i;
          bestJ = j;
        }
      }
    }
    const mergedIdx = [...nodes[bestI].indices, ...nodes[bestJ].indices];
    const newCentroid = new Array<number>(d).fill(0);
    mergedIdx.forEach(idx => {
      for (let k = 0; k < d; k++) newCentroid[k] += scaled[idx][k];
    });
    for (let k = 0; k < d; k++) newCentroid[k] /= mergedIdx.length;
    nodes = nodes.filter((_, idx) => idx !== bestI && idx !== bestJ);
    nodes.push({ indices: mergedIdx, centroid: newCentroid });
  }

  const clusters: ClusterProfile[] = nodes
    .map((node, idx) => {
      const summary: Record<string, number> = {};
      cols.forEach((col, j) => {
        summary[col] = roundN(node.indices.reduce((s, ri) => s + rawVectors[ri][j], 0) / node.indices.length, 2);
      });
      return {
        clusterId: idx + 1,
        label: `Hierarki Cabang ${idx + 1}`,
        size: node.indices.length,
        sharePct: roundN((node.indices.length / rawVectors.length) * 100, 1),
        centroidSummary: summary,
      };
    })
    .sort((a, b) => (b.centroidSummary[cols[0]] || 0) - (a.centroidSummary[cols[0]] || 0));

  return {
    executed: true,
    sampleSize: rawVectors.length,
    clusterCount: clusters.length,
    clusters,
  };
}

function runAssociationRuleMining(
  data: Record<string, any>[],
  categoricalCols: string[]
): DataMiningReport['associationRules'] {
  if (data.length < 6 || categoricalCols.length < 2) {
    return {
      executed: false,
      skipReason: 'Membutuhkan ≥2 kolom kategorikal dengan ≥6 observasi untuk Association Rule Mining.',
      rules: [],
    };
  }

  const colA = categoricalCols[0];
  const colB = categoricalCols[1];
  const itemCounts = new Map<string, number>();
  const pairCounts = new Map<string, number>();
  let totalTx = 0;

  for (const row of data) {
    const va = String(row[colA] ?? '').trim();
    const vb = String(row[colB] ?? '').trim();
    if (!va || !vb) continue;
    totalTx++;
    const tokenA = `${colA}=${va}`;
    const tokenB = `${colB}=${vb}`;
    itemCounts.set(tokenA, (itemCounts.get(tokenA) || 0) + 1);
    itemCounts.set(tokenB, (itemCounts.get(tokenB) || 0) + 1);
    const key = `${tokenA}|||${tokenB}`;
    pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
  }

  if (totalTx < 6) {
    return {
      executed: false,
      skipReason: 'Pasangan nilai kategorikal tidak cukup untuk menghitung Support/Confidence/Lift.',
      rules: [],
    };
  }

  const rules: AssociationRuleItem[] = [];
  for (const [key, coCnt] of pairCounts.entries()) {
    if (coCnt < 2) continue;
    const [ant, con] = key.split('|||');
    const antCnt = itemCounts.get(ant) || 1;
    const conCnt = itemCounts.get(con) || 1;
    const support = coCnt / totalTx;
    const confidence = coCnt / antCnt;
    const expectedConf = conCnt / totalTx;
    const lift = expectedConf > 0 ? confidence / expectedConf : 1;
    if (support >= 0.05 && confidence >= 0.35) {
      rules.push({
        antecedent: ant,
        consequent: con,
        support: roundN(support, 3),
        confidence: roundN(confidence, 3),
        lift: roundN(lift, 2),
        coOccurrences: coCnt,
      });
    }
  }

  rules.sort((a, b) => b.lift - a.lift || b.confidence - a.confidence);
  return {
    executed: rules.length > 0,
    skipReason: rules.length === 0 ? 'Tidak ada kombinasi kategori yang melampaui ambang support ≥ 5% & confidence ≥ 35%.' : undefined,
    rules: rules.slice(0, 6),
  };
}

// ============================================================================
// MAIN UNIFIED PIPELINE
// ============================================================================

export function runIntelligencePipeline(
  dataset: StoredDataset | null,
  activeRows?: Record<string, any>[]
): IntelligenceReport {
  const rows = activeRows || dataset?.data || [];
  const datasetId = dataset?.id || 'unknown';
  const datasetName = dataset?.name || 'Dataset Aktif';
  const analysisMode = dataset?.analysisMode || 'structured';
  const profile = profileDataset(rows);

  const numericCols = profile.columns.filter(c => c.baseType === 'numeric' && c.semanticType !== 'Identifier');
  const dateCols = profile.columns.filter(c => c.baseType === 'date');
  const categoricalCols = profile.columns.filter(c => c.baseType === 'categorical' && c.semanticType !== 'Identifier');

  // Identify data period if date column exists
  let dataPeriod = 'Non-Time-Series (Cross-Sectional)';
  let primaryDateCol: string | undefined;
  if (dateCols.length > 0 && rows.length > 0) {
    primaryDateCol = dateCols[0].name;
    const validDates = rows
      .map(r => Date.parse(String(r[primaryDateCol!] ?? '')))
      .filter(ts => !Number.isNaN(ts))
      .sort((a, b) => a - b);
    if (validDates.length >= 2) {
      const startIso = new Date(validDates[0]).toISOString().slice(0, 10);
      const endIso = new Date(validDates[validDates.length - 1]).toISOString().slice(0, 10);
      dataPeriod = `${startIso} s/d ${endIso}`;
    }
  }

  // Pick primary metric column (prefer Revenue/Sales/Profit/MRR/Score else highest sum)
  const primaryMetricCol =
    numericCols.find(c => /(revenue|sales|profit|mrr|total|omzet|nilai|score|skor)/i.test(c.name)) ||
    [...numericCols].sort((a, b) => (b.numericStats?.sum || 0) - (a.numericStats?.sum || 0))[0];

  const primaryCatCol =
    categoricalCols.find(c => /(region|category|kategori|wilayah|product|channel|segment)/i.test(c.name)) ||
    categoricalCols[0];

  // 1. EDA: Correlation Matrix + Top Pairs
  const matrixCols = numericCols.slice(0, 8).map(c => c.name);
  const corrMatrix: number[][] = matrixCols.map(() => new Array<number>(matrixCols.length).fill(0));
  const topCorrelations: CorrelationPair[] = [];

  for (let i = 0; i < matrixCols.length; i++) {
    corrMatrix[i][i] = 1;
    for (let j = i + 1; j < matrixCols.length; j++) {
      const colA = matrixCols[i];
      const colB = matrixCols[j];
      const xs: number[] = [];
      const ys: number[] = [];
      for (const row of rows) {
        const a = parseNum(row[colA]);
        const b = parseNum(row[colB]);
        if (a !== null && b !== null) {
          xs.push(a);
          ys.push(b);
        }
      }
      const r = xs.length >= 3 ? roundN(computePearsonR(xs, ys), 3) : 0;
      const rho = xs.length >= 3 ? roundN(computeSpearmanRho(xs, ys), 3) : 0;
      const tau = xs.length >= 3 ? roundN(computeKendallTau(xs, ys), 3) : 0;
      corrMatrix[i][j] = r;
      corrMatrix[j][i] = r;

      if (xs.length >= 4) {
        const absR = Math.abs(r);
        const strength: CorrelationPair['strength'] =
          absR >= 0.8 ? 'Sangat Kuat' : absR >= 0.6 ? 'Kuat' : absR >= 0.35 ? 'Sedang' : 'Lemah';
        const direction: CorrelationPair['direction'] = r >= 0 ? 'Positif' : 'Negatif';
        const tVal = absR >= 0.9999 ? 100 : (absR * Math.sqrt(xs.length - 2)) / Math.sqrt(1 - absR * absR);
        const pVal = roundN(twoTailedTTestPValue(tVal, xs.length - 2), 4);
        topCorrelations.push({
          colA,
          colB,
          n: xs.length,
          pearsonR: r,
          spearmanRho: rho,
          kendallTau: tau,
          strength,
          direction,
          pValueApprox: pVal,
          note: `Korelasi ${direction.toLowerCase()} ${strength.toLowerCase()} (Pearson r=${r}, Spearman ρ=${rho}, p=${pVal}). Korelasi bukan bukti kausalitas langsung.`,
        });
      }
    }
  }
  topCorrelations.sort((a, b) => Math.abs(b.pearsonR) - Math.abs(a.pearsonR));

  // 2. Primary Group Comparison
  let primaryGroupComparison: IntelligenceReport['eda']['primaryGroupComparison'] = null;
  if (primaryMetricCol && primaryCatCol && rows.length > 0) {
    const grouped = new Map<string, { sum: number; count: number }>();
    let totalSum = 0;
    let totalCount = 0;
    for (const row of rows) {
      const dim = String(row[primaryCatCol.name] ?? '').trim();
      const val = parseNum(row[primaryMetricCol.name]);
      if (!dim || val === null) continue;
      totalSum += val;
      totalCount++;
      const prev = grouped.get(dim) || { sum: 0, count: 0 };
      prev.sum += val;
      prev.count += 1;
      grouped.set(dim, prev);
    }
    const overallMean = totalCount > 0 ? totalSum / totalCount : 0;
    const groups: GroupComparisonEntry[] = Array.from(grouped.entries())
      .map(([groupValue, g]) => {
        const mean = g.sum / g.count;
        return {
          groupValue,
          count: g.count,
          sum: roundN(g.sum, 2),
          mean: roundN(mean, 2),
          sharePct: totalSum !== 0 ? roundN((g.sum / totalSum) * 100, 2) : 0,
          deltaFromMeanPct: overallMean !== 0 ? roundN(((mean - overallMean) / Math.abs(overallMean)) * 100, 1) : 0,
        };
      })
      .sort((a, b) => b.sum - a.sum);

    if (groups.length > 0) {
      primaryGroupComparison = {
        metricCol: primaryMetricCol.name,
        dimensionCol: primaryCatCol.name,
        groups,
      };
    }
  }

  // 3. Time Series Summary & Forecasting Integration
  let timeSeriesSummary: IntelligenceReport['eda']['timeSeriesSummary'] = {
    available: false,
    periodsCount: 0,
    skipReason: 'Dataset tidak memiliki kolom tanggal valid atau jumlah periode < 3.',
  };
  let forecastingResult: IntelligenceReport['forecasting'] = {
    available: false,
    skipReason: 'Dataset tidak memiliki kolom tanggal & metrik numerik yang memenuhi syarat time-series (min 6 observasi).',
  };

  if (primaryDateCol && primaryMetricCol && rows.length >= 3) {
    const byDate = new Map<string, number>();
    for (const row of rows) {
      const ts = Date.parse(String(row[primaryDateCol] ?? ''));
      const val = parseNum(row[primaryMetricCol.name]);
      if (!Number.isNaN(ts) && val !== null) {
        const dKey = new Date(ts).toISOString().slice(0, 10);
        byDate.set(dKey, (byDate.get(dKey) || 0) + val);
      }
    }
    const ordered = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    if (ordered.length >= 3) {
      const firstVal = ordered[0][1];
      const lastVal = ordered[ordered.length - 1][1];
      const overallGrowthPct = firstVal !== 0 ? roundN(((lastVal - firstVal) / Math.abs(firstVal)) * 100, 2) : 0;
      const periodGrowths: number[] = [];
      for (let i = 1; i < ordered.length; i++) {
        if (ordered[i - 1][1] !== 0) {
          periodGrowths.push(((ordered[i][1] - ordered[i - 1][1]) / Math.abs(ordered[i - 1][1])) * 100);
        }
      }
      const avgPeriodGrowthPct =
        periodGrowths.length > 0
          ? roundN(periodGrowths.reduce((s, v) => s + v, 0) / periodGrowths.length, 2)
          : 0;
      const peak = [...ordered].sort((a, b) => b[1] - a[1])[0];
      const trough = [...ordered].sort((a, b) => a[1] - b[1])[0];

      timeSeriesSummary = {
        available: true,
        dateCol: primaryDateCol,
        metricCol: primaryMetricCol.name,
        periodsCount: ordered.length,
        startDate: ordered[0][0],
        endDate: ordered[ordered.length - 1][0],
        firstValue: roundN(firstVal, 2),
        lastValue: roundN(lastVal, 2),
        overallGrowthPct,
        avgPeriodGrowthPct,
        peakPeriod: { date: peak[0], value: roundN(peak[1], 2) },
        troughPeriod: { date: trough[0], value: roundN(trough[1], 2) },
      };

      if (ordered.length >= 6) {
        const fcRes = runAdvancedForecastPipeline({
          rows,
          dateColumn: primaryDateCol,
          targetColumn: primaryMetricCol.name,
          frequency: 'auto',
          method: 'auto',
          horizon: ordered.length <= 18 ? '3m' : '30d',
          confidenceLevel: 0.95,
        });
        if (fcRes.success && fcRes.result) {
          forecastingResult = { available: true, output: fcRes.result };
        } else {
          forecastingResult = {
            available: false,
            skipReason: fcRes.error || 'Data time-series belum cukup stabil untuk proyeksi.',
          };
        }
      }
    }
  }

  // 4. Statistical Inferential Tests
  const inferentialTests: InferentialTestResult[] = [];
  if (primaryCatCol && primaryMetricCol) {
    inferentialTests.push(runWelchTTest(rows, primaryCatCol.name, primaryMetricCol.name));
    inferentialTests.push(runOneWayAnova(rows, primaryCatCol.name, primaryMetricCol.name));
  }
  if (categoricalCols.length >= 2) {
    inferentialTests.push(runChiSquareTest(rows, categoricalCols[0].name, categoricalCols[1].name));
  }

  // 5. Data Mining
  const kmeans = runKMeansClustering(rows, numericCols.map(c => c.name));
  const hierarchical = runHierarchicalSummary(rows, numericCols.map(c => c.name));
  const associationRules = runAssociationRuleMining(rows, categoricalCols.map(c => c.name));

  let regression: RegressionSummary = {
    executed: false,
    skipReason: 'Membutuhkan ≥2 kolom numerik dengan ≥4 observasi valid untuk Regresi Linear OLS.',
    targetCol: primaryMetricCol?.name || '-',
    featureCol: '-',
    slope: 0,
    intercept: 0,
    r2: 0,
    rmse: 0,
    equation: '',
  };

  if (primaryMetricCol && topCorrelations.length > 0) {
    const bestPair =
      topCorrelations.find(p => p.colA === primaryMetricCol.name || p.colB === primaryMetricCol.name) ||
      topCorrelations[0];
    const targetCol = primaryMetricCol.name;
    const featureCol = bestPair.colA === targetCol ? bestPair.colB : bestPair.colA;
    const xs: number[] = [];
    const ys: number[] = [];
    for (const row of rows) {
      const x = parseNum(row[featureCol]);
      const y = parseNum(row[targetCol]);
      if (x !== null && y !== null) {
        xs.push(x);
        ys.push(y);
      }
    }
    if (xs.length >= 4) {
      const mx = xs.reduce((s, v) => s + v, 0) / xs.length;
      const my = ys.reduce((s, v) => s + v, 0) / ys.length;
      const sxx = xs.reduce((s, v) => s + Math.pow(v - mx, 2), 0);
      const sxy = xs.reduce((s, v, idx) => s + (v - mx) * (ys[idx] - my), 0);
      if (sxx > 0) {
        const slope = sxy / sxx;
        const intercept = my - slope * mx;
        const preds = xs.map(x => slope * x + intercept);
        const sse = ys.reduce((s, y, i) => s + Math.pow(y - preds[i], 2), 0);
        const sst = ys.reduce((s, y) => s + Math.pow(y - my, 2), 0);
        const r2 = sst > 0 ? Math.max(0, 1 - sse / sst) : 0;
        const rmse = Math.sqrt(sse / ys.length);
        regression = {
          executed: true,
          targetCol,
          featureCol,
          slope: roundN(slope, 3),
          intercept: roundN(intercept, 2),
          r2: roundN(r2, 3),
          rmse: roundN(rmse, 2),
          equation: `${targetCol} = ${roundN(slope, 3)} × ${featureCol} + ${roundN(intercept, 2)}`,
        };
      }
    }
  }

  // Multi-column Anomaly Detection (IQR + Z-Score)
  const anomalies: AnomalyRecord[] = [];
  for (const col of numericCols.slice(0, 5)) {
    const st = col.numericStats;
    if (!st) continue;
    const lowerIqr = st.q1 - 1.5 * st.iqr;
    const upperIqr = st.q3 + 1.5 * st.iqr;
    rows.forEach((row, rIdx) => {
      const v = parseNum(row[col.name]);
      if (v === null) return;
      const ctxVal = primaryCatCol ? String(row[primaryCatCol.name] ?? `Baris #${rIdx + 1}`) : `Baris #${rIdx + 1}`;
      if (st.stdDev > 0 && Math.abs((v - st.mean) / st.stdDev) > 2.8) {
        const z = roundN((v - st.mean) / st.stdDev, 2);
        anomalies.push({
          rowIndex: rIdx + 1,
          column: col.name,
          value: v,
          method: 'Z-Score',
          zScore: z,
          expectedBounds: `[${fmtId(st.mean - 2.8 * st.stdDev)} s/d ${fmtId(st.mean + 2.8 * st.stdDev)}]`,
          contextLabel: ctxVal,
        });
      } else if (st.iqr > 0 && (v < lowerIqr || v > upperIqr)) {
        anomalies.push({
          rowIndex: rIdx + 1,
          column: col.name,
          value: v,
          method: 'IQR',
          expectedBounds: `[${fmtId(lowerIqr)} s/d ${fmtId(upperIqr)}]`,
          contextLabel: ctxVal,
        });
      }
    });
  }

  const mining: DataMiningReport = {
    kmeans,
    hierarchical,
    associationRules,
    regression,
    anomalies: anomalies.slice(0, 20),
  };

  // 6. Root Cause & Diagnostic Analysis
  let rootCause: RootCauseDiagnosticReport | null = null;
  if (primaryMetricCol && primaryGroupComparison && primaryGroupComparison.groups.length >= 2) {
    const groups = primaryGroupComparison.groups;
    const topPos = groups[0];
    const topNeg = [...groups].sort((a, b) => a.mean - b.mean)[0];
    const overallMean = primaryMetricCol.numericStats?.mean || 0;
    const factors: RootCauseFactor[] = [
      {
        tier: 'Fakta Terukur',
        title: `Kontributor Utama: Segmen '${topPos.groupValue}'`,
        detail: `Menyumbang ${topPos.sharePct}% dari total [${primaryMetricCol.name}] (${fmtId(topPos.sum)}) dengan rata-rata ${fmtId(topPos.mean)} per observasi (${topPos.deltaFromMeanPct >= 0 ? '+' : ''}${topPos.deltaFromMeanPct}% vs rata-rata global).`,
        evidenceMetric: `Share ${topPos.sharePct}% · Mean ${fmtId(topPos.mean)}`,
        impactContributionPct: topPos.sharePct,
      },
      {
        tier: 'Fakta Terukur',
        title: `Titik Tarik Bawah: Segmen '${topNeg.groupValue}'`,
        detail: `Rata-rata hanya ${fmtId(topNeg.mean)} (${topNeg.deltaFromMeanPct}% dibanding rata-rata dataset ${fmtId(overallMean)}) pada ${topNeg.count} observasi.`,
        evidenceMetric: `Mean ${fmtId(topNeg.mean)} (${topNeg.deltaFromMeanPct}%)`,
        impactContributionPct: topNeg.sharePct,
      },
    ];

    if (topCorrelations.length > 0) {
      const strong = topCorrelations[0];
      factors.push({
        tier: 'Faktor Berkorelasi',
        title: `Asosiasi Terkuat: ${strong.colA} ↔ ${strong.colB}`,
        detail: `Terdapat korelasi ${strong.direction.toLowerCase()} ${strong.strength.toLowerCase()} (r=${strong.pearsonR}, Spearman ρ=${strong.spearmanRho}, p=${strong.pValueApprox}). Catatan ilmiah: korelasi kuat belum membuktikan kausalitas sepihak.`,
        evidenceMetric: `r = ${strong.pearsonR} | p = ${strong.pValueApprox}`,
      });
    }

    factors.push({
      tier: 'Dugaan Penyebab',
      title: `Disparitas Mix Volume & Efisiensi antar [${primaryCatCol?.name}]`,
      detail: `Rasio rata-rata antara segmen tertinggi (${fmtId(topPos.mean)}) dan terendah (${fmtId(topNeg.mean)}) mencapai ${topNeg.mean !== 0 ? roundN(topPos.mean / Math.abs(topNeg.mean), 2) : 'N/A'}×, mengindikasikan perbedaan bauran harga, skala transaksi, atau penetrasi kanal.`,
      evidenceMetric: `Spread Mean: ${fmtId(topPos.mean - topNeg.mean)}`,
    });

    factors.push({
      tier: 'Hipotesis Uji Lanjutan',
      title: 'Validasi Kausalitas Melalui Eksperimen / Variabel Kontrol',
      detail: `Untuk memastikan apakah perubahan pada '${topNeg.groupValue}' dapat mengejar '${topPos.groupValue}', diperlukan A/B test atau regresi multivariat dengan variabel kontrol kapasitas, biaya promosi, dan musiman.`,
      evidenceMetric: 'Rekomendasi Uji Eksperimental Terkontrol',
    });

    rootCause = {
      targetMetric: primaryMetricCol.name,
      dimensionAnalyzed: primaryCatCol!.name,
      overallMean,
      topPositiveDriver: topPos,
      topNegativeDrag: topNeg,
      factors,
    };
  }

  // 7. 10-Category Automated Insights
  const insights: GroundedInsightItem[] = buildTenCategoryInsights({
    dataset,
    datasetName,
    analysisMode,
    dataPeriod,
    profile,
    primaryMetricCol,
    primaryCatCol,
    topCorrelations,
    primaryGroupComparison,
    timeSeriesSummary,
    inferentialTests,
    mining,
    forecastingResult,
  });

  // 8. Auto Visualization Recommendations
  const chartRecommendations = buildChartRecommendations(
    profile,
    primaryMetricCol,
    primaryCatCol,
    primaryDateCol,
    topCorrelations
  );

  // 9. 14-Section Executive Summary
  const executiveSummary = buildExecutiveSummary14({
    dataset,
    datasetName,
    analysisMode,
    dataPeriod,
    profile,
    primaryMetricCol,
    primaryCatCol,
    topCorrelations,
    primaryGroupComparison,
    timeSeriesSummary,
    inferentialTests,
    mining,
    rootCause,
    forecastingResult,
    insights,
  });

  return {
    datasetId,
    datasetName,
    analysisMode,
    generatedAt: new Date().toISOString(),
    dataPeriod,
    profile,
    eda: {
      correlationMatrix: { columns: matrixCols, matrix: corrMatrix },
      topCorrelations: topCorrelations.slice(0, 12),
      primaryGroupComparison,
      timeSeriesSummary,
    },
    statistics: { inferentialTests },
    mining,
    rootCause,
    forecasting: forecastingResult,
    insights,
    chartRecommendations,
    executiveSummary,
  };
}

// ============================================================================
// 10-CATEGORY INSIGHT BUILDER
// ============================================================================

function buildTenCategoryInsights(ctx: {
  dataset: StoredDataset | null;
  datasetName: string;
  analysisMode: 'structured' | 'document';
  dataPeriod: string;
  profile: DataProfileReport;
  primaryMetricCol?: DetailedColumnProfile;
  primaryCatCol?: DetailedColumnProfile;
  topCorrelations: CorrelationPair[];
  primaryGroupComparison: IntelligenceReport['eda']['primaryGroupComparison'];
  timeSeriesSummary: IntelligenceReport['eda']['timeSeriesSummary'];
  inferentialTests: InferentialTestResult[];
  mining: DataMiningReport;
  forecastingResult: IntelligenceReport['forecasting'];
}): GroundedInsightItem[] {
  const {
    dataset,
    datasetName,
    analysisMode,
    dataPeriod,
    profile,
    primaryMetricCol,
    primaryCatCol,
    topCorrelations,
    primaryGroupComparison,
    timeSeriesSummary,
    inferentialTests,
    mining,
    forecastingResult,
  } = ctx;

  const list: GroundedInsightItem[] = [];
  const docMeta = dataset?.documentContent;

  // Document Intelligence mode handling (never fabricate numeric KPIs)
  if (analysisMode === 'document' && docMeta) {
    list.push({
      id: 'ins-doc-perf',
      title: 'Struktur Dokumen Naratif & Kelengkapan Ekstraksi',
      category: 'PERFORMANCE',
      finding: `Dokumen '${datasetName}' terklasifikasi sebagai Document Intelligence (${docMeta.pageCount} halaman, ${docMeta.wordCount.toLocaleString('id-ID')} kata, ${docMeta.headingCount} tajuk/section, ${docMeta.tableCount} tabel terdeteksi).`,
      statisticalEvidence: `Page Count=${docMeta.pageCount}, Word Count=${docMeta.wordCount}, Paragraph Count=${docMeta.paragraphCount}`,
      supportingValues: `${docMeta.wordCount.toLocaleString('id-ID')} kata · ${docMeta.pageCount} hal`,
      relatedColumns: ['Sections', 'Paragraphs'],
      dataPeriod,
      sourceDataset: datasetName,
      impactLevel: 'HIGH',
      confidenceLevel: 'HIGH',
      recommendedAction: 'Tinjau panel Document Intelligence dan gunakan AI Data Analyst untuk tanya-jawab kontekstual isi dokumen.',
    });
  }

  // 1. PERFORMANCE
  if (primaryMetricCol?.numericStats) {
    const st = primaryMetricCol.numericStats;
    list.push({
      id: 'ins-perf-1',
      title: `Akumulasi Kinerja Metrik Utama [${primaryMetricCol.name}]`,
      category: 'PERFORMANCE',
      finding: `Total [${primaryMetricCol.name}] tercatat sebesar ${fmtId(st.sum)} pada ${primaryMetricCol.nonNullCount} observasi valid, dengan rata-rata ${fmtId(st.mean)} dan median ${fmtId(st.median)}.`,
      statisticalEvidence: `Sum=${fmtId(st.sum)}, Mean=${fmtId(st.mean)}, Median=${fmtId(st.median)}, Min=${fmtId(st.min)}, Max=${fmtId(st.max)}`,
      supportingValues: fmtId(st.sum),
      relatedColumns: [primaryMetricCol.name],
      dataPeriod,
      sourceDataset: datasetName,
      impactLevel: 'HIGH',
      confidenceLevel: 'HIGH',
      recommendedAction: `Tetapkan benchmark operasional harian berbasis median (${fmtId(st.median)}) dan rata-rata (${fmtId(st.mean)}) untuk evaluasi kinerja rutin.`,
    });
  }

  // 2. TREND
  if (timeSeriesSummary.available) {
    const dir = (timeSeriesSummary.overallGrowthPct || 0) >= 0 ? 'kenaikan' : 'penurunan';
    list.push({
      id: 'ins-trend-1',
      title: `Lintasan Tren Historis ${dir === 'kenaikan' ? 'Positif' : 'Melemah'} [${timeSeriesSummary.metricCol}]`,
      category: 'TREND',
      finding: `Sepanjang ${timeSeriesSummary.periodsCount} periode (${timeSeriesSummary.startDate} s/d ${timeSeriesSummary.endDate}), [${timeSeriesSummary.metricCol}] mencatat ${dir} kumulatif ${timeSeriesSummary.overallGrowthPct}% dengan rata-rata pertumbuhan antar periode ${timeSeriesSummary.avgPeriodGrowthPct}%.`,
      statisticalEvidence: `Awal=${fmtId(timeSeriesSummary.firstValue || 0)}, Akhir=${fmtId(timeSeriesSummary.lastValue || 0)}, Puncak=${timeSeriesSummary.peakPeriod?.date} (${fmtId(timeSeriesSummary.peakPeriod?.value || 0)})`,
      supportingValues: `${(timeSeriesSummary.overallGrowthPct || 0) >= 0 ? '+' : ''}${timeSeriesSummary.overallGrowthPct}%`,
      relatedColumns: [timeSeriesSummary.dateCol || 'Date', timeSeriesSummary.metricCol || 'Metric'],
      dataPeriod,
      sourceDataset: datasetName,
      impactLevel: Math.abs(timeSeriesSummary.overallGrowthPct || 0) >= 15 ? 'CRITICAL' : 'HIGH',
      confidenceLevel: 'HIGH',
      recommendedAction: 'Monitor momentum periode terakhir dan pelajari faktor operasional pada tanggal puncak agar dapat direplikasi.',
    });
  } else {
    list.push({
      id: 'ins-trend-skip',
      title: 'Keterbatasan Analisis Tren Berbasis Waktu',
      category: 'TREND',
      finding: 'Dataset ini tidak memiliki kolom tanggal berurutan yang memadai (≥3 periode berbeda), sehingga tren temporal tidak dipaksakan untuk mencegah kesimpulan palsu.',
      statisticalEvidence: `Date Columns Terdeteksi: ${profile.columns.filter(c => c.baseType === 'date').length}`,
      supportingValues: 'Cross-Sectional',
      relatedColumns: profile.columns.slice(0, 2).map(c => c.name),
      dataPeriod,
      sourceDataset: datasetName,
      impactLevel: 'LOW',
      confidenceLevel: 'HIGH',
      recommendedAction: 'Tambahkan kolom timestamp transaksi/survei apabila ingin memantau evolusi tren dari waktu ke waktu.',
    });
  }

  // 3. COMPARATIVE
  if (primaryGroupComparison && primaryGroupComparison.groups.length >= 2) {
    const top = primaryGroupComparison.groups[0];
    const bottom = primaryGroupComparison.groups[primaryGroupComparison.groups.length - 1];
    const anova = inferentialTests.find(t => t.testName === 'One-Way ANOVA' && t.executed);
    list.push({
      id: 'ins-comp-1',
      title: `Disparitas Antar Segmen [${primaryGroupComparison.dimensionCol}]`,
      category: 'COMPARATIVE',
      finding: `Segmen '${top.groupValue}' memimpin dengan total ${fmtId(top.sum)} (${top.sharePct}% share; mean ${fmtId(top.mean)}), sedangkan '${bottom.groupValue}' berada di posisi terendah (${bottom.sharePct}% share; mean ${fmtId(bottom.mean)}).`,
      statisticalEvidence: anova
        ? `${anova.statisticName}=${anova.statisticValue}, p=${anova.pValue}, η²=${anova.effectSizeValue}`
        : `Top=${top.sharePct}% vs Bottom=${bottom.sharePct}%`,
      supportingValues: `${top.sharePct}% vs ${bottom.sharePct}%`,
      relatedColumns: [primaryGroupComparison.dimensionCol, primaryGroupComparison.metricCol],
      dataPeriod,
      sourceDataset: datasetName,
      impactLevel: anova?.significantAt05 ? 'CRITICAL' : 'HIGH',
      confidenceLevel: anova?.significantAt05 ? 'HIGH' : 'MEDIUM',
      recommendedAction: `Audit perbedaan proses antara '${top.groupValue}' dan '${bottom.groupValue}' untuk mereplikasi praktik terbaik segmen unggulan.`,
    });
  }

  // 4. CORRELATION
  if (topCorrelations.length > 0) {
    const c = topCorrelations[0];
    list.push({
      id: 'ins-corr-1',
      title: `Korelasi ${c.direction} ${c.strength}: ${c.colA} ↔ ${c.colB}`,
      category: 'CORRELATION',
      finding: `Ditemukan korelasi linear Pearson r=${c.pearsonR} (Spearman ρ=${c.spearmanRho}, Kendall τ=${c.kendallTau}, n=${c.n}, p=${c.pValueApprox}). Asosiasi ini bukan bukti sebab-akibat langsung.`,
      statisticalEvidence: `r=${c.pearsonR}, ρ=${c.spearmanRho}, τ=${c.kendallTau}, p=${c.pValueApprox}`,
      supportingValues: `r = ${c.pearsonR}`,
      relatedColumns: [c.colA, c.colB],
      dataPeriod,
      sourceDataset: datasetName,
      impactLevel: Math.abs(c.pearsonR) >= 0.7 ? 'HIGH' : 'MEDIUM',
      confidenceLevel: c.pValueApprox < 0.05 ? 'HIGH' : 'MEDIUM',
      recommendedAction: `Jadikan '${c.colA}' dan '${c.colB}' sebagai indikator pemantauan bersama pada dashboard KPI, namun lakukan uji terkontrol sebelum mengasumsikan kausalitas.`,
    });
  }

  // 5. ANOMALY
  if (mining.anomalies.length > 0) {
    const first = mining.anomalies[0];
    list.push({
      id: 'ins-anom-1',
      title: `${mining.anomalies.length} Nilai Ekstrem (Outlier) Terdeteksi`,
      category: 'ANOMALY',
      finding: `Teridentifikasi ${mining.anomalies.length} titik anomali secara matematis (IQR / Z-Score). Contoh paling mencolok pada baris #${first.rowIndex} (${first.contextLabel}) kolom [${first.column}] bernilai ${fmtId(first.value)} di luar rentang normal ${first.expectedBounds}.`,
      statisticalEvidence: `Total Anomalies=${mining.anomalies.length}, Metode=${first.method}, Bounds=${first.expectedBounds}`,
      supportingValues: `${mining.anomalies.length} Outlier`,
      relatedColumns: Array.from(new Set(mining.anomalies.map(a => a.column))).slice(0, 3),
      dataPeriod,
      sourceDataset: datasetName,
      impactLevel: mining.anomalies.length >= 5 ? 'CRITICAL' : 'HIGH',
      confidenceLevel: 'HIGH',
      recommendedAction: 'Verifikasi apakah anomali merupakan transaksi korporat valid atau kesalahan input; terapkan capping/filtering di Modul Data Cleaning bila mengganggu model.',
    });
  } else {
    list.push({
      id: 'ins-anom-clean',
      title: 'Stabilitas Distribusi Bebas Outlier Ekstrem',
      category: 'ANOMALY',
      finding: 'Pemeriksaan 1.5×IQR dan |Z-Score|>2.8 pada kolom numerik tidak menemukan penyimpangan ekstrem yang signifikan.',
      statisticalEvidence: '0 record di luar batas 1.5×IQR / Z>2.8',
      supportingValues: '0 Anomali',
      relatedColumns: primaryMetricCol ? [primaryMetricCol.name] : [],
      dataPeriod,
      sourceDataset: datasetName,
      impactLevel: 'LOW',
      confidenceLevel: 'HIGH',
      recommendedAction: 'Pertahankan kontrol validasi input data yang sudah berjalan baik.',
    });
  }

  // 6. DISTRIBUTION
  if (primaryMetricCol?.numericStats) {
    const st = primaryMetricCol.numericStats;
    const skewLabel =
      Math.abs(st.skewness) < 0.5
        ? 'cenderung simetris'
        : st.skewness > 0
        ? 'menceng ke kanan (right-skewed / didominasi transaksi kecil namun ada beberapa nilai raksasa)'
        : 'menceng ke kiri (left-skewed)';
    list.push({
      id: 'ins-dist-1',
      title: `Karakteristik Sebaran & Volatilitas [${primaryMetricCol.name}]`,
      category: 'DISTRIBUTION',
      finding: `Sebaran [${primaryMetricCol.name}] memiliki Coefficient of Variation (CV) ${st.cvPct}% dan Skewness ${st.skewness} (${skewLabel}). Rentang antar-kuartil (IQR) berada di [${fmtId(st.q1)} – ${fmtId(st.q3)}].`,
      statisticalEvidence: `CV=${st.cvPct}%, Skew=${st.skewness}, Q1=${fmtId(st.q1)}, Q3=${fmtId(st.q3)}, P5–P95=[${fmtId(st.p5)}–${fmtId(st.p95)}]`,
      supportingValues: `CV ${st.cvPct}% · Skew ${st.skewness}`,
      relatedColumns: [primaryMetricCol.name],
      dataPeriod,
      sourceDataset: datasetName,
      impactLevel: st.cvPct >= 50 ? 'HIGH' : 'MEDIUM',
      confidenceLevel: 'HIGH',
      recommendedAction: Math.abs(st.skewness) >= 0.8 ? 'Gunakan Median dan IQR (bukan hanya Mean) saat menetapkan target agar tidak bias oleh nilai ekstrem.' : 'Gunakan rata-rata dan standar deviasi sebagai metrik kontrol kualitas operasional.',
    });
  }

  // 7. RISK
  const topShare = primaryGroupComparison?.groups[0]?.sharePct || 0;
  const riskIssueFound = profile.quality.overallScore < 85 || topShare >= 40;
  list.push({
    id: 'ins-risk-1',
    title: topShare >= 40 ? 'Risiko Konsentrasi Tinggi Pada Satu Segmen' : 'Risiko Integritas & Kualitas Data',
    category: 'RISK',
    finding:
      topShare >= 40
        ? `Segmen '${primaryGroupComparison!.groups[0].groupValue}' mendominasi ${topShare}% dari total [${primaryGroupComparison!.metricCol}]. Ketergantungan berlebihan meningkatkan kerentanan jika segmen ini melambat.`
        : `Skor Kualitas Data saat ini ${profile.quality.overallScore}/100 (${profile.quality.grade}) dengan ${profile.missingCells} sel kosong (${profile.missingPct}%) dan ${profile.duplicateRows} baris duplikat.`,
    statisticalEvidence:
      topShare >= 40
        ? `Top Segment Concentration = ${topShare}%, Quality Score = ${profile.quality.overallScore}/100`
        : `Completeness=${profile.quality.completenessScore}%, Uniqueness=${profile.quality.uniquenessScore}%`,
    supportingValues: topShare >= 40 ? `Konsentrasi ${topShare}%` : `Quality ${profile.quality.overallScore}/100`,
    relatedColumns: primaryGroupComparison ? [primaryGroupComparison.dimensionCol] : [],
    dataPeriod,
    sourceDataset: datasetName,
    impactLevel: riskIssueFound ? 'CRITICAL' : 'MEDIUM',
    confidenceLevel: 'HIGH',
    recommendedAction:
      topShare >= 40
        ? 'Lakukan diversifikasi bertahap pada segmen sekunder agar porsi kontribusi lebih seimbang.'
        : 'Jalankan Data Cleaning untuk menangani missing values & duplikasi sebelum pengambilan keputusan strategis.',
  });

  // 8. OPPORTUNITY
  if (mining.kmeans.executed && mining.kmeans.clusters.length >= 2) {
    const topCluster = mining.kmeans.clusters[0];
    const midCluster = mining.kmeans.clusters[1];
    list.push({
      id: 'ins-opp-1',
      title: `Peluang Upsell Dari Segmentasi K-Means (${mining.kmeans.clusters.length} Cluster)`,
      category: 'OPPORTUNITY',
      finding: `Algoritma K-Means (Silhouette=${mining.kmeans.silhouetteScore}) mengidentifikasi ${midCluster.size} entitas (${midCluster.sharePct}%) di '${midCluster.label}' yang berpotensi ditingkatkan menuju profil '${topCluster.label}'.`,
      statisticalEvidence: `K=${mining.kmeans.k}, Silhouette=${mining.kmeans.silhouetteScore}, Features=${mining.kmeans.features.join(', ')}`,
      supportingValues: `${midCluster.size} Entitas Target (${midCluster.sharePct}%)`,
      relatedColumns: mining.kmeans.features,
      dataPeriod,
      sourceDataset: datasetName,
      impactLevel: 'HIGH',
      confidenceLevel: mining.kmeans.silhouetteScore >= 0.35 ? 'HIGH' : 'MEDIUM',
      recommendedAction: `Rancang program retensi/cross-selling terfokus untuk kelompok '${midCluster.label}' guna mendorong konversi nilai ke kuartil teratas.`,
    });
  } else if (mining.associationRules.executed && mining.associationRules.rules.length > 0) {
    const r = mining.associationRules.rules[0];
    list.push({
      id: 'ins-opp-assoc',
      title: `Pola Asosiasi Kuat: ${r.antecedent} ➔ ${r.consequent}`,
      category: 'OPPORTUNITY',
      finding: `Association Rule Mining menemukan bahwa kemunculan ${r.antecedent} berpasangan dengan ${r.consequent} dengan confidence ${(r.confidence * 100).toFixed(1)}% dan Lift ${r.lift}×.`,
      statisticalEvidence: `Support=${r.support}, Confidence=${r.confidence}, Lift=${r.lift} (n=${r.coOccurrences})`,
      supportingValues: `Lift ${r.lift}× · Conf ${(r.confidence * 100).toFixed(0)}%`,
      relatedColumns: [r.antecedent.split('=')[0], r.consequent.split('=')[0]],
      dataPeriod,
      sourceDataset: datasetName,
      impactLevel: 'HIGH',
      confidenceLevel: 'MEDIUM',
      recommendedAction: 'Manfaatkan kombinasi pola ini untuk bundling produk atau penargetan kampanye lintas segmen.',
    });
  }

  // 9. PREDICTIVE
  if (forecastingResult.available && forecastingResult.output) {
    const ev = forecastingResult.output.evaluation;
    list.push({
      id: 'ins-pred-1',
      title: `Proyeksi Prediktif [${primaryMetricCol?.name}] (${ev.selectedModelName})`,
      category: 'PREDICTIVE',
      finding: `Model terbaik terpilih adalah ${ev.selectedModelName} dengan rata-rata proyeksi ${fmtId(ev.meanProjected)} (tren ${ev.trend}, perubahan ${ev.growthPercentage >= 0 ? '+' : ''}${ev.growthPercentage}%), 95% CI [${fmtId(ev.ci95Lower)} – ${fmtId(ev.ci95Upper)}].`,
      statisticalEvidence: `RMSE=${fmtId(ev.rmse)}, sMAPE=${ev.smape}%, R²=${ev.r2}, Validasi=${ev.validationStatus}`,
      supportingValues: `${ev.growthPercentage >= 0 ? '+' : ''}${ev.growthPercentage}% Proyeksi`,
      relatedColumns: [primaryDateColOrFallback(profile), primaryMetricCol?.name || 'Metric'],
      dataPeriod,
      sourceDataset: datasetName,
      impactLevel: 'HIGH',
      confidenceLevel: ev.validationStatus === 'VALIDATED' && ev.smape < 20 ? 'HIGH' : 'MEDIUM',
      recommendedAction: `Gunakan koridor proyeksi 80% CI [${fmtId(ev.ci80Lower)} – ${fmtId(ev.ci80Upper)}] sebagai basis perencanaan anggaran periode berikutnya.`,
    });
  } else if (mining.regression.executed) {
    const reg = mining.regression;
    list.push({
      id: 'ins-pred-reg',
      title: `Model Regresi Linear Prediktif [${reg.targetCol}]`,
      category: 'PREDICTIVE',
      finding: `Regresi OLS memodelkan ${reg.equation} dengan R²=${reg.r2} (menjelaskan ${(reg.r2 * 100).toFixed(1)}% variasi target) dan RMSE=${fmtId(reg.rmse)}.`,
      statisticalEvidence: `Equation: ${reg.equation} | R²=${reg.r2}, RMSE=${fmtId(reg.rmse)}`,
      supportingValues: `R² = ${reg.r2}`,
      relatedColumns: [reg.featureCol, reg.targetCol],
      dataPeriod,
      sourceDataset: datasetName,
      impactLevel: reg.r2 >= 0.6 ? 'HIGH' : 'MEDIUM',
      confidenceLevel: reg.r2 >= 0.6 ? 'HIGH' : 'MEDIUM',
      recommendedAction: 'Gunakan model ini sebagai estimator sensitivitas awal sambil tetap memantau error residual secara berkala.',
    });
  }

  // 10. STRATEGIC
  list.push({
    id: 'ins-strat-1',
    title: 'Prioritas Keputusan Strategis Berbasis Bukti Empiris',
    category: 'STRATEGIC',
    finding: `Integrasi Data Profiling (Skor ${profile.quality.overallScore}/100), EDA, dan Pengujian Statistik menghasilkan peta jalan tindakan yang terukur untuk mengoptimalkan [${primaryMetricCol?.name || 'variabel utama'}] tanpa bergantung pada asumsi subjektif.`,
    statisticalEvidence: `Quality=${profile.quality.overallScore}/100, Baris Teranalisis=${profile.rowCount}, Uji Signifikansi=${inferentialTests.filter(t => t.significantAt05).length}/${inferentialTests.filter(t => t.executed).length} signifikan`,
    supportingValues: `Skor ${profile.quality.overallScore}/100`,
    relatedColumns: [primaryMetricCol?.name, primaryCatCol?.name].filter((x): x is string => Boolean(x)),
    dataPeriod,
    sourceDataset: datasetName,
    impactLevel: 'HIGH',
    confidenceLevel: 'HIGH',
    recommendedAction: 'Eksekusi rekomendasi prioritas tinggi dalam 30 hari pertama dan tinjau kembali metrik pasca-intervensi pada siklus berikutnya.',
  });

  return list;
}

function primaryDateColOrFallback(profile: DataProfileReport): string {
  return profile.columns.find(c => c.baseType === 'date')?.name || 'Date';
}

// ============================================================================
// AUTO CHART RECOMMENDATIONS
// ============================================================================

function buildChartRecommendations(
  profile: DataProfileReport,
  primaryMetricCol?: DetailedColumnProfile,
  primaryCatCol?: DetailedColumnProfile,
  primaryDateCol?: string,
  topCorrelations: CorrelationPair[] = []
): ChartRecommendation[] {
  const recs: ChartRecommendation[] = [];
  const numCols = profile.columns.filter(c => c.baseType === 'numeric' && c.semanticType !== 'Identifier');
  const catCols = profile.columns.filter(c => c.baseType === 'categorical' && c.semanticType !== 'Identifier');

  if (primaryDateCol && primaryMetricCol) {
    recs.push({
      id: 'rec-line-ts',
      chartType: 'line',
      title: `Tren Waktu ${primaryMetricCol.name} per ${primaryDateCol}`,
      reason: 'Dataset memiliki kolom tanggal dan metrik numerik — Line/Area Chart ideal untuk membaca arah perubahan periodik.',
      xCol: primaryDateCol,
      yCol: primaryMetricCol.name,
      aggMode: 'sum',
      priority: 100,
    });
  }

  if (primaryCatCol && primaryMetricCol) {
    recs.push({
      id: 'rec-bar-cat',
      chartType: 'bar',
      title: `Perbandingan ${primaryMetricCol.name} Berdasarkan ${primaryCatCol.name}`,
      reason: 'Bar Chart sangat efektif untuk membandingkan ranking performa antar kategori.',
      xCol: primaryCatCol.name,
      yCol: primaryMetricCol.name,
      aggMode: 'sum',
      priority: 95,
    });

    if (primaryCatCol.uniqueCount <= 8) {
      recs.push({
        id: 'rec-donut-share',
        chartType: 'donut',
        title: `Komposisi Proporsi ${primaryMetricCol.name} (${primaryCatCol.name})`,
        reason: `Kategori [${primaryCatCol.name}] memiliki kardinalitas ringkas (${primaryCatCol.uniqueCount} grup), cocok untuk Donut/Treemap.`,
        xCol: primaryCatCol.name,
        yCol: primaryMetricCol.name,
        aggMode: 'sum',
        priority: 84,
      });
    }

    recs.push({
      id: 'rec-boxplot',
      chartType: 'boxplot',
      title: `Distribusi Kuartil (Box Plot) ${primaryMetricCol.name} per ${primaryCatCol.name}`,
      reason: 'Memperlihatkan Min, Q1, Median, Q3, dan Max tiap kategori untuk mendeteksi disparitas sebaran.',
      xCol: primaryCatCol.name,
      yCol: primaryMetricCol.name,
      aggMode: 'avg',
      priority: 82,
    });
  }

  if (primaryMetricCol) {
    recs.push({
      id: 'rec-hist',
      chartType: 'histogram',
      title: `Histogram Frekuensi Distribusi ${primaryMetricCol.name}`,
      reason: 'Memvisualisasikan bentuk distribusi, kemencengan (skewness), dan rentang nilai paling sering muncul.',
      xCol: primaryMetricCol.name,
      yCol: primaryMetricCol.name,
      aggMode: 'count',
      priority: 80,
    });
  }

  if (numCols.length >= 2) {
    const pair = topCorrelations[0];
    recs.push({
      id: 'rec-heatmap',
      chartType: 'heatmap',
      title: 'Correlation Matrix Heatmap Antar Variabel Numerik',
      reason: `Terdapat ${numCols.length} variabel numerik — Heatmap memetakan kekuatan korelasi Pearson seluruh pasangan sekaligus.`,
      xCol: numCols[0].name,
      yCol: numCols[1].name,
      aggMode: 'sum',
      priority: 88,
    });
    recs.push({
      id: 'rec-scatter',
      chartType: 'scatter',
      title: `Scatter Plot Hubungan ${pair ? `${pair.colA} vs ${pair.colB}` : `${numCols[0].name} vs ${numCols[1].name}`}`,
      reason: pair
        ? `Menunjukkan pola keterkaitan linear/non-linear dengan r=${pair.pearsonR}.`
        : 'Memvisualisasikan relasi antar dua metrik numerik.',
      xCol: pair?.colA || numCols[0].name,
      yCol: pair?.colB || numCols[1].name,
      aggMode: 'sum',
      priority: 85,
    });
  }

  if (catCols.length >= 1 && primaryMetricCol) {
    recs.push({
      id: 'rec-treemap',
      chartType: 'treemap',
      title: `Treemap Konsentrasi ${primaryMetricCol.name} (${catCols[0].name})`,
      reason: 'Menampilkan hierarki ukuran kontribusi tiap segmen dalam proporsi luas area.',
      xCol: catCols[0].name,
      yCol: primaryMetricCol.name,
      aggMode: 'sum',
      priority: 76,
    });
  }

  return recs.sort((a, b) => b.priority - a.priority);
}

// ============================================================================
// 14-SECTION EXECUTIVE SUMMARY BUILDER
// ============================================================================

function buildExecutiveSummary14(ctx: {
  dataset: StoredDataset | null;
  datasetName: string;
  analysisMode: 'structured' | 'document';
  dataPeriod: string;
  profile: DataProfileReport;
  primaryMetricCol?: DetailedColumnProfile;
  primaryCatCol?: DetailedColumnProfile;
  topCorrelations: CorrelationPair[];
  primaryGroupComparison: IntelligenceReport['eda']['primaryGroupComparison'];
  timeSeriesSummary: IntelligenceReport['eda']['timeSeriesSummary'];
  inferentialTests: InferentialTestResult[];
  mining: DataMiningReport;
  rootCause: RootCauseDiagnosticReport | null;
  forecastingResult: IntelligenceReport['forecasting'];
  insights: GroundedInsightItem[];
}): ExecutiveSummaryReport {
  const {
    dataset,
    datasetName,
    analysisMode,
    dataPeriod,
    profile,
    primaryMetricCol,
    primaryCatCol,
    topCorrelations,
    primaryGroupComparison,
    timeSeriesSummary,
    inferentialTests,
    mining,
    rootCause,
    forecastingResult,
    insights,
  } = ctx;

  const st = primaryMetricCol?.numericStats;
  const topGrp = primaryGroupComparison?.groups[0];
  const lowGrp = primaryGroupComparison?.groups[primaryGroupComparison.groups.length - 1];
  const sigTests = inferentialTests.filter(t => t.executed);

  const sections: ExecutiveSectionBlock[] = [
    {
      number: 1,
      title: '1. Informasi Umum Dataset & Konteks Analisis',
      content: `Dataset **${datasetName}** (Mode: **${analysisMode === 'document' ? 'Document Intelligence' : 'Structured Data Analytics'}**, File: \`${dataset?.fileName || '-'}\`) terdiri atas **${profile.rowCount.toLocaleString('id-ID')} baris** dan **${profile.colCount} kolom**, mencakup periode **${dataPeriod}**.`,
    },
    {
      number: 2,
      title: '2. Ringkasan Eksekutif (Executive Overview)',
      content:
        analysisMode === 'document' && dataset?.documentContent
          ? `Dokumen berisi ${dataset.documentContent.pageCount} halaman dan ${dataset.documentContent.wordCount.toLocaleString('id-ID')} kata dengan ${dataset.documentContent.tableCount} tabel terekstrak. Ringkasan struktural dan temuan utama disajikan secara objektif dari isi dokumen.`
          : `Analisis end-to-end menunjukkan Data Quality Score **${profile.quality.overallScore}/100 (${profile.quality.grade})**. ${primaryMetricCol && st ? `Variabel kunci **${primaryMetricCol.name}** mencapai total akumulasi **${fmtId(st.sum)}** (rata-rata **${fmtId(st.mean)}**, median **${fmtId(st.median)}**).` : 'Dataset didominasi oleh variabel kategorikal/teks tanpa metrik numerik finansial dominan.'}`,
    },
    {
      number: 3,
      title: '3. Profil Kualitas & Integritas Data',
      content: `Completeness: **${profile.quality.completenessScore}%** (${profile.missingCells} sel kosong / ${profile.missingPct}%), Uniqueness: **${profile.quality.uniquenessScore}%** (${profile.duplicateRows} baris duplikat), Consistency: **${profile.quality.consistencyScore}%**, Validity: **${profile.quality.validityScore}%**. ${profile.warnings.length > 0 ? `Catatan: ${profile.warnings.slice(0, 3).join('; ')}.` : 'Tidak ditemukan cacat kualitas mayor.'}`,
    },
    {
      number: 4,
      title: '4. Metodologi Pengolahan & Transformasi (ETL/ELT)',
      content: `Pipeline mengekstrak tipe kolom semantik (${profile.columns.map(c => `${c.name}:${c.semanticType}`).slice(0, 6).join(', ')}${profile.columns.length > 6 ? ', ...' : ''}), melakukan profiling distribusi, validasi kelayakan statistik/time-series, dan melacak garis keturunan data (Data Lineage: ${dataset?.lineage?.length || 1} tahap tercatat).`,
    },
    {
      number: 5,
      title: '5. Ringkasan KPI & Metrik Utama',
      content:
        st && primaryMetricCol
          ? `- **${primaryMetricCol.name} Total:** ${fmtId(st.sum)} | **Mean:** ${fmtId(st.mean)} | **Median:** ${fmtId(st.median)}\n- **Rentang (Min–Max):** ${fmtId(st.min)} s/d ${fmtId(st.max)} | **IQR:** [${fmtId(st.q1)}–${fmtId(st.q3)}]\n- **Volatilitas (CV%):** ${st.cvPct}% | **Skewness:** ${st.skewness}`
          : 'Tidak terdapat metrik numerik agregat yang relevan pada dataset ini.',
    },
    {
      number: 6,
      title: '6. Analisis Tren & Pola Waktu',
      content: timeSeriesSummary.available
        ? `Pada kolom waktu **${timeSeriesSummary.dateCol}** (${timeSeriesSummary.periodsCount} periode dari ${timeSeriesSummary.startDate} s/d ${timeSeriesSummary.endDate}), **${timeSeriesSummary.metricCol}** mencatat perubahan kumulatif **${timeSeriesSummary.overallGrowthPct}%** (rata-rata pertumbuhan/periode **${timeSeriesSummary.avgPeriodGrowthPct}%**). Puncak terjadi pada **${timeSeriesSummary.peakPeriod?.date}** (${fmtId(timeSeriesSummary.peakPeriod?.value || 0)}).`
        : timeSeriesSummary.skipReason || 'Data bukan deret waktu sehingga analisis tren periodik dilewati.',
    },
    {
      number: 7,
      title: '7. Analisis Segmentasi & Perbandingan Kategori',
      content:
        primaryGroupComparison && topGrp && lowGrp
          ? `Berdasarkan dimensi **${primaryCatCol?.name}**: segmen tertinggi adalah **${topGrp.groupValue}** (${topGrp.sharePct}% kontribusi, total ${fmtId(topGrp.sum)}, mean ${fmtId(topGrp.mean)}), sementara terendah adalah **${lowGrp.groupValue}** (${lowGrp.sharePct}% kontribusi, mean ${fmtId(lowGrp.mean)}).`
          : 'Tidak terdapat dimensi kategorikal yang dapat dibandingkan secara agregat.',
    },
    {
      number: 8,
      title: '8. Temuan Statistik & Korelasi Variabel',
      content:
        sigTests.length > 0 || topCorrelations.length > 0
          ? [
              ...topCorrelations.slice(0, 2).map(c => `- **Korelasi ${c.colA} ↔ ${c.colB}:** Pearson r=${c.pearsonR}, Spearman ρ=${c.spearmanRho}, p=${c.pValueApprox} (${c.strength}).`),
              ...sigTests.map(t => `- **${t.testName} (${t.variables.join(' × ')}):** ${t.statisticName}=${t.statisticValue}, p=${t.pValue} → ${t.interpretation}`),
            ].join('\n')
          : 'Uji statistik parametrik/korelasi dilewati karena prasyarat jumlah kelompok atau variabel numerik belum terpenuhi.',
    },
    {
      number: 9,
      title: '9. Temuan Data Mining & Deteksi Pola',
      content: [
        mining.kmeans.executed
          ? `- **K-Means Clustering:** ${mining.kmeans.k} segmen ditemukan (Silhouette=${mining.kmeans.silhouetteScore}) pada fitur ${mining.kmeans.features.join(', ')}.`
          : `- **K-Means:** ${mining.kmeans.skipReason}`,
        mining.associationRules.executed
          ? `- **Association Rules:** Pola teratas \`${mining.associationRules.rules[0].antecedent} ➔ ${mining.associationRules.rules[0].consequent}\` (Lift=${mining.associationRules.rules[0].lift}×, Conf=${(mining.associationRules.rules[0].confidence * 100).toFixed(0)}%).`
          : `- **Association Rules:** ${mining.associationRules.skipReason}`,
        mining.regression.executed
          ? `- **Regresi Linear OLS:** \`${mining.regression.equation}\` (R²=${mining.regression.r2}, RMSE=${fmtId(mining.regression.rmse)}).`
          : `- **Regresi Linear:** ${mining.regression.skipReason}`,
      ].join('\n'),
    },
    {
      number: 10,
      title: '10. Analisis Anomali & Faktor Risiko',
      content:
        mining.anomalies.length > 0
          ? `Terdeteksi **${mining.anomalies.length} nilai ekstrem (outlier)** di luar rentang normal statistik (IQR/Z-Score). Risiko utama meliputi konsentrasi segmen (${topGrp ? `${topGrp.groupValue}: ${topGrp.sharePct}%` : '-'}) dan sel kosong (${profile.missingCells} sel).`
          : `Tidak terdeteksi outlier ekstrem mayor. Risiko operasional difokuskan pada kelengkapan data (${profile.missingCells} missing cells) dan keseimbangan portofolio.`,
    },
    {
      number: 11,
      title: '11. Analisis Akar Masalah (Root Cause Diagnostic)',
      content: rootCause
        ? rootCause.factors.map(f => `- **[${f.tier}] ${f.title}:** ${f.detail}`).join('\n')
        : 'Diagnostik Root Cause antar segmen dilewati karena keterbatasan dimensi pembanding.',
    },
    {
      number: 12,
      title: '12. Hasil Prediksi & Skenario Masa Depan',
      content:
        forecastingResult.available && forecastingResult.output
          ? `Model **${forecastingResult.output.evaluation.selectedModelName}** memproyeksikan rata-rata **${fmtId(forecastingResult.output.evaluation.meanProjected)}** (${forecastingResult.output.evaluation.growthPercentage >= 0 ? '+' : ''}${forecastingResult.output.evaluation.growthPercentage}%), akurasi sMAPE **${forecastingResult.output.evaluation.smape}%** & R² **${forecastingResult.output.evaluation.r2}**. Simulasi skenario akhir berada di rentang Pesimis **${fmtId(forecastingResult.output.scenarios.pessimisticFinal)}** – Optimis **${fmtId(forecastingResult.output.scenarios.optimisticFinal)}**.`
          : forecastingResult.skipReason || 'Forecasting tidak dijalankan pada dataset ini.',
    },
    {
      number: 13,
      title: '13. Rekomendasi Keputusan Bisnis Prioritas',
      content: insights
        .slice(0, 4)
        .map((ins, i) => `${i + 1}. **[${ins.impactLevel}] ${ins.title}:** ${ins.recommendedAction}`)
        .join('\n'),
    },
    {
      number: 14,
      title: '14. Kesimpulan & Langkah Tindak Lanjut',
      content: `Seluruh temuan pada laporan ini dihitung secara deterministik dari **${profile.rowCount} observasi aktual** dataset **${datasetName}**. Disarankan untuk mengeksekusi prioritas Critical/High terlebih dahulu, mendokumentasikan baseline metrik sebelum intervensi, dan melakukan evaluasi ulang pada siklus pelaporan berikutnya.`,
    },
  ];

  const recommendations: ExecutiveRecommendationItem[] = [];
  insights.forEach(ins => {
    const tf: ExecutiveRecommendationItem['timeframe'] =
      ins.impactLevel === 'CRITICAL'
        ? 'Segera (0–30 Hari)'
        : ins.impactLevel === 'HIGH'
        ? 'Jangka Menengah (30–90 Hari)'
        : 'Jangka Panjang (3–12 Bulan)';
    recommendations.push({
      priority: ins.impactLevel,
      timeframe: tf,
      title: ins.title,
      action: ins.recommendedAction,
      expectedImpact: ins.finding,
      supportingEvidence: `${ins.supportingValues} (${ins.relatedColumns.join(', ')})`,
    });
  });

  const priorityRank: Record<ImpactLevel, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  recommendations.sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority]);

  const markdownReport = [
    `# EXECUTIVE MANAGEMENT & DATA INTELLIGENCE REPORT`,
    `**Dataset:** ${datasetName} · **Mode:** ${analysisMode.toUpperCase()} · **Periode:** ${dataPeriod}`,
    `---`,
    ...sections.map(s => `### ${s.title}\n${s.content}`),
  ].join('\n\n');

  return {
    datasetName,
    analysisMode,
    generatedAt: new Date().toISOString(),
    dataPeriod,
    sections,
    recommendations: recommendations.slice(0, 8),
    markdownReport,
  };
}

// ============================================================================
// DETERMINISTIC NATURAL LANGUAGE QUERY EXECUTOR FOR AI DATA ANALYST
// ============================================================================

export interface DeterministicQueryContext {
  intentSummary: string;
  computedFactsMarkdown: string;
  evidenceTable?: Record<string, any>[];
}

export function executeDeterministicQuery(
  query: string,
  dataset: StoredDataset | null,
  report: IntelligenceReport
): DeterministicQueryContext {
  const q = query.toLowerCase();
  const rows = dataset?.data || [];

  // Document Intelligence mode: search sections & paragraphs
  if (report.analysisMode === 'document' && dataset?.documentContent) {
    const terms = q.split(/\s+/).filter(w => w.length >= 3);
    const matchingSections = dataset.documentContent.sections.filter(s =>
      terms.some(t => s.content.toLowerCase().includes(t) || s.heading.toLowerCase().includes(t))
    );
    const snippets = (matchingSections.length > 0 ? matchingSections : dataset.documentContent.sections)
      .slice(0, 4)
      .map(s => `- **[Hal ${s.pageNumber || 1} · ${s.heading}]**: ${s.content.slice(0, 240)}...`)
      .join('\n');

    return {
      intentSummary: 'Document Intelligence Content Retrieval',
      computedFactsMarkdown: `**Ringkasan Dokumen (${dataset.documentContent.pageCount} halaman, ${dataset.documentContent.wordCount} kata, ${dataset.documentContent.tableCount} tabel):**\n${snippets}`,
    };
  }

  const lines: string[] = [];
  const profile = report.profile;
  let evidenceTable: Record<string, any>[] | undefined;

  // Check if user asks about specific column or group comparison
  const mentionedNumCols = profile.columns.filter(
    c => c.baseType === 'numeric' && q.includes(c.name.toLowerCase())
  );
  const targetCol =
    mentionedNumCols[0] ||
    profile.columns.find(c => c.baseType === 'numeric' && c.semanticType !== 'Identifier');

  if (targetCol?.numericStats) {
    const st = targetCol.numericStats;
    lines.push(
      `- **Statistik Kolom [${targetCol.name}]:** Total = **${fmtId(st.sum)}**, Mean = **${fmtId(st.mean)}**, Median = **${fmtId(st.median)}**, Min = **${fmtId(st.min)}**, Max = **${fmtId(st.max)}**, StdDev = **${fmtId(st.stdDev)}**, CV = **${st.cvPct}%**.`
    );
  }

  // Group breakdown if relevant column mentioned or comparative question asked
  const mentionedCat = profile.columns.find(
    c => c.baseType === 'categorical' && q.includes(c.name.toLowerCase())
  );
  const groupDim = mentionedCat || profile.columns.find(c => c.baseType === 'categorical' && c.semanticType !== 'Identifier');

  if (groupDim && targetCol && rows.length > 0) {
    const aggMap = new Map<string, { sum: number; count: number }>();
    let grandSum = 0;
    for (const r of rows) {
      const k = String(r[groupDim.name] ?? 'Unspecified');
      const v = parseNum(r[targetCol.name]);
      if (v === null) continue;
      grandSum += v;
      const cur = aggMap.get(k) || { sum: 0, count: 0 };
      cur.sum += v;
      cur.count += 1;
      aggMap.set(k, cur);
    }
    const ranked = Array.from(aggMap.entries())
      .map(([name, g]) => ({
        [groupDim.name]: name,
        Count: g.count,
        [`Total_${targetCol.name}`]: roundN(g.sum, 2),
        [`Rata2_${targetCol.name}`]: roundN(g.sum / g.count, 2),
        Share_Pct: grandSum !== 0 ? roundN((g.sum / grandSum) * 100, 1) : 0,
      }))
      .sort((a, b) => Number(b[`Total_${targetCol.name}`]) - Number(a[`Total_${targetCol.name}`]));

    if (ranked.length > 0) {
      evidenceTable = ranked.slice(0, 6);
      const top = ranked[0];
      lines.push(
        `- **Peringkat Segmen [${groupDim.name}] berdasarkan [${targetCol.name}]:** Teratas adalah **${top[groupDim.name]}** (Total: **${fmtId(Number(top[`Total_${targetCol.name}`]))}**, Share: **${top.Share_Pct}%**, n=${top.Count}).`
      );
    }
  }

  if (q.includes('anomali') || q.includes('outlier') || q.includes('risiko')) {
    lines.push(
      `- **Deteksi Anomali:** Terdeteksi **${report.mining.anomalies.length} nilai ekstrem** (IQR/Z-Score). ${report.mining.anomalies[0] ? `Tertinggi di baris #${report.mining.anomalies[0].rowIndex} (${report.mining.anomalies[0].column} = ${fmtId(report.mining.anomalies[0].value)}).` : ''}`
    );
  }

  if (q.includes('korelasi') || q.includes('hubungan') || q.includes('faktor') || q.includes('penyebab')) {
    if (report.eda.topCorrelations.length > 0) {
      const c = report.eda.topCorrelations[0];
      lines.push(`- **Korelasi Terkuat:** [${c.colA}] ↔ [${c.colB}] memiliki r=${c.pearsonR}, Spearman ρ=${c.spearmanRho}, p=${c.pValueApprox}.`);
    }
  }

  if (report.eda.timeSeriesSummary.available) {
    const ts = report.eda.timeSeriesSummary;
    lines.push(
      `- **Tren Temporal (${ts.startDate} – ${ts.endDate}):** Perubahan kumulatif **${ts.overallGrowthPct}%** (${ts.periodsCount} periode).`
    );
  }

  lines.push(
    `- **Kualitas Data:** Skor **${profile.quality.overallScore}/100 (${profile.quality.grade})**, Total Baris = **${profile.rowCount}**, Missing = **${profile.missingCells} sel (${profile.missingPct}%)**.`
  );

  return {
    intentSummary: `Structured Analytical Lookup (${targetCol?.name || 'Overview'} × ${groupDim?.name || 'All'})`,
    computedFactsMarkdown: lines.join('\n'),
    evidenceTable,
  };
}
