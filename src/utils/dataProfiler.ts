import { computeNumericStats } from './analytics';

export type SemanticColumnType =
  | 'Numerical'
  | 'Categorical'
  | 'DateTime'
  | 'Boolean'
  | 'Text'
  | 'Identifier'
  | 'Geographic'
  | 'Currency';

export interface HistogramBin {
  label: string;
  min: number;
  max: number;
  count: number;
}

export interface CategoryFrequency {
  value: string;
  count: number;
  pct: number;
}

export interface DetailedColumnProfile {
  name: string;
  semanticType: SemanticColumnType;
  baseType: 'numeric' | 'date' | 'categorical' | 'text';
  totalCount: number;
  nonNullCount: number;
  missingCount: number;
  nullPct: number;
  uniqueCount: number;
  uniquePct: number;
  duplicateValueCount: number;
  mode: string | number | null;
  modeCount: number;
  sampleValues: (string | number)[];
  qualityIssues: string[];
  numericStats?: {
    min: number;
    max: number;
    range: number;
    sum: number;
    mean: number;
    median: number;
    variance: number;
    stdDev: number;
    q1: number;
    q3: number;
    iqr: number;
    p5: number;
    p95: number;
    cvPct: number;
    skewness: number;
    outlierCountIQR: number;
    outlierCountZScore: number;
  };
  histogramBins?: HistogramBin[];
  topCategories?: CategoryFrequency[];
}

export interface DataQualityBreakdown {
  completenessScore: number; // % non-missing cells
  uniquenessScore: number; // % non-duplicate rows
  consistencyScore: number; // % type consistency across columns
  validityScore: number; // inverse anomaly/malformed score
  overallScore: number; // 0 - 100 weighted index
  grade: 'Excellent' | 'Good' | 'Fair' | 'Needs Cleaning';
}

export interface DatasetReadinessCheck {
  hasEnoughRows: boolean;
  hasNumericData: boolean;
  hasDateColumn: boolean;
  hasCategoricalColumn: boolean;
  isForecastable: boolean;
  isStatisticalTestable: boolean;
  isMiningSuitable: boolean;
  reasons: string[];
}

export interface DataProfileReport {
  rowCount: number;
  colCount: number;
  totalCells: number;
  missingCells: number;
  missingPct: number;
  duplicateRows: number;
  duplicatePct: number;
  quality: DataQualityBreakdown;
  readiness: DatasetReadinessCheck;
  warnings: string[];
  columns: DetailedColumnProfile[];
}

const GEO_NAME_HINT =
  /(region|wilayah|provinsi|province|kota|city|kabupaten|negara|country|lokasi|location|area|branch|cabang|zona|zone|district|kecamatan)/i;
const CURRENCY_NAME_HINT =
  /(revenue|profit|cost|price|harga|biaya|omzet|pendapatan|gaji|salary|budget|anggaran|nilai_rp|amount|total_idr|mrr|arr|ltv|cac|sales|laba)/i;
const ID_NAME_HINT = /(^id$|_id$|^kode|^code$|order_id|user_id|customer_id|trx_id|sku|invoice|nik|nim)/i;
const BOOL_VALUES = new Set(['true', 'false', 'yes', 'no', 'ya', 'tidak', '1', '0']);

