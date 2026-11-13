export type ForecastModelId =
  | 'auto'
  | 'naive'
  | 'sma'
  | 'wma'
  | 'ema'
  | 'ses'
  | 'holt'
  | 'holt_winters'
  | 'linear'
  | 'autoregressive'
  | 'sarima';

// Backward-compatible method type alias
export type ForecastMethod =
  | ForecastModelId
  | 'moving_average'
  | 'exponential_smoothing';

export type DataFrequency = 'auto' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type ForecastHorizon = '7d' | '14d' | '30d' | '60d' | '90d' | '3m' | '6m' | '12m' | 'custom';
export type ConfidenceLevel = 0.80 | 0.90 | 0.95 | 0.99;
export type HistoricalPeriodFilter = 'all' | 'last_12' | 'last_30' | 'last_90';
export type DuplicateAggregation = 'sum' | 'mean';

export interface DataPoint {
  date: string;
  value: number;
}

export interface ValidationIssue {
  code:
    | 'EMPTY_DATASET'
    | 'MISSING_DATE_COLUMN'
    | 'NON_NUMERIC_TARGET'
    | 'INSUFFICIENT_DATA'
    | 'MISSING_VALUES_IMPUTED'
    | 'DUPLICATE_TIMESTAMPS'
    | 'UNSORTED_DATES'
    | 'IRREGULAR_INTERVALS'
    | 'HORIZON_TOO_LONG'
    | 'SEASONAL_TOO_SHORT';
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface PreparedSeriesResult {
  valid: boolean;
  blockingError: string | null;
  points: DataPoint[];
  detectedFrequency: Exclude<DataFrequency, 'auto'>;
  appliedFrequency: Exclude<DataFrequency, 'auto'>;
  historicalPeriodStart: string;
  historicalPeriodEnd: string;
  rawRowCount: number;
  missingCount: number;
  imputedCount: number;
  duplicateCount: number;
  wasUnsorted: boolean;
  irregularIntervals: boolean;
  issues: ValidationIssue[];
}

export interface TimeSeriesStatistics {
  count: number;
  mean: number;
  median: number;
  mode: number | null;
  min: number;
  max: number;
  sum: number;
  stdDev: number;
  variance: number;
  cv: number;
  growthRate: number;
  percentageChange: number;
  trendDirection: 'UPWARD' | 'DOWNWARD' | 'STABLE';
  trendStrength: number;
  movingAverageLast: number;
  seasonalPeriod: number;
  seasonalStrength: number;
  seasonalityDetected: boolean;
  outliers: { index: number; date: string; value: number }[];
  changePoints: { index: number; date: string; shiftMagnitude: number; direction: 'INCREASE' | 'DECREASE' }[];
  historicalPerformance: string;
}

export interface BacktestPoint {
  date: string;
  actual: number;
  predicted: number;
  error: number;
  absError: number;
  pctError: number | null;
}

export interface ModelMetrics {
  mae: number;
  mse: number;
  rmse: number;
  mape: number | null;
  smape: number;
  r2: number;
}

export interface ModelComparisonRow {
  modelId: Exclude<ForecastModelId, 'auto'>;
  modelName: string;
  family: string;
  eligible: boolean;
  eligibilityReason: string;
  validationStatus: 'VALIDATED' | 'INSUFFICIENT_DATA' | 'INELIGIBLE' | 'FAILED';
  metrics: ModelMetrics | null;
  parameters: Record<string, number | string>;
  rank: number | null;
  isRecommended: boolean;
}

export interface ForecastResultPoint {
  date: string;
  historical?: number;
  forecast?: number;
  trendLine?: number;
  backtestPredicted?: number;
  lowerBound?: number;
  upperBound?: number;
  lower80?: number;
  upper80?: number;
  lower95?: number;
  upper95?: number;
  ciRange?: [number, number];
  marginOfError?: number;
  margin80?: number;
  margin95?: number;
  status?: 'Historical' | 'Backtest' | 'Forecast';
}

export interface ScenarioPoint {
  date: string;
  step: number;
  optimistic: number;
  baseline: number;
  pessimistic: number;
}

export interface ScenarioSummary {
  shockPercentage: number;
  assumptions: string[];
  optimisticFinal: number;
  baselineFinal: number;
  pessimisticFinal: number;
  optimisticMean: number;
  baselineMean: number;
  pessimisticMean: number;
  points: ScenarioPoint[];
}

export interface ForecastEvaluation {
  mae: number;
  mse: number;
  rmse: number;
  mape: number;
  mapeAvailable: boolean;
  smape: number;
  r2: number;
  trend: 'UPWARD' | 'DOWNWARD' | 'STABLE';
  growthPercentage: number;
  sampleSize: number;
  confidenceLevel: number;
  zScore: number;
  meanProjected: number;
  ciLower: number;
  ciUpper: number;
  ci80Lower: number;
  ci80Upper: number;
  ci95Lower: number;
  ci95Upper: number;
  averageMarginOfError: number;
  validationStatus: 'VALIDATED' | 'INSUFFICIENT_DATA';
  validationNote: string;
  trainingPeriod: string;
  testingPeriod: string;
  trainCount: number;
  testCount: number;
  selectedModelId: Exclude<ForecastModelId, 'auto'>;
  selectedModelName: string;
  selectionReason: string;
  modelParameters: Record<string, number | string>;
  ciLimitationNote: string;
}

export interface ForecastOutput {
  points: ForecastResultPoint[];
  evaluation: ForecastEvaluation;
  statistics: TimeSeriesStatistics;
  backtestPoints: BacktestPoint[];
  modelComparisons: ModelComparisonRow[];
  scenarios: ScenarioSummary;
  issues: ValidationIssue[];
  appliedFrequency: Exclude<ForecastModelId, 'auto'> extends never ? never : Exclude<DataFrequency, 'auto'>;
  horizonSteps: number;
  method: ForecastMethod;
  confidenceLevel: ConfidenceLevel;
}

export interface ForecastPipelineInput {
  rows: Record<string, any>[];
  dateColumn: string;
  targetColumn: string;
  categoryColumn?: string;
  segmentValue?: string;
  frequency?: DataFrequency;
  historicalPeriod?: HistoricalPeriodFilter;
  aggregation?: DuplicateAggregation;
  method?: ForecastMethod;
  horizon?: ForecastHorizon;
  customSteps?: number;
  confidenceLevel?: ConfidenceLevel;
  scenarioShockPct?: number;
}

export const MODEL_CATALOG: Record<
  Exclude<ForecastModelId, 'auto'>,
  { name: string; family: string; minSamples: number; description: string }
> = {
  naive: {
    name: 'Baseline Naive Forecast',
    family: 'Baseline',
    minSamples: 2,
    description: 'Menggunakan nilai observasi terakhir sebagai baseline pembanding performa model kompleks.',
  },
  sma: {
    name: 'Simple Moving Average (SMA)',
    family: 'Moving Average',
    minSamples: 3,
    description: 'Rata-rata bergerak sederhana dengan bobot seragam pada jendela periode terakhir.',
  },
  wma: {
    name: 'Weighted Moving Average (WMA)',
    family: 'Moving Average',
    minSamples: 3,
    description: 'Rata-rata bergerak dengan bobot linear lebih tinggi pada observasi terbaru.',
  },
  ema: {
    name: 'Exponential Moving Average (EMA)',
    family: 'Moving Average',
    minSamples: 3,
    description: 'Rata-rata bergerak eksponensial yang cepat merespons perubahan level terkini.',
  },
  ses: {
    name: 'Simple Exponential Smoothing (SES)',
    family: 'Exponential Smoothing',
    minSamples: 4,
    description: 'Pemulusan eksponensial level optimal (tanpa tren/musiman kuat) via grid-search alpha.',
  },
  holt: {
    name: "Holt's Linear Trend",
    family: 'Exponential Smoothing',
    minSamples: 5,
    description: 'Pemulusan eksponensial ganda untuk deret waktu yang memiliki tren naik atau turun.',
  },
  holt_winters: {
    name: 'Holt-Winters Seasonal',
    family: 'Exponential Smoothing',
    minSamples: 8,
    description: 'Pemulusan eksponensial tripel aditif untuk data dengan tren sekaligus pola musiman.',
  },
  linear: {
    name: 'Linear Regression (OLS)',
    family: 'Regression',
    minSamples: 3,
    description: 'Regresi kuadrat terkecil biasa antara indeks waktu dan variabel target.',
  },
  autoregressive: {
    name: 'Autoregressive AR(p)',
    family: 'Time-Series AR',
    minSamples: 8,
    description: 'Model autoregresif lag historis (AR) untuk menangkap ketergantungan serial internal.',
  },
  sarima: {
    name: 'Seasonal ARIMA (SARIMA-AR)',
    family: 'Seasonal AR',
    minSamples: 10,
    description: 'Model autoregresif terdiferensiasi musiman untuk seri panjang dengan siklus berulang.',
  },
};

export function normalizeModelId(method: ForecastMethod): ForecastModelId {
  if (method === 'moving_average') return 'sma';
  if (method === 'exponential_smoothing') return 'ses';
  return method;
}

export function getZScore(confidenceLevel: ConfidenceLevel = 0.95): number {
  switch (confidenceLevel) {
    case 0.80:
      return 1.2816;
    case 0.90:
      return 1.6449;
    case 0.95:
      return 1.96;
    case 0.99:
      return 2.5758;
    default:
      return 1.96;
  }
}

export function getHorizonSteps(
  horizon: ForecastHorizon,
  frequency: Exclude<DataFrequency, 'auto'> = 'daily',
  customSteps?: number
): number {
  if (horizon === 'custom') {
    const parsed = Math.round(Number(customSteps) || 12);
    return Math.max(1, Math.min(365, parsed));
  }

  switch (horizon) {
    case '7d':
      return frequency === 'weekly' ? 4 : frequency === 'monthly' ? 3 : frequency === 'quarterly' ? 2 : frequency === 'yearly' ? 2 : 7;
    case '14d':
      return frequency === 'weekly' ? 8 : frequency === 'monthly' ? 3 : frequency === 'quarterly' ? 2 : frequency === 'yearly' ? 2 : 14;
    case '30d':
      return frequency === 'weekly' ? 4 : frequency === 'monthly' ? 3 : frequency === 'quarterly' ? 4 : frequency === 'yearly' ? 3 : 30;
    case '60d':
      return frequency === 'weekly' ? 8 : frequency === 'monthly' ? 6 : frequency === 'quarterly' ? 4 : frequency === 'yearly' ? 3 : 60;
    case '90d':
    case '3m':
      return frequency === 'weekly' ? 12 : frequency === 'monthly' ? 3 : frequency === 'quarterly' ? 4 : frequency === 'yearly' ? 3 : 90;
    case '6m':
      return frequency === 'weekly' ? 24 : frequency === 'monthly' ? 6 : frequency === 'quarterly' ? 4 : frequency === 'yearly' ? 5 : 180;
    case '12m':
      return frequency === 'weekly' ? 52 : frequency === 'monthly' ? 12 : frequency === 'quarterly' ? 8 : frequency === 'yearly' ? 5 : 365;
    default:
      return 30;
  }
}

export function parseNumericValue(raw: any): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw === 'string') {
    const cleaned = raw.replace(/[Rp$€£,\s%]/gi, '').trim();
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function isValidCalendarDate(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  const isDatePattern =
    /^\d{4}[-/]\d{1,2}(?:[-/]\d{1,2})?(?:T.*)?$/.test(trimmed) ||
    /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(trimmed) ||
    /^(19|20)\d{2}$/.test(trimmed);
  if (!isDatePattern) return false;
  if (/^(19|20)\d{2}$/.test(trimmed)) return true;
  return !isNaN(Date.parse(trimmed));
}

function parseTimestampMs(raw: any): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^(19|20)\d{2}$/.test(s)) {
    return Date.UTC(Number(s), 0, 1);
  }
  if (/^\d{4}[-/]\d{1,2}$/.test(s)) {
    const [y, m] = s.split(/[-/]/).map(Number);
    if (y >= 1900 && m >= 1 && m <= 12) return Date.UTC(y, m - 1, 1);
  }
  if (isValidCalendarDate(s)) {
    const ms = Date.parse(s);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

function formatDateByFrequency(ms: number, freq: Exclude<DataFrequency, 'auto'>): string {
  const d = new Date(ms);
  if (isNaN(d.getTime())) return String(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  if (freq === 'yearly') return `${y}`;
  if (freq === 'monthly' || freq === 'quarterly') return `${y}-${m}-${day}`;
  return `${y}-${m}-${day}`;
}

export function generateNextDateString(
  lastDateStr: string,
  stepIndex: number,
  frequency: Exclude<DataFrequency, 'auto'> = 'daily'
): string {
  if (!lastDateStr) return `T+${stepIndex}`;
  const trimmed = lastDateStr.trim();

  const numMatch = trimmed.match(/^(.*?)(\d+)$/);
  if (numMatch && !isValidCalendarDate(trimmed)) {
    const prefix = numMatch[1];
    const num = parseInt(numMatch[2], 10);
    return `${prefix}${num + stepIndex}`;
  }

  const ms = parseTimestampMs(trimmed);
  if (ms !== null) {
    const d = new Date(ms);
    if (frequency === 'yearly') {
      d.setUTCFullYear(d.getUTCFullYear() + stepIndex);
      return `${d.getUTCFullYear()}`;
    }
    if (frequency === 'quarterly') {
      d.setUTCMonth(d.getUTCMonth() + stepIndex * 3);
      return d.toISOString().split('T')[0];
    }
    if (frequency === 'monthly') {
      d.setUTCMonth(d.getUTCMonth() + stepIndex);
      return d.toISOString().split('T')[0];
    }
    if (frequency === 'weekly') {
      d.setUTCDate(d.getUTCDate() + stepIndex * 7);
      return d.toISOString().split('T')[0];
    }
    d.setUTCDate(d.getUTCDate() + stepIndex);
    return d.toISOString().split('T')[0];
  }

  return `${trimmed} +${stepIndex}`;
}

export function detectFrequencyFromTimestamps(timestampsMs: number[]): {
  frequency: Exclude<DataFrequency, 'auto'>;
  irregularIntervals: boolean;
} {
  if (timestampsMs.length < 2) {
    return { frequency: 'daily', irregularIntervals: false };
  }

  const dayDiffs: number[] = [];
  for (let i = 1; i < timestampsMs.length; i++) {
    const diffDays = Math.abs(timestampsMs[i] - timestampsMs[i - 1]) / (1000 * 60 * 60 * 24);
    if (diffDays > 0) dayDiffs.push(diffDays);
  }

  if (dayDiffs.length === 0) {
    return { frequency: 'daily', irregularIntervals: false };
  }

  const sorted = [...dayDiffs].sort((a, b) => a - b);
  const medianDiff = sorted[Math.floor(sorted.length / 2)];
  const meanDiff = dayDiffs.reduce((a, b) => a + b, 0) / dayDiffs.length;
  const variance = dayDiffs.reduce((a, b) => a + Math.pow(b - meanDiff, 2), 0) / dayDiffs.length;
  const cv = meanDiff > 0 ? Math.sqrt(variance) / meanDiff : 0;

  let frequency: Exclude<DataFrequency, 'auto'> = 'daily';
  if (medianDiff <= 2.5) frequency = 'daily';
  else if (medianDiff <= 10.5) frequency = 'weekly';
  else if (medianDiff <= 45) frequency = 'monthly';
  else if (medianDiff <= 125) frequency = 'quarterly';
  else frequency = 'yearly';

  return { frequency, irregularIntervals: cv > 0.65 && dayDiffs.length >= 4 };
}

export function prepareTimeSeries(params: {
  rows: Record<string, any>[];
  dateColumn: string;
  targetColumn: string;
  categoryColumn?: string;
  segmentValue?: string;
  frequency?: DataFrequency;
  historicalPeriod?: HistoricalPeriodFilter;
  aggregation?: DuplicateAggregation;
}): PreparedSeriesResult {
  const issues: ValidationIssue[] = [];
  const {
    rows,
    dateColumn,
    targetColumn,
    categoryColumn,
    segmentValue,
    frequency = 'auto',
    historicalPeriod = 'all',
    aggregation = 'sum',
  } = params;

  if (!rows || rows.length === 0) {
    issues.push({
      code: 'EMPTY_DATASET',
      severity: 'error',
      message: 'Dataset kosong. Unggah atau pilih dataset yang memiliki baris observasi historis.',
    });
    return {
      valid: false,
      blockingError: issues[0].message,
      points: [],
      detectedFrequency: 'daily',
      appliedFrequency: frequency === 'auto' ? 'daily' : frequency,
      historicalPeriodStart: '-',
      historicalPeriodEnd: '-',
      rawRowCount: 0,
      missingCount: 0,
      imputedCount: 0,
      duplicateCount: 0,
      wasUnsorted: false,
      irregularIntervals: false,
      issues,
    };
  }

  const filteredRows =
    categoryColumn && segmentValue && segmentValue !== 'ALL'
      ? rows.filter(r => String(r[categoryColumn] ?? '') === segmentValue)
      : rows;

  if (filteredRows.length === 0) {
    issues.push({
      code: 'EMPTY_DATASET',
      severity: 'error',
      message: `Segmen "${segmentValue}" pada kolom "${categoryColumn}" tidak memiliki baris data.`,
    });
    return {
      valid: false,
      blockingError: issues[0].message,
      points: [],
      detectedFrequency: 'daily',
      appliedFrequency: frequency === 'auto' ? 'daily' : frequency,
      historicalPeriodStart: '-',
      historicalPeriodEnd: '-',
      rawRowCount: 0,
      missingCount: 0,
      imputedCount: 0,
      duplicateCount: 0,
      wasUnsorted: false,
      irregularIntervals: false,
      issues,
    };
  }

  const sampleCols = Object.keys(filteredRows[0] || {});
  if (!dateColumn || !sampleCols.includes(dateColumn)) {
    issues.push({
      code: 'MISSING_DATE_COLUMN',
      severity: 'error',
      message: 'Kolom tanggal/waktu tidak ditemukan. Forecasting time-series memerlukan kolom tanggal atau periode waktu yang valid.',
    });
    return {
      valid: false,
      blockingError: issues[0].message,
      points: [],
      detectedFrequency: 'daily',
      appliedFrequency: frequency === 'auto' ? 'daily' : frequency,
      historicalPeriodStart: '-',
      historicalPeriodEnd: '-',
      rawRowCount: filteredRows.length,
      missingCount: 0,
      imputedCount: 0,
      duplicateCount: 0,
      wasUnsorted: false,
      irregularIntervals: false,
      issues,
    };
  }

  if (!targetColumn || !sampleCols.includes(targetColumn)) {
    issues.push({
      code: 'NON_NUMERIC_TARGET',
      severity: 'error',
      message: 'Variabel target numerik belum dipilih atau tidak tersedia pada dataset.',
    });
    return {
      valid: false,
      blockingError: issues[0].message,
      points: [],
      detectedFrequency: 'daily',
      appliedFrequency: frequency === 'auto' ? 'daily' : frequency,
      historicalPeriodStart: '-',
      historicalPeriodEnd: '-',
      rawRowCount: filteredRows.length,
      missingCount: 0,
      imputedCount: 0,
      duplicateCount: 0,
      wasUnsorted: false,
      irregularIntervals: false,
      issues,
    };
  }

  // Validate that dateColumn has valid dates/periods (not arbitrary text/categories)
  const rawDates = filteredRows.map(r => r[dateColumn]).filter(v => v !== null && v !== undefined && String(v).trim() !== '');
  const calendarValidCount = rawDates.filter(v => parseTimestampMs(v) !== null).length;
  const sequentialPeriodCount = rawDates.filter(v => /^(periode|period|week|minggu|month|bulan|q[1-4]|tahun|year|t\+?)\s*\d+/i.test(String(v).trim())).length;

  if (rawDates.length === 0 || (calendarValidCount < rawDates.length * 0.6 && sequentialPeriodCount < rawDates.length * 0.6)) {
    issues.push({
      code: 'MISSING_DATE_COLUMN',
      severity: 'error',
      message: `Kolom "${dateColumn}" tidak memiliki struktur tanggal atau deret waktu yang valid. Pilih kolom berformat tanggal (YYYY-MM-DD / periode kronologis).`,
    });
    return {
      valid: false,
      blockingError: issues[0].message,
      points: [],
      detectedFrequency: 'daily',
      appliedFrequency: frequency === 'auto' ? 'daily' : frequency,
      historicalPeriodStart: '-',
      historicalPeriodEnd: '-',
      rawRowCount: filteredRows.length,
      missingCount: 0,
      imputedCount: 0,
      duplicateCount: 0,
      wasUnsorted: false,
      irregularIntervals: false,
      issues,
    };
  }

  // Validate numeric target
  const numericParsed = filteredRows.map(r => parseNumericValue(r[targetColumn]));
  const validNumericCount = numericParsed.filter(v => v !== null).length;
  if (validNumericCount < 2) {
    issues.push({
      code: 'NON_NUMERIC_TARGET',
      severity: 'error',
      message: `Kolom "${targetColumn}" bukan variabel numerik atau memiliki kurang dari 2 nilai angka yang valid.`,
    });
    return {
      valid: false,
      blockingError: issues[0].message,
      points: [],
      detectedFrequency: 'daily',
      appliedFrequency: frequency === 'auto' ? 'daily' : frequency,
      historicalPeriodStart: '-',
      historicalPeriodEnd: '-',
      rawRowCount: filteredRows.length,
      missingCount: filteredRows.length - validNumericCount,
      imputedCount: 0,
      duplicateCount: 0,
      wasUnsorted: false,
      irregularIntervals: false,
      issues,
    };
  }

  // Build raw parsed observations
  interface RawObs {
    dateLabel: string;
    ms: number | null;
    originalIndex: number;
    value: number | null;
  }

  const parsedObs: RawObs[] = [];
  let missingCount = 0;

  filteredRows.forEach((row, idx) => {
    const rawDate = row[dateColumn];
    if (rawDate === null || rawDate === undefined || String(rawDate).trim() === '') return;
    const ms = parseTimestampMs(rawDate);
    const val = parseNumericValue(row[targetColumn]);
    if (val === null) missingCount++;
    parsedObs.push({
      dateLabel: String(rawDate).trim(),
      ms,
      originalIndex: idx,
      value: val,
    });
  });

  // Sort chronologically if calendar timestamps exist
  let wasUnsorted = false;
  const allHaveMs = parsedObs.every(o => o.ms !== null);
  if (allHaveMs) {
    for (let i = 1; i < parsedObs.length; i++) {
      if ((parsedObs[i].ms as number) < (parsedObs[i - 1].ms as number)) {
        wasUnsorted = true;
        break;
      }
    }
    if (wasUnsorted) {
      parsedObs.sort((a, b) => (a.ms as number) - (b.ms as number));
      issues.push({
        code: 'UNSORTED_DATES',
        severity: 'info',
        message: 'Data historis tidak berurutan secara kronologis dan telah diurutkan otomatis dari tanggal terawal ke terbaru.',
      });
    }
  }

  // Detect frequency
  const timestamps = parsedObs.map(o => o.ms).filter((m): m is number => m !== null);
  const freqDetect = detectFrequencyFromTimestamps(timestamps);
  const appliedFrequency = frequency === 'auto' ? freqDetect.frequency : frequency;

  // Aggregate duplicate timestamps
  const bucketMap = new Map<string, { ms: number | null; values: number[]; missingInBucket: number }>();
  let duplicateCount = 0;

  for (const obs of parsedObs) {
    const key =
      obs.ms !== null && (appliedFrequency === 'monthly' || appliedFrequency === 'quarterly' || appliedFrequency === 'yearly')
        ? (() => {
            const d = new Date(obs.ms);
            if (appliedFrequency === 'yearly') return `${d.getUTCFullYear()}`;
            if (appliedFrequency === 'quarterly') {
              const qMonth = Math.floor(d.getUTCMonth() / 3) * 3 + 1;
              return `${d.getUTCFullYear()}-${String(qMonth).padStart(2, '0')}-01`;
            }
            return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
          })()
        : obs.ms !== null
        ? formatDateByFrequency(obs.ms, appliedFrequency)
        : obs.dateLabel;

    const existing = bucketMap.get(key);
    if (existing) {
      duplicateCount++;
      if (obs.value !== null) existing.values.push(obs.value);
      else existing.missingInBucket++;
    } else {
      bucketMap.set(key, {
        ms: obs.ms,
        values: obs.value !== null ? [obs.value] : [],
        missingInBucket: obs.value === null ? 1 : 0,
      });
    }
  }

  if (duplicateCount > 0) {
    issues.push({
      code: 'DUPLICATE_TIMESTAMPS',
      severity: 'info',
      message: `Ditemukan ${duplicateCount} timestamp duplikat/multi-transaksi pada periode yang sama; digabungkan menggunakan metode ${aggregation.toUpperCase()}.`,
    });
  }

  // Convert buckets to series & handle missing values via linear interpolation
  const rawSeries: { date: string; value: number | null }[] = [];
  for (const [key, bucket] of bucketMap.entries()) {
    if (bucket.values.length === 0) {
      rawSeries.push({ date: key, value: null });
    } else {
      const total = bucket.values.reduce((a, b) => a + b, 0);
      const aggVal = aggregation === 'mean' ? total / bucket.values.length : total;
      rawSeries.push({ date: key, value: Math.round(aggVal * 100) / 100 });
    }
  }

  let imputedCount = 0;
  const nonNullValues = rawSeries.map(s => s.value).filter((v): v is number => v !== null);
  const globalMean = nonNullValues.length > 0 ? nonNullValues.reduce((a, b) => a + b, 0) / nonNullValues.length : 0;

  const cleanPoints: DataPoint[] = rawSeries.map((pt, idx) => {
    if (pt.value !== null) return { date: pt.date, value: pt.value };
    imputedCount++;
    // Linear interpolation between nearest left and right non-null neighbors
    let leftIdx = idx - 1;
    while (leftIdx >= 0 && rawSeries[leftIdx].value === null) leftIdx--;
    let rightIdx = idx + 1;
    while (rightIdx < rawSeries.length && rawSeries[rightIdx].value === null) rightIdx++;

    let interpolated = globalMean;
    if (leftIdx >= 0 && rightIdx < rawSeries.length) {
      const lv = rawSeries[leftIdx].value as number;
      const rv = rawSeries[rightIdx].value as number;
      const ratio = (idx - leftIdx) / (rightIdx - leftIdx);
      interpolated = lv + (rv - lv) * ratio;
    } else if (leftIdx >= 0) {
      interpolated = rawSeries[leftIdx].value as number;
    } else if (rightIdx < rawSeries.length) {
      interpolated = rawSeries[rightIdx].value as number;
    }

    return { date: pt.date, value: Math.round(interpolated * 100) / 100 };
  });

  if (imputedCount > 0 || missingCount > 0) {
    issues.push({
      code: 'MISSING_VALUES_IMPUTED',
      severity: 'warning',
      message: `${missingCount} sel kosong pada variabel target terdeteksi; ${imputedCount} periode diimputasi dengan interpolasi linear agar deret waktu tetap kontinu.`,
    });
  }

  // Apply historical period slice if requested
  let finalPoints = cleanPoints;
  if (historicalPeriod === 'last_12' && cleanPoints.length > 12) {
    finalPoints = cleanPoints.slice(-12);
  } else if (historicalPeriod === 'last_30' && cleanPoints.length > 30) {
    finalPoints = cleanPoints.slice(-30);
  } else if (historicalPeriod === 'last_90' && cleanPoints.length > 90) {
    finalPoints = cleanPoints.slice(-90);
  }

  if (freqDetect.irregularIntervals) {
    issues.push({
      code: 'IRREGULAR_INTERVALS',
      severity: 'warning',
      message: 'Interval waktu antar observasi tidak seragam. Hasil peramalan mengasumsikan urutan langkah waktu merata sesuai frekuensi terpilih.',
    });
  }

  if (finalPoints.length < 3) {
    issues.push({
      code: 'INSUFFICIENT_DATA',
      severity: 'error',
      message: `Data historis setelah agregasi hanya memiliki ${finalPoints.length} titik waktu. Minimal 3 titik waktu diperlukan untuk peramalan statistik.`,
    });
    return {
      valid: false,
      blockingError: issues[issues.length - 1].message,
      points: finalPoints,
      detectedFrequency: freqDetect.frequency,
      appliedFrequency,
      historicalPeriodStart: finalPoints[0]?.date || '-',
      historicalPeriodEnd: finalPoints[finalPoints.length - 1]?.date || '-',
      rawRowCount: filteredRows.length,
      missingCount,
      imputedCount,
      duplicateCount,
      wasUnsorted,
      irregularIntervals: freqDetect.irregularIntervals,
      issues,
    };
  }

  if (finalPoints.length < 6) {
    issues.push({
      code: 'INSUFFICIENT_DATA',
      severity: 'warning',
      message: `Jumlah observasi (${finalPoints.length} titik) tergolong terbatas untuk out-of-sample backtesting penuh. Minimal 6 titik disarankan agar evaluasi error akurat.`,
    });
  }

  return {
    valid: true,
    blockingError: null,
    points: finalPoints,
    detectedFrequency: freqDetect.frequency,
    appliedFrequency,
    historicalPeriodStart: finalPoints[0]?.date || '-',
    historicalPeriodEnd: finalPoints[finalPoints.length - 1]?.date || '-',
    rawRowCount: filteredRows.length,
    missingCount,
    imputedCount,
    duplicateCount,
    wasUnsorted,
    irregularIntervals: freqDetect.irregularIntervals,
    issues,
  };
}

/**
 * Autocorrelation at lag k
 */
function autocorrelation(values: number[], lag: number): number {
  const n = values.length;
  if (lag <= 0 || lag >= n - 1) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    den += Math.pow(values[i] - mean, 2);
    if (i >= lag) {
      num += (values[i] - mean) * (values[i - lag] - mean);
    }
  }
  return den === 0 ? 0 : num / den;
}

/**
 * Computes comprehensive descriptive and time-series diagnostics before forecasting
 */
export function computeTimeSeriesStats(
  history: DataPoint[],
  frequency: Exclude<DataFrequency, 'auto'> = 'daily'
): TimeSeriesStatistics {
  const n = history.length;
  if (n === 0) {
    return {
      count: 0,
      mean: 0,
      median: 0,
      mode: null,
      min: 0,
      max: 0,
      sum: 0,
      stdDev: 0,
      variance: 0,
      cv: 0,
      growthRate: 0,
      percentageChange: 0,
      trendDirection: 'STABLE',
      trendStrength: 0,
      movingAverageLast: 0,
      seasonalPeriod: 1,
      seasonalStrength: 0,
      seasonalityDetected: false,
      outliers: [],
      changePoints: [],
      historicalPerformance: 'Belum ada data observasi.',
    };
  }

  const values = history.map(h => h.value);
  const sortedVals = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const min = sortedVals[0];
  const max = sortedVals[n - 1];
  const mid = Math.floor(n / 2);
  const median = n % 2 === 0 ? (sortedVals[mid - 1] + sortedVals[mid]) / 2 : sortedVals[mid];

  // Mode (only meaningful if any value repeats)
  const freqMap = new Map<number, number>();
  let maxFreq = 0;
  let modeVal: number | null = null;
  for (const v of values) {
    const rounded = Math.round(v * 100) / 100;
    const count = (freqMap.get(rounded) || 0) + 1;
    freqMap.set(rounded, count);
    if (count > maxFreq) {
      maxFreq = count;
      modeVal = rounded;
    }
  }
  if (maxFreq <= 1) modeVal = null;

  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const cv = mean !== 0 ? (stdDev / Math.abs(mean)) * 100 : 0;

  // Overall percentage change & average period-to-period growth rate
  const firstVal = values[0];
  const lastVal = values[n - 1];
  const percentageChange = firstVal !== 0 ? ((lastVal - firstVal) / Math.abs(firstVal)) * 100 : 0;

  const stepGrowths: number[] = [];
  for (let i = 1; i < n; i++) {
    if (values[i - 1] !== 0) {
      stepGrowths.push(((values[i] - values[i - 1]) / Math.abs(values[i - 1])) * 100);
    }
  }
  const growthRate = stepGrowths.length > 0 ? stepGrowths.reduce((a, b) => a + b, 0) / stepGrowths.length : 0;

  // OLS slope for trend direction & strength (R2 of linear fit)
  const lr = runLinearRegression(values, 0);
  let sse = 0;
  let sst = 0;
  for (let i = 0; i < n; i++) {
    sse += Math.pow(values[i] - lr.fitted[i], 2);
    sst += Math.pow(values[i] - mean, 2);
  }
  const trendStrength = sst === 0 ? 0 : Math.max(0, 1 - sse / sst);
  const normalizedSlope = mean !== 0 ? (lr.slope * n) / Math.abs(mean) : 0;

  let trendDirection: 'UPWARD' | 'DOWNWARD' | 'STABLE' = 'STABLE';
  if (normalizedSlope > 0.05) trendDirection = 'UPWARD';
  else if (normalizedSlope < -0.05) trendDirection = 'DOWNWARD';

  const maWin = Math.min(5, Math.max(2, Math.floor(n / 3)));
  const recentWindow = values.slice(-maWin);
  const movingAverageLast = recentWindow.reduce((a, b) => a + b, 0) / recentWindow.length;

  // Seasonality detection via autocorrelation across candidate seasonal periods
  const candidates =
    frequency === 'daily'
      ? [7, 14, 30]
      : frequency === 'weekly'
      ? [4, 12, 52]
      : frequency === 'monthly'
      ? [3, 4, 6, 12]
      : frequency === 'quarterly'
      ? [4]
      : [4, 5];

  let bestPeriod = 1;
  let bestAcf = 0;
  // Detrend series first before measuring seasonal autocorrelation so pure trend isn't mistaken for seasonality
  const detrended = values.map((v, i) => v - lr.fitted[i]);
  for (const cand of candidates) {
    if (n >= cand * 2) {
      const acf = autocorrelation(detrended, cand);
      if (acf > bestAcf) {
        bestAcf = acf;
        bestPeriod = cand;
      }
    }
  }
  const seasonalityDetected = bestPeriod > 1 && bestAcf >= 0.3;

  // Outlier detection (IQR)
  const q1 = sortedVals[Math.floor(n * 0.25)];
  const q3 = sortedVals[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const outliers: { index: number; date: string; value: number }[] = [];
  if (iqr > 0) {
    const low = q1 - 1.5 * iqr;
    const high = q3 + 1.5 * iqr;
    history.forEach((pt, idx) => {
      if (pt.value < low || pt.value > high) {
        outliers.push({ index: idx, date: pt.date, value: pt.value });
      }
    });
  }

  // Change Point Detection (rolling split mean shift >= 1.5 * pooled stdDev)
  const changePoints: { index: number; date: string; shiftMagnitude: number; direction: 'INCREASE' | 'DECREASE' }[] = [];
  if (n >= 8 && stdDev > 0) {
    const minSeg = Math.max(3, Math.floor(n / 6));
    let maxDiff = 0;
    let maxIdx = -1;
    let dir: 'INCREASE' | 'DECREASE' = 'INCREASE';

    for (let i = minSeg; i <= n - minSeg; i++) {
      const leftMean = values.slice(0, i).reduce((a, b) => a + b, 0) / i;
      const rightMean = values.slice(i).reduce((a, b) => a + b, 0) / (n - i);
      const shift = rightMean - leftMean;
      if (Math.abs(shift) > maxDiff) {
        maxDiff = Math.abs(shift);
        maxIdx = i;
        dir = shift >= 0 ? 'INCREASE' : 'DECREASE';
      }
    }

    if (maxIdx !== -1 && maxDiff >= stdDev * 1.15) {
      changePoints.push({
        index: maxIdx,
        date: history[maxIdx].date,
        shiftMagnitude: Math.round(maxDiff * 100) / 100,
        direction: dir,
      });
    }
  }

  const historicalPerformance = `Dari ${n} periode (${history[0].date} s/d ${history[n - 1].date}), nilai bergerak dari ${firstVal.toLocaleString()} ke ${lastVal.toLocaleString()} (${percentageChange >= 0 ? '+' : ''}${Math.round(percentageChange * 10) / 10}%), variabilitas CV ${Math.round(cv * 10) / 10}%, ${seasonalityDetected ? `pola musiman terdeteksi (periode ${bestPeriod})` : 'tanpa siklus musiman kuat'}.`;

  return {
    count: n,
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    mode: modeVal,
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    sum: Math.round(sum * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    variance: Math.round(variance * 100) / 100,
    cv: Math.round(cv * 100) / 100,
    growthRate: Math.round(growthRate * 100) / 100,
    percentageChange: Math.round(percentageChange * 100) / 100,
    trendDirection,
    trendStrength: Math.round(trendStrength * 1000) / 1000,
    movingAverageLast: Math.round(movingAverageLast * 100) / 100,
    seasonalPeriod: bestPeriod,
    seasonalStrength: Math.round(bestAcf * 1000) / 1000,
    seasonalityDetected,
    outliers,
    changePoints,
    historicalPerformance,
  };
}

/**
 * Calculates full validation metrics: MAE, MSE, RMSE, MAPE (nullable on zeros), sMAPE, R2
 */
export function calculateExtendedMetrics(actuals: number[], predicted: number[]): ModelMetrics {
  const n = Math.min(actuals.length, predicted.length);
  if (n === 0) {
    return { mae: 0, mse: 0, rmse: 0, mape: null, smape: 0, r2: 0 };
  }

  let absErrorSum = 0;
  let sqErrorSum = 0;
  let pctErrorSum = 0;
  let pctCount = 0;
  let hasZeroActual = false;
  let smapeSum = 0;
  let actualSum = 0;

  for (let i = 0; i < n; i++) {
    const act = actuals[i];
    const pred = predicted[i];
    const diff = act - pred;

    absErrorSum += Math.abs(diff);
    sqErrorSum += diff * diff;
    actualSum += act;

    if (act === 0) {
      hasZeroActual = true;
    } else {
      pctErrorSum += Math.abs(diff / act);
      pctCount++;
    }

    const denom = Math.abs(act) + Math.abs(pred);
    smapeSum += denom === 0 ? 0 : (2 * Math.abs(diff)) / denom;
  }

  const meanActual = actualSum / n;
  let totalVariance = 0;
  for (let i = 0; i < n; i++) {
    totalVariance += Math.pow(actuals[i] - meanActual, 2);
  }

  const mae = absErrorSum / n;
  const mse = sqErrorSum / n;
  const rmse = Math.sqrt(mse);
  const mape = !hasZeroActual && pctCount === n ? (pctErrorSum / n) * 100 : null;
  const smape = (smapeSum / n) * 100;
  const r2 = totalVariance === 0 ? 1 : 1 - sqErrorSum / totalVariance;

  return {
    mae: Math.round(mae * 100) / 100,
    mse: Math.round(mse * 100) / 100,
    rmse: Math.round(rmse * 100) / 100,
    mape: mape !== null ? Math.round(mape * 100) / 100 : null,
    smape: Math.round(smape * 100) / 100,
    r2: Math.round(r2 * 1000) / 1000,
  };
}

// Backward-compatible calculateMetrics wrapper
export function calculateMetrics(actuals: number[], predicted: number[]): {
  mae: number;
  rmse: number;
  mape: number;
  r2: number;
} {
  const ext = calculateExtendedMetrics(actuals, predicted);
  return {
    mae: ext.mae,
    rmse: ext.rmse,
    mape: ext.mape ?? ext.smape,
    r2: Math.max(0, ext.r2),
  };
}

// ==================== CORE STATISTICAL MODELS ====================

export function runNaiveForecast(values: number[], steps: number): {
  fitted: number[];
  forecasts: number[];
  parameters: Record<string, number | string>;
} {
  if (values.length === 0) return { fitted: [], forecasts: [], parameters: {} };
  const fitted = values.map((v, i) => (i === 0 ? v : values[i - 1]));
  const last = values[values.length - 1];
  return {
    fitted,
    forecasts: Array(steps).fill(last),
    parameters: { method: 'Random Walk (Last Value)', lastValue: last },
  };
}

export function runLinearRegression(values: number[], steps: number): {
  fitted: number[];
  forecasts: number[];
  slope: number;
  intercept: number;
} {
  const n = values.length;
  if (n === 0) return { fitted: [], forecasts: [], slope: 0, intercept: 0 };
  if (n === 1) {
    const val = values[0];
    return { fitted: [val], forecasts: Array(steps).fill(val), slope: 0, intercept: val };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const denominator = n * sumXX - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  const fitted = values.map((_, i) => intercept + slope * i);
  const nonNegativeSeries = values.every(v => v >= 0);
  const forecasts = Array.from({ length: steps }, (_, i) => {
    const raw = intercept + slope * (n + i);
    return nonNegativeSeries ? Math.max(0, raw) : raw;
  });

  return { fitted, forecasts, slope, intercept };
}

export function runMovingAverage(values: number[], steps: number, windowSize: number = 5): {
  fitted: number[];
  forecasts: number[];
  window: number;
} {
  const n = values.length;
  if (n === 0) return { fitted: [], forecasts: [], window: 1 };
  const window = Math.max(2, Math.min(windowSize, Math.max(2, Math.floor(n / 2))));
  const fitted: number[] = [];

  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - window + 1);
    const sub = values.slice(start, i + 1);
    fitted.push(sub.reduce((a, b) => a + b, 0) / sub.length);
  }

  const extended = [...values];
  const forecasts: number[] = [];
  for (let s = 0; s < steps; s++) {
    const recent = extended.slice(-window);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    forecasts.push(avg);
    extended.push(avg);
  }

  return { fitted, forecasts, window };
}

export function runWeightedMovingAverage(values: number[], steps: number, windowSize: number = 4): {
  fitted: number[];
  forecasts: number[];
  window: number;
} {
  const n = values.length;
  if (n === 0) return { fitted: [], forecasts: [], window: 1 };
  const window = Math.max(2, Math.min(windowSize, Math.max(2, Math.floor(n / 2))));

  const calcWma = (slice: number[]): number => {
    let wSum = 0;
    let totalW = 0;
    for (let i = 0; i < slice.length; i++) {
      const w = i + 1;
      wSum += slice[i] * w;
      totalW += w;
    }
    return totalW === 0 ? 0 : wSum / totalW;
  };

  const fitted = values.map((_, i) => calcWma(values.slice(Math.max(0, i - window + 1), i + 1)));
  const extended = [...values];
  const forecasts: number[] = [];
  for (let s = 0; s < steps; s++) {
    const nextVal = calcWma(extended.slice(-window));
    forecasts.push(nextVal);
    extended.push(nextVal);
  }

  return { fitted, forecasts, window };
}

export function runEMA(values: number[], steps: number, windowSize: number = 5): {
  fitted: number[];
  forecasts: number[];
  alpha: number;
} {
  const n = values.length;
  if (n === 0) return { fitted: [], forecasts: [], alpha: 0.33 };
  const window = Math.max(2, Math.min(windowSize, Math.max(2, Math.floor(n / 2))));
  const alpha = 2 / (window + 1);
  const fitted: number[] = [values[0]];
  for (let i = 1; i < n; i++) {
    fitted.push(alpha * values[i] + (1 - alpha) * fitted[i - 1]);
  }
  const last = fitted[fitted.length - 1];
  const prev = fitted.length >= 2 ? fitted[fitted.length - 2] : last;
  const momentum = (last - prev) * 0.5;
  const nonNegative = values.every(v => v >= 0);
  const forecasts = Array.from({ length: steps }, (_, s) => {
    const val = last + momentum * Math.pow(0.75, s);
    return nonNegative ? Math.max(0, val) : val;
  });

  return { fitted, forecasts, alpha: Math.round(alpha * 1000) / 1000 };
}

export function runSimpleExponentialSmoothing(values: number[], steps: number, fixedAlpha?: number): {
  fitted: number[];
  forecasts: number[];
  alpha: number;
} {
  const n = values.length;
  if (n === 0) return { fitted: [], forecasts: [], alpha: 0.3 };

  const evalAlpha = (alpha: number) => {
    const fitted: number[] = [values[0]];
    let sse = 0;
    for (let i = 1; i < n; i++) {
      const pred = fitted[i - 1];
      sse += Math.pow(values[i] - pred, 2);
      fitted.push(alpha * values[i] + (1 - alpha) * fitted[i - 1]);
    }
    return { fitted, sse };
  };

  let bestAlpha = fixedAlpha ?? 0.3;
  let best = evalAlpha(bestAlpha);

  if (fixedAlpha === undefined && n >= 4) {
    for (const cand of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) {
      const res = evalAlpha(cand);
      if (res.sse < best.sse) {
        best = res;
        bestAlpha = cand;
      }
    }
  }

  const level = best.fitted[best.fitted.length - 1];
  return {
    fitted: best.fitted,
    forecasts: Array(steps).fill(level),
    alpha: bestAlpha,
  };
}

// Backward-compatible export wrapper
export function runExponentialSmoothing(values: number[], steps: number, alpha: number = 0.3): {
  fitted: number[];
  forecasts: number[];
} {
  const res = runSimpleExponentialSmoothing(values, steps, alpha);
  return { fitted: res.fitted, forecasts: res.forecasts };
}

export function runHoltLinearTrend(values: number[], steps: number): {
  fitted: number[];
  forecasts: number[];
  alpha: number;
  beta: number;
} {
  const n = values.length;
  if (n === 0) return { fitted: [], forecasts: [], alpha: 0.4, beta: 0.2 };
  if (n === 1) return { fitted: [values[0]], forecasts: Array(steps).fill(values[0]), alpha: 0.4, beta: 0.2 };

  const evalParams = (alpha: number, beta: number) => {
    let level = values[0];
    let trend = values[1] - values[0];
    const fitted: number[] = [values[0]];
    let sse = 0;

    for (let i = 1; i < n; i++) {
      const oneStepForecast = level + trend;
      fitted.push(oneStepForecast);
      sse += Math.pow(values[i] - oneStepForecast, 2);
      const prevLevel = level;
      level = alpha * values[i] + (1 - alpha) * (level + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
    }
    return { fitted, level, trend, sse };
  };

  let best = evalParams(0.4, 0.2);
  let bestAlpha = 0.4;
  let bestBeta = 0.2;

  for (const a of [0.2, 0.4, 0.6, 0.8]) {
    for (const b of [0.1, 0.2, 0.35, 0.5]) {
      const res = evalParams(a, b);
      if (res.sse < best.sse) {
        best = res;
        bestAlpha = a;
        bestBeta = b;
      }
    }
  }

  const nonNegative = values.every(v => v >= 0);
  const forecasts = Array.from({ length: steps }, (_, s) => {
    const val = best.level + best.trend * (s + 1);
    return nonNegative ? Math.max(0, val) : val;
  });

  return { fitted: best.fitted, forecasts, alpha: bestAlpha, beta: bestBeta };
}

export function runHoltWintersAdditive(values: number[], steps: number, seasonPeriod: number): {
  fitted: number[];
  forecasts: number[];
  alpha: number;
  beta: number;
  gamma: number;
  seasonPeriod: number;
} {
  const m = Math.max(2, seasonPeriod);
  const n = values.length;
  if (n < m * 2) {
    const holt = runHoltLinearTrend(values, steps);
    return { fitted: holt.fitted, forecasts: holt.forecasts, alpha: holt.alpha, beta: holt.beta, gamma: 0, seasonPeriod: m };
  }

  const evalHW = (alpha: number, beta: number, gamma: number) => {
    const firstSeasonAvg = values.slice(0, m).reduce((a, b) => a + b, 0) / m;
    const secondSeasonAvg = values.slice(m, 2 * m).reduce((a, b) => a + b, 0) / m;
    let level = firstSeasonAvg;
    let trend = (secondSeasonAvg - firstSeasonAvg) / m;
    const seasonals = Array.from({ length: m }, (_, i) => values[i] - firstSeasonAvg);

    const fitted: number[] = [];
    let sse = 0;

    for (let i = 0; i < n; i++) {
      const sIdx = i % m;
      const forecastVal = level + trend + seasonals[sIdx];
      fitted.push(forecastVal);
      if (i >= m) sse += Math.pow(values[i] - forecastVal, 2);

      const prevLevel = level;
      const prevSeason = seasonals[sIdx];
      level = alpha * (values[i] - prevSeason) + (1 - alpha) * (level + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
      seasonals[sIdx] = gamma * (values[i] - level) + (1 - gamma) * prevSeason;
    }

    return { fitted, level, trend, seasonals, sse };
  };

  let best = evalHW(0.3, 0.1, 0.2);
  let bestA = 0.3;
  let bestB = 0.1;
  let bestG = 0.2;

  for (const a of [0.2, 0.4, 0.6]) {
    for (const b of [0.1, 0.25]) {
      for (const g of [0.1, 0.3, 0.5]) {
        const res = evalHW(a, b, g);
        if (res.sse < best.sse) {
          best = res;
          bestA = a;
          bestB = b;
          bestG = g;
        }
      }
    }
  }

  const nonNegative = values.every(v => v >= 0);
  const forecasts = Array.from({ length: steps }, (_, s) => {
    const h = s + 1;
    const sIdx = (n + s) % m;
    const val = best.level + best.trend * h + best.seasonals[sIdx];
    return nonNegative ? Math.max(0, val) : val;
  });

  return { fitted: best.fitted, forecasts, alpha: bestA, beta: bestB, gamma: bestG, seasonPeriod: m };
}

function solveLinearSystem(matrix: number[][], rhs: number[]): number[] {
  const size = rhs.length;
  const A = matrix.map((row, idx) => [...row, rhs[idx]]);

  for (let i = 0; i < size; i++) {
    let maxRow = i;
    for (let k = i + 1; k < size; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
    }
    [A[i], A[maxRow]] = [A[maxRow], A[i]];

    const pivot = A[i][i];
    if (Math.abs(pivot) < 1e-10) continue;

    for (let j = i; j <= size; j++) A[i][j] /= pivot;
    for (let k = 0; k < size; k++) {
      if (k !== i) {
        const factor = A[k][i];
        for (let j = i; j <= size; j++) A[k][j] -= factor * A[i][j];
      }
    }
  }

  return A.map(row => (Number.isFinite(row[size]) ? row[size] : 0));
}

export function runAutoregressiveModel(values: number[], steps: number, lagOrder: number = 3): {
  fitted: number[];
  forecasts: number[];
  order: number;
  coefficients: number[];
} {
  const n = values.length;
  const p = Math.max(1, Math.min(lagOrder, Math.floor((n - 2) / 2)));
  if (n < p + 3) {
    const lr = runLinearRegression(values, steps);
    return { fitted: lr.fitted, forecasts: lr.forecasts, order: 1, coefficients: [lr.intercept, lr.slope] };
  }

  // Design matrix X: [1, y_{t-1}, ..., y_{t-p}]
  const cols = p + 1;
  const XTX: number[][] = Array.from({ length: cols }, () => Array(cols).fill(0));
  const XTY: number[] = Array(cols).fill(0);

  for (let t = p; t < n; t++) {
    const row = [1];
    for (let k = 1; k <= p; k++) row.push(values[t - k]);
    const y = values[t];
    for (let i = 0; i < cols; i++) {
      XTY[i] += row[i] * y;
      for (let j = 0; j < cols; j++) {
        XTX[i][j] += row[i] * row[j];
      }
    }
  }

  // Ridge regularization on weights to prevent ill-conditioning
  const scale = values.reduce((a, b) => a + Math.abs(b), 0) / n || 1;
  for (let i = 0; i < cols; i++) {
    XTX[i][i] += 1e-4 * scale;
  }

  const weights = solveLinearSystem(XTX, XTY);

  const fitted: number[] = values.map((v, t) => {
    if (t < p) return v;
    let pred = weights[0];
    for (let k = 1; k <= p; k++) pred += weights[k] * values[t - k];
    return pred;
  });

  const nonNegative = values.every(v => v >= 0);
  const extended = [...values];
  const forecasts: number[] = [];

  for (let s = 0; s < steps; s++) {
    let pred = weights[0];
    for (let k = 1; k <= p; k++) {
      pred += weights[k] * extended[extended.length - k];
    }
    const clamped = nonNegative ? Math.max(0, pred) : pred;
    forecasts.push(clamped);
    extended.push(clamped);
  }

  return {
    fitted,
    forecasts,
    order: p,
    coefficients: weights.map(w => Math.round(w * 10000) / 10000),
  };
}

export function runSarimaHeuristic(values: number[], steps: number, seasonPeriod: number): {
  fitted: number[];
  forecasts: number[];
  seasonPeriod: number;
  arOrder: number;
} {
  const m = Math.max(2, seasonPeriod);
  const n = values.length;
  if (n < m + 6) {
    const ar = runAutoregressiveModel(values, steps, 2);
    return { fitted: ar.fitted, forecasts: ar.forecasts, seasonPeriod: m, arOrder: ar.order };
  }

  // Seasonal difference z_t = y_t - y_{t-m}
  const diffed: number[] = [];
  for (let t = m; t < n; t++) {
    diffed.push(values[t] - values[t - m]);
  }

  const arOrder = Math.min(2, Math.max(1, Math.floor(diffed.length / 4)));
  const arRes = runAutoregressiveModel(diffed, steps, arOrder);

  const fitted = values.map((v, t) => {
    if (t < m) return v;
    const diffPred = arRes.fitted[t - m] ?? 0;
    return values[t - m] + diffPred;
  });

  const nonNegative = values.every(v => v >= 0);
  const extended = [...values];
  const forecasts: number[] = [];

  for (let s = 0; s < steps; s++) {
    const seasonalBase = extended[extended.length - m];
    const diffPred = arRes.forecasts[s] ?? 0;
    const nextVal = seasonalBase + diffPred;
    const clamped = nonNegative ? Math.max(0, nextVal) : nextVal;
    forecasts.push(clamped);
    extended.push(clamped);
  }

  return { fitted, forecasts, seasonPeriod: m, arOrder };
}

function executeSingleModel(
  modelId: Exclude<ForecastModelId, 'auto'>,
  values: number[],
  steps: number,
  seasonalPeriod: number
): {
  fitted: number[];
  forecasts: number[];
  parameters: Record<string, number | string>;
} {
  switch (modelId) {
    case 'naive':
      return runNaiveForecast(values, steps);
    case 'sma': {
      const res = runMovingAverage(values, steps);
      return { fitted: res.fitted, forecasts: res.forecasts, parameters: { window: res.window } };
    }
    case 'wma': {
      const res = runWeightedMovingAverage(values, steps);
      return { fitted: res.fitted, forecasts: res.forecasts, parameters: { window: res.window, weighting: 'linear' } };
    }
    case 'ema': {
      const res = runEMA(values, steps);
      return { fitted: res.fitted, forecasts: res.forecasts, parameters: { alpha: res.alpha } };
    }
    case 'ses': {
      const res = runSimpleExponentialSmoothing(values, steps);
      return { fitted: res.fitted, forecasts: res.forecasts, parameters: { alpha: res.alpha } };
    }
    case 'holt': {
      const res = runHoltLinearTrend(values, steps);
      return { fitted: res.fitted, forecasts: res.forecasts, parameters: { alpha: res.alpha, beta: res.beta } };
    }
    case 'holt_winters': {
      const res = runHoltWintersAdditive(values, steps, seasonalPeriod);
      return {
        fitted: res.fitted,
        forecasts: res.forecasts,
        parameters: { alpha: res.alpha, beta: res.beta, gamma: res.gamma, seasonPeriod: res.seasonPeriod },
      };
    }
    case 'linear': {
      const res = runLinearRegression(values, steps);
      return {
        fitted: res.fitted,
        forecasts: res.forecasts,
        parameters: { slope: Math.round(res.slope * 1000) / 1000, intercept: Math.round(res.intercept * 100) / 100 },
      };
    }
    case 'autoregressive': {
      const res = runAutoregressiveModel(values, steps, 3);
      return {
        fitted: res.fitted,
        forecasts: res.forecasts,
        parameters: { order: `AR(${res.order})` },
      };
    }
    case 'sarima': {
      const res = runSarimaHeuristic(values, steps, seasonalPeriod);
      return {
        fitted: res.fitted,
        forecasts: res.forecasts,
        parameters: { order: `SAR(${res.arOrder})[D=1,m=${res.seasonPeriod}]` },
      };
    }
  }
}

/**
 * Checks whether a candidate model is statistically eligible for the given series
 */
export function evaluateModelEligibility(
  modelId: Exclude<ForecastModelId, 'auto'>,
  stats: TimeSeriesStatistics
): { eligible: boolean; reason: string } {
  const meta = MODEL_CATALOG[modelId];
  if (stats.count < meta.minSamples) {
    return {
      eligible: false,
      reason: `Membutuhkan minimal ${meta.minSamples} titik observasi (tersedia ${stats.count}).`,
    };
  }

  if (modelId === 'holt_winters') {
    if (!stats.seasonalityDetected || stats.seasonalPeriod < 2 || stats.count < stats.seasonalPeriod * 2) {
      return {
        eligible: false,
        reason: `Membutuhkan pola musiman terverifikasi & minimal 2 siklus penuh (${Math.max(4, stats.seasonalPeriod * 2)} titik).`,
      };
    }
  }

  if (modelId === 'sarima') {
    if (!stats.seasonalityDetected || stats.seasonalPeriod < 2 || stats.count < stats.seasonalPeriod + 6) {
      return {
        eligible: false,
        reason: `Membutuhkan data musiman minimal ${stats.seasonalPeriod + 6} observasi untuk diferensiasi musiman.`,
      };
    }
  }

  return { eligible: true, reason: 'Memenuhi syarat observasi dan karakteristik deret waktu.' };
}

/**
 * Strict Time-Series Split / Rolling-Origin Backtesting (Zero Data Leakage)
 */
export function runRollingOriginBacktest(
  history: DataPoint[],
  modelId: Exclude<ForecastModelId, 'auto'>,
  seasonalPeriod: number
): {
  status: 'VALIDATED' | 'INSUFFICIENT_DATA';
  trainingPeriod: string;
  testingPeriod: string;
  trainCount: number;
  testCount: number;
  metrics: ModelMetrics;
  backtestPoints: BacktestPoint[];
} {
  const n = history.length;
  const values = history.map(h => h.value);

  if (n < 6) {
    const fullFit = executeSingleModel(modelId, values, 0, seasonalPeriod);
    return {
      status: 'INSUFFICIENT_DATA',
      trainingPeriod: `${history[0]?.date || '-'} s/d ${history[n - 1]?.date || '-'}`,
      testingPeriod: 'Tidak cukup data (< 6 titik)',
      trainCount: n,
      testCount: 0,
      metrics: calculateExtendedMetrics(values, fullFit.fitted),
      backtestPoints: [],
    };
  }

  const testSize = Math.max(2, Math.min(12, Math.floor(n * 0.25)));
  const trainEnd = Math.max(MODEL_CATALOG[modelId].minSamples, n - testSize);

  if (trainEnd >= n) {
    const fullFit = executeSingleModel(modelId, values, 0, seasonalPeriod);
    return {
      status: 'INSUFFICIENT_DATA',
      trainingPeriod: `${history[0].date} s/d ${history[n - 1].date}`,
      testingPeriod: 'Terlalu sedikit data untuk split',
      trainCount: n,
      testCount: 0,
      metrics: calculateExtendedMetrics(values, fullFit.fitted),
      backtestPoints: [],
    };
  }

  const backtestPoints: BacktestPoint[] = [];
  const actuals: number[] = [];
  const preds: number[] = [];

  // Rolling-origin 1-step-ahead out-of-sample evaluation (strictly past data only!)
  for (let t = trainEnd; t < n; t++) {
    const trainSlice = values.slice(0, t);
    const res = executeSingleModel(modelId, trainSlice, 1, seasonalPeriod);
    const predicted = Math.round((res.forecasts[0] ?? trainSlice[trainSlice.length - 1]) * 100) / 100;
    const actual = values[t];
    const error = Math.round((actual - predicted) * 100) / 100;
    const absError = Math.round(Math.abs(error) * 100) / 100;
    const pctError = actual !== 0 ? Math.round((absError / Math.abs(actual)) * 10000) / 100 : null;

    actuals.push(actual);
    preds.push(predicted);
    backtestPoints.push({
      date: history[t].date,
      actual,
      predicted,
      error,
      absError,
      pctError,
    });
  }

  return {
    status: 'VALIDATED',
    trainingPeriod: `${history[0].date} s/d ${history[trainEnd - 1].date}`,
    testingPeriod: `${history[trainEnd].date} s/d ${history[n - 1].date}`,
    trainCount: trainEnd,
    testCount: n - trainEnd,
    metrics: calculateExtendedMetrics(actuals, preds),
    backtestPoints,
  };
}

/**
 * Benchmarks all eligible models via Rolling-Origin Backtesting and ranks them
 */
export function compareForecastModels(
  history: DataPoint[],
  stats: TimeSeriesStatistics
): ModelComparisonRow[] {
  const allIds = Object.keys(MODEL_CATALOG) as Exclude<ForecastModelId, 'auto'>[];
  const rows: ModelComparisonRow[] = [];

  for (const modelId of allIds) {
    const meta = MODEL_CATALOG[modelId];
    const elig = evaluateModelEligibility(modelId, stats);

    if (!elig.eligible) {
      rows.push({
        modelId,
        modelName: meta.name,
        family: meta.family,
        eligible: false,
        eligibilityReason: elig.reason,
        validationStatus: 'INELIGIBLE',
        metrics: null,
        parameters: {},
        rank: null,
        isRecommended: false,
      });
      continue;
    }

    try {
      const bt = runRollingOriginBacktest(history, modelId, stats.seasonalPeriod);
      const fit = executeSingleModel(modelId, history.map(h => h.value), 0, stats.seasonalPeriod);
      rows.push({
        modelId,
        modelName: meta.name,
        family: meta.family,
        eligible: true,
        eligibilityReason: elig.reason,
        validationStatus: bt.status,
        metrics: bt.metrics,
        parameters: fit.parameters,
        rank: null,
        isRecommended: false,
      });
    } catch {
      rows.push({
        modelId,
        modelName: meta.name,
        family: meta.family,
        eligible: true,
        eligibilityReason: 'Gagal melakukan fitting pada struktur data ini.',
        validationStatus: 'FAILED',
        metrics: null,
        parameters: {},
        rank: null,
        isRecommended: false,
      });
    }
  }

  const rankable = rows.filter(r => r.metrics !== null && (r.validationStatus === 'VALIDATED' || r.validationStatus === 'INSUFFICIENT_DATA'));
  rankable.sort((a, b) => {
    const rmseA = a.metrics?.rmse ?? Infinity;
    const rmseB = b.metrics?.rmse ?? Infinity;
    if (Math.abs(rmseA - rmseB) > 1e-4) return rmseA - rmseB;
    const smapeA = a.metrics?.smape ?? Infinity;
    const smapeB = b.metrics?.smape ?? Infinity;
    return smapeA - smapeB;
  });

  rankable.forEach((row, idx) => {
    row.rank = idx + 1;
    row.isRecommended = idx === 0;
  });

  return rows;
}

/**
 * Scenario Analysis (Optimistic / Baseline / Pessimistic) with transparent assumptions
 */
export function buildScenarioAnalysis(
  futureDates: string[],
  baselineForecasts: number[],
  stdDev: number,
  shockPct: number = 12,
  allowNegative: boolean = false
): ScenarioSummary {
  const safeShock = Math.max(2, Math.min(50, Math.abs(shockPct))) / 100;
  const steps = futureDates.length;

  const points: ScenarioPoint[] = futureDates.map((date, idx) => {
    const base = baselineForecasts[idx] ?? 0;
    const ramp = (idx + 1) / Math.max(1, steps);
    const delta = Math.max(Math.abs(base) * safeShock * (0.4 + 0.6 * ramp), stdDev * 0.5 * ramp);
    const opt = Math.round((base + delta) * 100) / 100;
    const pessRaw = base - delta;
    const pess = Math.round((allowNegative ? pessRaw : Math.max(0, pessRaw)) * 100) / 100;

    return {
      date,
      step: idx + 1,
      optimistic: opt,
      baseline: Math.round(base * 100) / 100,
      pessimistic: pess,
    };
  });

  const meanOf = (arr: number[]) =>
    arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : 0;

  return {
    shockPercentage: Math.round(safeShock * 100),
    assumptions: [
      `Baseline Scenario: Mengikuti lintasan prediksi model statistik utama tanpa guncangan eksternal (0% deviasi).`,
      `Optimistic Scenario: Asumsi akselerasi bertahap hingga +${Math.round(safeShock * 100)}% (atau minimal +0.5σ historis) pada akhir horizon.`,
      `Pessimistic Scenario: Asumsi kontraksi bertahap hingga -${Math.round(safeShock * 100)}% (atau minimal -0.5σ historis) pada akhir horizon.`,
      `Catatan: Skenario adalah simulasi sensitivitas manajerial, bukan pengganti prediksi titik utama.`,
    ],
    optimisticFinal: points[points.length - 1]?.optimistic ?? 0,
    baselineFinal: points[points.length - 1]?.baseline ?? 0,
    pessimisticFinal: points[points.length - 1]?.pessimistic ?? 0,
    optimisticMean: meanOf(points.map(p => p.optimistic)),
    baselineMean: meanOf(points.map(p => p.baseline)),
    pessimisticMean: meanOf(points.map(p => p.pessimistic)),
    points,
  };
}

/**
 * Full Enterprise Forecasting Pipeline (Validation -> Stats -> Backtesting -> Auto-Select -> CI 80/95 -> Scenarios)
 */
export function runAdvancedForecastPipeline(input: ForecastPipelineInput): {
  success: boolean;
  error?: string;
  issues: ValidationIssue[];
  prepared?: PreparedSeriesResult;
  result?: ForecastOutput;
} {
  const prepared = prepareTimeSeries({
    rows: input.rows,
    dateColumn: input.dateColumn,
    targetColumn: input.targetColumn,
    categoryColumn: input.categoryColumn,
    segmentValue: input.segmentValue,
    frequency: input.frequency || 'auto',
    historicalPeriod: input.historicalPeriod || 'all',
    aggregation: input.aggregation || 'sum',
  });

  if (!prepared.valid) {
    return {
      success: false,
      error: prepared.blockingError || 'Dataset tidak valid untuk peramalan.',
      issues: prepared.issues,
      prepared,
    };
  }

  const history = prepared.points;
  const freq = prepared.appliedFrequency;
  const horizon = input.horizon || '30d';
  const steps = getHorizonSteps(horizon, freq, input.customSteps);
  const confidenceLevel: ConfidenceLevel = input.confidenceLevel || 0.95;

  const issues = [...prepared.issues];
  if (steps > history.length * 2) {
    issues.push({
      code: 'HORIZON_TOO_LONG',
      severity: 'warning',
      message: `Horizon prediksi (${steps} langkah) jauh lebih panjang daripada panjang data historis (${history.length} titik). Ketidakpastian jangka panjang akan melebar.`,
    });
  }

  const stats = computeTimeSeriesStats(history, freq);
  const comparisons = compareForecastModels(history, stats);

  const requestedId = normalizeModelId(input.method || 'auto');
  let selectedId: Exclude<ForecastModelId, 'auto'>;
  let selectionReason = '';

  if (requestedId === 'auto') {
    const winner = comparisons.find(c => c.isRecommended) || comparisons.find(c => c.eligible);
    selectedId = winner?.modelId || 'linear';
    const rmseLabel = winner?.metrics ? `RMSE = ${winner.metrics.rmse.toLocaleString()}, sMAPE = ${winner.metrics.smape}%` : '';
    selectionReason = `Auto Model Selection memilih ${MODEL_CATALOG[selectedId].name} sebagai pemenang backtesting historis (${rmseLabel}) sesuai karakteristik ${stats.trendDirection.toLowerCase()} dan ${stats.seasonalityDetected ? `musiman periode ${stats.seasonalPeriod}` : 'tanpa musiman kuat'}.`;
  } else {
    const elig = evaluateModelEligibility(requestedId, stats);
    if (!elig.eligible) {
      issues.push({
        code: 'SEASONAL_TOO_SHORT',
        severity: 'warning',
        message: `Model ${MODEL_CATALOG[requestedId].name} tidak memenuhi syarat: ${elig.reason} Dialihkan otomatis ke model valid terbaik.`,
      });
      const winner = comparisons.find(c => c.isRecommended) || comparisons.find(c => c.eligible);
      selectedId = winner?.modelId || 'linear';
      selectionReason = `${MODEL_CATALOG[requestedId].name} tidak memenuhi syarat data (${elig.reason}). Sistem beralih ke ${MODEL_CATALOG[selectedId].name}.`;
    } else {
      selectedId = requestedId;
      selectionReason = `Model ${MODEL_CATALOG[selectedId].name} dipilih secara manual oleh pengguna dan divalidasi dengan time-series split.`;
    }
  }

  const values = history.map(h => h.value);
  const lrTrend = runLinearRegression(values, steps);
  const backtest = runRollingOriginBacktest(history, selectedId, stats.seasonalPeriod);
  const fullRun = executeSingleModel(selectedId, values, steps, stats.seasonalPeriod);

  // Build lookup map for backtest predictions
  const backtestMap = new Map<string, number>();
  backtest.backtestPoints.forEach(bp => backtestMap.set(bp.date, bp.predicted));

  const zSelected = getZScore(confidenceLevel);
  const z80 = getZScore(0.80);
  const z95 = getZScore(0.95);

  const allowNegative = values.some(v => v < 0);
  const rawErrorScale = Math.max(backtest.metrics.rmse, stats.stdDev * 0.05);

  const lastVal = values[values.length - 1];
  const lastForecast = fullRun.forecasts[fullRun.forecasts.length - 1] ?? lastVal;
  const growthPercentage = Math.round(((lastForecast - lastVal) / (Math.abs(lastVal) || 1)) * 1000) / 10;

  let trend: 'UPWARD' | 'DOWNWARD' | 'STABLE' = 'STABLE';
  if (growthPercentage > 2) trend = 'UPWARD';
  else if (growthPercentage < -2) trend = 'DOWNWARD';

  const points: ForecastResultPoint[] = history.map((d, i) => {
    const fitVal = Math.round((fullRun.fitted[i] ?? d.value) * 100) / 100;
    const btPred = backtestMap.get(d.date);
    const mSel = Math.round(zSelected * rawErrorScale * 100) / 100;
    const m80 = Math.round(z80 * rawErrorScale * 100) / 100;
    const m95 = Math.round(z95 * rawErrorScale * 100) / 100;

    const lowerSel = allowNegative ? Math.round((fitVal - mSel) * 100) / 100 : Math.max(0, Math.round((fitVal - mSel) * 100) / 100);
    const upperSel = Math.round((fitVal + mSel) * 100) / 100;

    return {
      date: d.date,
      historical: d.value,
      forecast: fitVal,
      trendLine: Math.round((lrTrend.fitted[i] ?? d.value) * 100) / 100,
      backtestPredicted: btPred,
      lowerBound: lowerSel,
      upperBound: upperSel,
      lower80: allowNegative ? Math.round((fitVal - m80) * 100) / 100 : Math.max(0, Math.round((fitVal - m80) * 100) / 100),
      upper80: Math.round((fitVal + m80) * 100) / 100,
      lower95: allowNegative ? Math.round((fitVal - m95) * 100) / 100 : Math.max(0, Math.round((fitVal - m95) * 100) / 100),
      upper95: Math.round((fitVal + m95) * 100) / 100,
      ciRange: [lowerSel, upperSel],
      marginOfError: mSel,
      margin80: m80,
      margin95: m95,
      status: btPred !== undefined ? 'Backtest' : 'Historical',
    };
  });

  const lastDateStr = history[history.length - 1]?.date || '';
  const futureDates: string[] = [];
  let sumFutureVal = 0;
  let sumMarginSel = 0;
  let sumMargin80 = 0;
  let sumMargin95 = 0;

  for (let s = 1; s <= steps; s++) {
    const dateStr = generateNextDateString(lastDateStr, s, freq);
    futureDates.push(dateStr);
    const fVal = fullRun.forecasts[s - 1] ?? lastVal;
    const tVal = lrTrend.forecasts[s - 1] ?? fVal;

    // Horizon uncertainty grows monotonically as sqrt(1 + 0.15 * (s - 1))
    const expansion = Math.sqrt(1 + 0.15 * (s - 1));
    const mSel = Math.round(zSelected * rawErrorScale * expansion * 100) / 100;
    const m80 = Math.round(z80 * rawErrorScale * expansion * 100) / 100;
    const m95 = Math.round(z95 * rawErrorScale * expansion * 100) / 100;

    const lowerSel = allowNegative ? Math.round((fVal - mSel) * 100) / 100 : Math.max(0, Math.round((fVal - mSel) * 100) / 100);
    const upperSel = Math.round((fVal + mSel) * 100) / 100;
    const lower80 = allowNegative ? Math.round((fVal - m80) * 100) / 100 : Math.max(0, Math.round((fVal - m80) * 100) / 100);
    const upper80 = Math.round((fVal + m80) * 100) / 100;
    const lower95 = allowNegative ? Math.round((fVal - m95) * 100) / 100 : Math.max(0, Math.round((fVal - m95) * 100) / 100);
    const upper95 = Math.round((fVal + m95) * 100) / 100;

    sumFutureVal += fVal;
    sumMarginSel += mSel;
    sumMargin80 += m80;
    sumMargin95 += m95;

    points.push({
      date: dateStr,
      forecast: Math.round(fVal * 100) / 100,
      trendLine: Math.round(tVal * 100) / 100,
      lowerBound: lowerSel,
      upperBound: upperSel,
      lower80,
      upper80,
      lower95,
      upper95,
      ciRange: [lowerSel, upperSel],
      marginOfError: mSel,
      margin80: m80,
      margin95: m95,
      status: 'Forecast',
    });
  }

  const avgVal = steps > 0 ? sumFutureVal / steps : 0;
  const avgMSel = steps > 0 ? sumMarginSel / steps : 0;
  const avgM80 = steps > 0 ? sumMargin80 / steps : 0;
  const avgM95 = steps > 0 ? sumMargin95 / steps : 0;

  const scenarios = buildScenarioAnalysis(
    futureDates,
    fullRun.forecasts,
    stats.stdDev,
    input.scenarioShockPct ?? 12,
    allowNegative
  );

  const validationNote =
    backtest.status === 'VALIDATED'
      ? `Dievaluasi menggunakan Time-Series Rolling-Origin Split (Train: ${backtest.trainCount} titik, Test: ${backtest.testCount} titik) tanpa data leakage.`
      : `Observasi historis (${history.length} titik) belum mencukupi (< 6 titik) untuk out-of-sample split; metrik dihitung dari residual in-sample dengan kehati-hatian ekstra.`;

  const ciLimitationNote =
    'Prediction Interval (80% & 95%) merepresentasikan rentang ketidakpastian statistik berdasarkan simpangan error historis (RMSE); interval ini bukan jaminan mutlak bahwa nilai aktual di masa depan pasti berada di dalamnya.';

  return {
    success: true,
    issues,
    prepared,
    result: {
      points,
      evaluation: {
        mae: backtest.metrics.mae,
        mse: backtest.metrics.mse,
        rmse: backtest.metrics.rmse,
        mape: backtest.metrics.mape ?? backtest.metrics.smape,
        mapeAvailable: backtest.metrics.mape !== null,
        smape: backtest.metrics.smape,
        r2: Math.round(backtest.metrics.r2 * 1000) / 1000,
        trend,
        growthPercentage,
        sampleSize: history.length,
        confidenceLevel,
        zScore: zSelected,
        meanProjected: Math.round(avgVal * 100) / 100,
        ciLower: allowNegative ? Math.round((avgVal - avgMSel) * 100) / 100 : Math.max(0, Math.round((avgVal - avgMSel) * 100) / 100),
        ciUpper: Math.round((avgVal + avgMSel) * 100) / 100,
        ci80Lower: allowNegative ? Math.round((avgVal - avgM80) * 100) / 100 : Math.max(0, Math.round((avgVal - avgM80) * 100) / 100),
        ci80Upper: Math.round((avgVal + avgM80) * 100) / 100,
        ci95Lower: allowNegative ? Math.round((avgVal - avgM95) * 100) / 100 : Math.max(0, Math.round((avgVal - avgM95) * 100) / 100),
        ci95Upper: Math.round((avgVal + avgM95) * 100) / 100,
        averageMarginOfError: Math.round(avgMSel * 100) / 100,
        validationStatus: backtest.status,
        validationNote,
        trainingPeriod: backtest.trainingPeriod,
        testingPeriod: backtest.testingPeriod,
        trainCount: backtest.trainCount,
        testCount: backtest.testCount,
        selectedModelId: selectedId,
        selectedModelName: MODEL_CATALOG[selectedId].name,
        selectionReason,
        modelParameters: fullRun.parameters,
        ciLimitationNote,
      },
      statistics: stats,
      backtestPoints: backtest.backtestPoints,
      modelComparisons: comparisons,
      scenarios,
      issues,
      appliedFrequency: freq,
      horizonSteps: steps,
      method: selectedId,
      confidenceLevel,
    },
  };
}

/**
 * Backward-compatible wrapper preserving exact existing signature used in analytics.test.ts
 */
export function generateForecast(
  history: DataPoint[],
  method: ForecastMethod = 'linear',
  horizon: ForecastHorizon = '30d',
  confidenceLevel: ConfidenceLevel = 0.95
): ForecastOutput {
  if (!history || history.length === 0) {
    return {
      points: [],
      evaluation: {
        mae: 0,
        mse: 0,
        rmse: 0,
        mape: 0,
        mapeAvailable: false,
        smape: 0,
        r2: 0,
        trend: 'STABLE',
        growthPercentage: 0,
        sampleSize: 0,
        confidenceLevel: 0.95,
        zScore: 1.96,
        meanProjected: 0,
        ciLower: 0,
        ciUpper: 0,
        ci80Lower: 0,
        ci80Upper: 0,
        ci95Lower: 0,
        ci95Upper: 0,
        averageMarginOfError: 0,
        validationStatus: 'INSUFFICIENT_DATA',
        validationNote: 'Dataset kosong.',
        trainingPeriod: '-',
        testingPeriod: '-',
        trainCount: 0,
        testCount: 0,
        selectedModelId: 'linear',
        selectedModelName: MODEL_CATALOG.linear.name,
        selectionReason: 'Dataset kosong.',
        modelParameters: {},
        ciLimitationNote: '',
      },
      statistics: computeTimeSeriesStats([]),
      backtestPoints: [],
      modelComparisons: [],
      scenarios: buildScenarioAnalysis([], [], 0),
      issues: [],
      appliedFrequency: 'daily',
      horizonSteps: getHorizonSteps(horizon),
      method,
      confidenceLevel,
    };
  }

  const rows = history.map(pt => ({ date: pt.date, value: pt.value }));
  const res = runAdvancedForecastPipeline({
    rows,
    dateColumn: 'date',
    targetColumn: 'value',
    frequency: 'daily',
    method,
    horizon,
    confidenceLevel,
  });

  if (res.result) return res.result;

  // Fallback for very small 2-point sequences (like 2 points)
  const values = history.map(h => h.value);
  const steps = getHorizonSteps(horizon, 'daily');
  const lr = runLinearRegression(values, steps);
  const z = getZScore(confidenceLevel);
  const points: ForecastResultPoint[] = [
    ...history.map((h, i) => ({
      date: h.date,
      historical: h.value,
      forecast: lr.fitted[i],
      lowerBound: h.value,
      upperBound: h.value,
      marginOfError: 0,
      status: 'Historical' as const,
    })),
    ...lr.forecasts.map((f, s) => ({
      date: generateNextDateString(history[history.length - 1].date, s + 1, 'daily'),
      forecast: f,
      lowerBound: Math.max(0, f - z),
      upperBound: f + z,
      marginOfError: z,
      status: 'Forecast' as const,
    })),
  ];

  return {
    points,
    evaluation: {
      mae: 0,
      mse: 0,
      rmse: 0,
      mape: 0,
      mapeAvailable: true,
      smape: 0,
      r2: 1,
      trend: 'STABLE',
      growthPercentage: 0,
      sampleSize: history.length,
      confidenceLevel,
      zScore: z,
      meanProjected: lr.forecasts[0] ?? 0,
      ciLower: 0,
      ciUpper: lr.forecasts[0] ?? 0,
      ci80Lower: 0,
      ci80Upper: lr.forecasts[0] ?? 0,
      ci95Lower: 0,
      ci95Upper: lr.forecasts[0] ?? 0,
      averageMarginOfError: z,
      validationStatus: 'INSUFFICIENT_DATA',
      validationNote: 'Observasi minimal (< 3 titik).',
      trainingPeriod: '-',
      testingPeriod: '-',
      trainCount: history.length,
      testCount: 0,
      selectedModelId: 'linear',
      selectedModelName: MODEL_CATALOG.linear.name,
      selectionReason: 'Minimal samples',
      modelParameters: {},
      ciLimitationNote: '',
    },
    statistics: computeTimeSeriesStats(history),
    backtestPoints: [],
    modelComparisons: [],
    scenarios: buildScenarioAnalysis([], [], 0),
    issues: res.issues,
    appliedFrequency: 'daily',
    horizonSteps: steps,
    method,
    confidenceLevel,
  };
}