function parseNumericValue(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'boolean') return null;
  const s = String(v).trim();
  if (!s) return null;
  const cleaned = s.replace(/^(rp\.?|idr|\$|€|£)\s*/i, '').replace(/[, %]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function isValidDateString(v: any): boolean {
  if (v instanceof Date) return !Number.isNaN(v.getTime());
  if (typeof v !== 'string') return false;
  const s = v.trim();
  const isPattern =
    /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(s) ||
    /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(s) ||
    /^\d{4}-\d{2}$/.test(s);
  if (!isPattern) return false;
  const ts = Date.parse(s);
  return !Number.isNaN(ts);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function percentileSorted(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] * (hi - idx) + sorted[hi] * (idx - lo);
}

export function profileColumn(colName: string, values: any[]): DetailedColumnProfile {
  const totalCount = values.length;
  const nonNulls = values.filter(v => v !== null && v !== undefined && String(v).trim() !== '');
  const nonNullCount = nonNulls.length;
  const missingCount = totalCount - nonNullCount;
  const nullPct = totalCount > 0 ? round2((missingCount / totalCount) * 100) : 0;

  // Frequency & mode
  const freqMap = new Map<string, number>();
  for (const val of nonNulls) {
    const k = String(val).trim();
    freqMap.set(k, (freqMap.get(k) || 0) + 1);
  }
  const uniqueCount = freqMap.size;
  const uniquePct = nonNullCount > 0 ? round2((uniqueCount / nonNullCount) * 100) : 0;
  const duplicateValueCount = Math.max(0, nonNullCount - uniqueCount);

  let mode: string | number | null = null;
  let modeCount = 0;
  for (const [k, cnt] of freqMap.entries()) {
    if (cnt > modeCount) {
      modeCount = cnt;
      const numCand = parseNumericValue(k);
      mode = numCand !== null && typeof nonNulls[0] === 'number' ? numCand : k;
    }
  }

  // Classify semantic & base type
  let numericValidCount = 0;
  let dateValidCount = 0;
  let boolValidCount = 0;
  let currencySymbolCount = 0;

  for (const v of nonNulls) {
    if (typeof v === 'string' && /^(rp\.?|idr|\$|€|£)/i.test(v.trim())) {
      currencySymbolCount++;
    }
    if (typeof v === 'boolean' || BOOL_VALUES.has(String(v).trim().toLowerCase())) {
      boolValidCount++;
    }
    if (parseNumericValue(v) !== null) {
      numericValidCount++;
    } else if (isValidDateString(v)) {
      dateValidCount++;
    }
  }

  const ratioThreshold = nonNullCount * 0.75;
  let baseType: 'numeric' | 'date' | 'categorical' | 'text' = 'text';
  let semanticType: SemanticColumnType = 'Text';
  const qualityIssues: string[] = [];

  if (nonNullCount === 0) {
    baseType = 'text';
    semanticType = 'Text';
    qualityIssues.push('Seluruh nilai kolom kosong (100% NULL)');
  } else if (
    boolValidCount === nonNullCount &&
    uniqueCount <= 2 &&
    nonNulls.some(v => typeof v === 'boolean' || ['true', 'false', 'yes', 'no', 'ya', 'tidak'].includes(String(v).trim().toLowerCase()))
  ) {
    baseType = 'categorical';
    semanticType = 'Boolean';
  } else if (dateValidCount >= ratioThreshold) {
    baseType = 'date';
    semanticType = 'DateTime';
    if (dateValidCount < nonNullCount) {
      qualityIssues.push(`${nonNullCount - dateValidCount} nilai tanggal tidak standar/tidak valid`);
    }
  } else if (numericValidCount >= ratioThreshold) {
    baseType = 'numeric';
    if (ID_NAME_HINT.test(colName) && uniquePct > 90) {
      semanticType = 'Identifier';
    } else if (currencySymbolCount > 0 || CURRENCY_NAME_HINT.test(colName)) {
      semanticType = 'Currency';
    } else {
      semanticType = 'Numerical';
    }
    if (numericValidCount < nonNullCount) {
      qualityIssues.push(`${nonNullCount - numericValidCount} sel teks terselip di kolom numerik`);
    }
  } else {
    const avgLen = nonNulls.reduce((s, v) => s + String(v).length, 0) / nonNullCount;
    if (ID_NAME_HINT.test(colName) && uniquePct >= 80) {
      baseType = 'categorical';
      semanticType = 'Identifier';
    } else if (GEO_NAME_HINT.test(colName) && uniqueCount <= 100) {
      baseType = 'categorical';
      semanticType = 'Geographic';
    } else if (avgLen > 24 && uniquePct >= 75) {
      baseType = 'text';
      semanticType = 'Text';
    } else if (uniqueCount <= 35 || uniqueCount / nonNullCount <= 0.45) {
      baseType = 'categorical';
      semanticType = 'Categorical';
    } else {
      baseType = 'text';
      semanticType = 'Text';
    }
  }

  if (nullPct >= 20) {
    qualityIssues.push(`Missing value tinggi (${nullPct}%)`);
  } else if (missingCount > 0) {
    qualityIssues.push(`${missingCount} sel kosong (${nullPct}%)`);
  }

  let numericStats: DetailedColumnProfile['numericStats'];
  let histogramBins: HistogramBin[] | undefined;

  if (baseType === 'numeric') {
    const nums = nonNulls
      .map(parseNumericValue)
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b);

    const basic = computeNumericStats(nums);
    if (basic && nums.length > 0) {
      const n = nums.length;
      const mean = nums.reduce((s, v) => s + v, 0) / n;
      const variance = nums.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
      const stdDev = Math.sqrt(variance);
      const q1 = percentileSorted(nums, 0.25);
      const median = percentileSorted(nums, 0.5);
      const q3 = percentileSorted(nums, 0.75);
      const p5 = percentileSorted(nums, 0.05);
      const p95 = percentileSorted(nums, 0.95);
      const iqr = q3 - q1;
      const cvPct = mean !== 0 ? round2((stdDev / Math.abs(mean)) * 100) : 0;

      // Sample skewness (Fisher-Pearson)
      let skewness = 0;
      if (stdDev > 0 && n >= 3) {
        const m3 = nums.reduce((s, v) => s + Math.pow((v - mean) / stdDev, 3), 0) / n;
        skewness = round2(m3);
      }

      const lowerIqr = q1 - 1.5 * iqr;
      const upperIqr = q3 + 1.5 * iqr;
      const outlierCountIQR =
        iqr > 0 ? nums.filter(v => v < lowerIqr || v > upperIqr).length : 0;
      const outlierCountZScore =
        stdDev > 0 ? nums.filter(v => Math.abs((v - mean) / stdDev) > 3).length : 0;

      if (outlierCountIQR > 0) {
        qualityIssues.push(`${outlierCountIQR} outlier terdeteksi (metode 1.5×IQR)`);
      }

      numericStats = {
        min: round2(nums[0]),
        max: round2(nums[n - 1]),
        range: round2(nums[n - 1] - nums[0]),
        sum: basic.sum,
        mean: round2(mean),
        median: round2(median),
        variance: round2(variance),
        stdDev: round2(stdDev),
        q1: round2(q1),
        q3: round2(q3),
        iqr: round2(iqr),
        p5: round2(p5),
        p95: round2(p95),
        cvPct,
        skewness,
        outlierCountIQR,
        outlierCountZScore,
      };

      // Histogram up to 8 bins
      const minV = nums[0];
      const maxV = nums[n - 1];
      if (maxV > minV) {
        const binCount = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(n))));
        const step = (maxV - minV) / binCount;
        histogramBins = Array.from({ length: binCount }, (_, idx) => {
          const bMin = minV + idx * step;
          const bMax = idx === binCount - 1 ? maxV : minV + (idx + 1) * step;
          const cnt = nums.filter(v =>
            idx === binCount - 1 ? v >= bMin && v <= bMax : v >= bMin && v < bMax
          ).length;
          return {
            label: `${round2(bMin).toLocaleString('id-ID')}–${round2(bMax).toLocaleString('id-ID')}`,
            min: round2(bMin),
            max: round2(bMax),
            count: cnt,
          };
        });
      }
    }
  }

  const topCategories: CategoryFrequency[] | undefined =
    baseType === 'categorical' || baseType === 'text'
      ? Array.from(freqMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([value, count]) => ({
            value,
            count,
            pct: nonNullCount > 0 ? round2((count / nonNullCount) * 100) : 0,
          }))
      : undefined;

  return {
    name: colName,
    semanticType,
    baseType,
    totalCount,
    nonNullCount,
    missingCount,
    nullPct,
    uniqueCount,
    uniquePct,
    duplicateValueCount,
    mode,
    modeCount,
    sampleValues: Array.from(freqMap.keys()).slice(0, 5),
    qualityIssues,
    numericStats,
    histogramBins,
    topCategories,
  };
}

export function profileDataset(data: Record<string, any>[]): DataProfileReport {
  if (!data || data.length === 0) {
    return {
      rowCount: 0,
      colCount: 0,
      totalCells: 0,
      missingCells: 0,
      missingPct: 0,
      duplicateRows: 0,
      duplicatePct: 0,
      quality: {
        completenessScore: 0,
        uniquenessScore: 0,
        consistencyScore: 0,
        validityScore: 0,
        overallScore: 0,
        grade: 'Needs Cleaning',
      },
      readiness: {
        hasEnoughRows: false,
        hasNumericData: false,
        hasDateColumn: false,
        hasCategoricalColumn: false,
        isForecastable: false,
        isStatisticalTestable: false,
        isMiningSuitable: false,
        reasons: ['Dataset kosong (0 baris). Unggah atau muat dataset terlebih dahulu.'],
      },
      warnings: ['Dataset tidak memiliki baris observasi.'],
      columns: [],
    };
  }

  // Union keys in case rows are slightly sparse
  const keySet = new Set<string>();
  data.slice(0, 200).forEach(row => {
    if (row && typeof row === 'object') {
      Object.keys(row).forEach(k => keySet.add(k));
    }
  });
  const colNames = Array.from(keySet);

  // Duplicate rows
  const seenRows = new Set<string>();
  let duplicateRows = 0;
  for (const row of data) {
    const hash = JSON.stringify(row);
    if (seenRows.has(hash)) duplicateRows++;
    else seenRows.add(hash);
  }

  const columns = colNames.map(col => profileColumn(col, data.map(r => r?.[col])));
  const totalCells = data.length * colNames.length;
  const missingCells = columns.reduce((s, c) => s + c.missingCount, 0);
  const missingPct = totalCells > 0 ? round2((missingCells / totalCells) * 100) : 0;
  const duplicatePct = data.length > 0 ? round2((duplicateRows / data.length) * 100) : 0;

  const completenessScore = round2(Math.max(0, 100 - missingPct));
  const uniquenessScore = round2(Math.max(0, 100 - duplicatePct));
  const issueCols = columns.filter(c => c.qualityIssues.some(i => i.includes('terselip') || i.includes('tidak standar'))).length;
  const consistencyScore = colNames.length > 0 ? round2(((colNames.length - issueCols) / colNames.length) * 100) : 100;

  const outlierCells = columns.reduce((s, c) => s + (c.numericStats?.outlierCountIQR || 0), 0);
  const numericCellTotal = columns
    .filter(c => c.baseType === 'numeric')
    .reduce((s, c) => s + c.nonNullCount, 0);
  const outlierRatePct = numericCellTotal > 0 ? (outlierCells / numericCellTotal) * 100 : 0;
  const validityScore = round2(Math.max(0, 100 - Math.min(40, outlierRatePct * 1.5)));

  const overallScore = round2(
    completenessScore * 0.35 +
      uniquenessScore * 0.25 +
      consistencyScore * 0.25 +
      validityScore * 0.15
  );

  const grade: DataQualityBreakdown['grade'] =
    overallScore >= 92
      ? 'Excellent'
      : overallScore >= 78
      ? 'Good'
      : overallScore >= 60
      ? 'Fair'
      : 'Needs Cleaning';

  const numericCols = columns.filter(c => c.baseType === 'numeric' && c.semanticType !== 'Identifier');
  const dateCols = columns.filter(c => c.baseType === 'date');
  const catCols = columns.filter(c => c.baseType === 'categorical' && c.semanticType !== 'Identifier');

  const reasons: string[] = [];
  const hasEnoughRows = data.length >= 5;
  const hasNumericData = numericCols.length >= 1;
  const hasDateColumn = dateCols.length >= 1;
  const hasCategoricalColumn = catCols.length >= 1;
  const isForecastable = data.length >= 6 && hasDateColumn && hasNumericData;
  const isStatisticalTestable = data.length >= 6 && hasNumericData && (numericCols.length >= 2 || hasCategoricalColumn);
  const isMiningSuitable = data.length >= 8 && numericCols.length >= 2;

  if (!hasEnoughRows) reasons.push(`Jumlah baris (${data.length}) terlalu sedikit untuk analisis statistik mendalam (< 5).`);
  if (!hasNumericData) reasons.push('Tidak ditemukan kolom numerik terukur selain Identifier.');
  if (!hasDateColumn) reasons.push('Tidak ditemukan kolom tanggal valid (Time-Series Forecasting dinonaktifkan untuk mencegah proyeksi palsu).');
  if (numericCols.length < 2) reasons.push('Dibutuhkan minimal 2 kolom numerik untuk analisis korelasi multivariat & clustering.');

  const warnings: string[] = [];
  if (missingCells > 0) warnings.push(`${missingCells} sel kosong (${missingPct}% dari total sel) terdeteksi.`);
  if (duplicateRows > 0) warnings.push(`${duplicateRows} baris duplikat (${duplicatePct}%) ditemukan.`);
  columns.forEach(c => {
    c.qualityIssues.forEach(iss => {
      if (warnings.length < 8) warnings.push(`[${c.name}] ${iss}`);
    });
  });

  return {
    rowCount: data.length,
    colCount: colNames.length,
    totalCells,
    missingCells,
    missingPct,
    duplicateRows,
    duplicatePct,
    quality: {
      completenessScore,
      uniquenessScore,
      consistencyScore,
      validityScore,
      overallScore,
      grade,
    },
    readiness: {
      hasEnoughRows,
      hasNumericData,
      hasDateColumn,
      hasCategoricalColumn,
      isForecastable,
      isStatisticalTestable,
      isMiningSuitable,
      reasons,
    },
    warnings,
    columns,
  };
}
