import { analyzeDataset, computeNumericStats, DatasetStats, detectOutliers } from './analytics';
import { ResolvedTheme } from './theme';

export type BiDomainType = 'sales' | 'saas' | 'survey' | 'generic';
export type TimeGranularity = 'year' | 'quarter' | 'month' | 'week' | 'day';

export interface BiSchema {
  domain: BiDomainType;
  rowCount: number;
  dateCol: string | null;
  primaryMetric: string | null;
  secondaryMetric: string | null;
  tertiaryMetric: string | null;
  numericCols: string[];
  categoricalCols: string[];
  categoryHierarchy: string[];
  geoCol: string | null;
  geoHierarchy: string[];
  filterableCols: {
    key: string;
    label: string;
    role: 'category' | 'region' | 'product' | 'department' | 'status' | 'channel' | 'custom';
    values: string[];
  }[];
  dateBounds: { min: string; max: string } | null;
}

export interface BiFilterState {
  dateFrom: string;
  dateTo: string;
  facets: Record<string, string[]>;
  searchQuery: string;
  customColumn: string;
  customOperator: 'contains' | 'equals' | 'gt' | 'lt';
  customValue: string;
}

export interface BiCrossFilter {
  column: string;
  value: string;
  sourcePanel: string;
}

export interface BiCategoryDrill {
  level: number;
  filters: { column: string; value: string }[];
}

export interface BiTimeDrill {
  granularity: TimeGranularity;
  yearFilter?: string;
  quarterFilter?: string;
  monthFilter?: string;
}

export interface BiKpiCardData {
  id: string;
  label: string;
  formattedValue: string;
  rawValue: number;
  deltaPct: number | null;
  deltaLabel: string;
  trend: 'up' | 'down' | 'neutral';
  sparkline: { label: string; value: number }[];
  subtitle: string;
  formatType: 'currency' | 'number' | 'percent';
}

export interface ClusteredBarDatum {
  name: string;
  primary: number;
  secondary: number;
  count: number;
  sharePct: number;
}

export interface StackedAreaResult {
  seriesKeys: string[];
  data: Record<string, any>[];
  granularity: TimeGranularity;
  hasDateAxis: boolean;
}

export interface DonutSliceDatum {
  name: string;
  value: number;
  count: number;
  percentage: number;
}

export interface ComparativePeriodDatum {
  period: string;
  current: number;
  previous: number;
  delta: number;
  deltaPct: number;
  isPositive: boolean;
}

export interface DetailedGroupedDatum {
  name: string;
  groupA: number;
  groupB: number;
  groupALabel: string;
  groupBLabel: string;
  count: number;
}

export interface GeoRegionDatum {
  region: string;
  value: number;
  secondaryValue: number;
  count: number;
  sharePct: number;
  lat: number;
  lng: number;
  xPct: number;
  yPct: number;
}

export interface GeoAnalyticsResult {
  hasGeoData: boolean;
  geoCol: string | null;
  regions: GeoRegionDatum[];
  alternativeBreakdown: {
    title: string;
    subtitle: string;
    items: { label: string; metricValue: number; secondaryValue: number; sharePct: number; count: number }[];
  };
}

export interface BiAiInsightsPayload {
  generatedAt: string;
  datasetName: string;
  filteredRowCount: number;
  totalRowCount: number;
  keyInsights: string[];
  performanceSummary: string;
  trendAnalysis: string;
  anomalyDetection: string[];
  significantChanges: string[];
  recommendedActions: string[];
}

export function parseBiNumber(raw: any): number {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : 0;
  }
  if (raw === null || raw === undefined || raw === '') return 0;
  const str = String(raw).replace(/[$€£Rp,\s%]/gi, '').trim();
  if (!str) return 0;
  const n = Number(str);
  return Number.isFinite(n) ? n : 0;
}

export function parseBiDate(raw: any): Date | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d+$/.test(s) && s.length < 6) return null;
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]) - 1;
    const d = isoMatch[3] ? Number(isoMatch[3]) : 1;
    const dt = new Date(Date.UTC(y, m, d));
    return isNaN(dt.getTime()) ? null : dt;
  }
  const parsed = Date.parse(s);
  if (isNaN(parsed)) return null;
  return new Date(parsed);
}

export function formatIsoDate(dt: Date): string {
  return dt.toISOString().slice(0, 10);
}

export function isCurrencyMetric(colName: string | null): boolean {
  if (!colName) return false;
  return /revenue|omset|sales|penjualan|profit|laba|cost|biaya|mrr|arr|ltv|cac|price|harga|amount|budget|income/i.test(
    colName
  );
}

export function formatBiMetric(val: number, colName?: string | null, compact = true): string {
  if (!Number.isFinite(val)) return '0';
  const currency = isCurrencyMetric(colName || null);
  const prefix = currency ? 'Rp ' : '';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';

  if (compact) {
    if (abs >= 1_000_000_000) {
      return `${sign}${prefix}${(abs / 1_000_000_000).toLocaleString('id-ID', {
        maximumFractionDigits: 2,
      })}M`;
    }
    if (abs >= 1_000_000) {
      return `${sign}${prefix}${(abs / 1_000_000).toLocaleString('id-ID', {
        maximumFractionDigits: 1,
      })}Jt`;
    }
    if (abs >= 10_000) {
      return `${sign}${prefix}${(abs / 1_000).toLocaleString('id-ID', {
        maximumFractionDigits: 1,
      })}Rb`;
    }
  }
  return `${sign}${prefix}${abs.toLocaleString('id-ID', { maximumFractionDigits: 2 })}`;
}

export function getBiChartColors(theme: ResolvedTheme): string[] {
  if (theme === 'dark') {
    return [
      '#D1A575', // Caramel Gold
      '#4BA39E', // Muted Teal
      '#649EC2', // Enterprise Blue
      '#80B493', // Sage Green
      '#E0B16C', // Warm Amber
      '#B38B68', // Primary Brown
      '#DC8278', // Terracotta
    ];
  }
  return [
    '#795548', // Primary Brown
    '#2E7D7B', // Deep Teal
    '#3B6E8C', // Enterprise Steel Blue
    '#4F8065', // Muted Green
    '#C49A6C', // Caramel
    '#C58B42', // Ochre Orange
    '#B85C50', // Terracotta Red
  ];
}

function classifyFacetRole(
  colName: string
): 'category' | 'region' | 'product' | 'department' | 'status' | 'channel' | 'custom' {
  const low = colName.toLowerCase();
  if (/region|province|provinsi|city|kota|country|negara|wilayah|area|lokasi|cabang/.test(low)) return 'region';
  if (/product|produk|item|sku|barang|paket/.test(low)) return 'product';
  if (/category|kategori|segment|segmen|jenis|type|tipe/.test(low)) return 'category';
  if (/department|departemen|divisi|division|unit|team/.test(low)) return 'department';
  if (/status|stage|state|tier|kondisi|hasil/.test(low)) return 'status';
  if (/channel|kanal|source|sumber|platform/.test(low)) return 'channel';
  return 'custom';
}

export function detectBiSchema(rows: Record<string, any>[], precomputedStats?: DatasetStats): BiSchema {
  if (!rows || rows.length === 0) {
    return {
      domain: 'generic',
      rowCount: 0,
      dateCol: null,
      primaryMetric: null,
      secondaryMetric: null,
      tertiaryMetric: null,
      numericCols: [],
      categoricalCols: [],
      categoryHierarchy: [],
      geoCol: null,
      geoHierarchy: [],
      filterableCols: [],
      dateBounds: null,
    };
  }

  const stats = precomputedStats || analyzeDataset(rows);
  const allCols = Object.keys(rows[0] || {});

  // Detect domain
  const joinedCols = allCols.join(' ').toLowerCase();
  let domain: BiDomainType = 'generic';
  if (/mrr|churn|arr|ltv|cac|active_users|nps/.test(joinedCols)) {
    domain = 'saas';
  } else if (/revenue|profit|sales|order_id|unit_price|penjualan|omset|total_revenue/.test(joinedCols)) {
    domain = 'sales';
  } else if (/responden|kepuasan|angket|survey|rating|skor|lomba/.test(joinedCols)) {
    domain = 'survey';
  }

  // Date column
  const dateCol =
    stats.dateCols[0] ||
    allCols.find(c => /date|tanggal|month|bulan|waktu|timestamp|created_at/i.test(c) && parseBiDate(rows[0][c])) ||
    null;

  // Date bounds
  let dateBounds: { min: string; max: string } | null = null;
  if (dateCol) {
    const parsedDates = rows
      .map(r => parseBiDate(r[dateCol]))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());
    if (parsedDates.length > 0) {
      dateBounds = {
        min: formatIsoDate(parsedDates[0]),
        max: formatIsoDate(parsedDates[parsedDates.length - 1]),
      };
    }
  }

  // Order numeric columns by importance
  const numericCols = [...stats.numericCols];
  const metricPriority = (col: string) => {
    const low = col.toLowerCase();
    if (/total_revenue|revenue|omset|sales|penjualan|mrr/.test(low)) return 100;
    if (/profit|laba|margin|new_arr|expansion_mrr/.test(low)) return 90;
    if (/amount|total|nilai|value|score|skor|active_users|transactions/.test(low)) return 80;
    if (/units|qty|quantity|count|jumlah|ltv/.test(low)) return 70;
    if (/unit_price|price|harga|cac|nps/.test(low)) return 60;
    if (/discount|churn|pct|rate/.test(low)) return 30;
    return 50;
  };
  numericCols.sort((a, b) => metricPriority(b) - metricPriority(a));

  const primaryMetric = numericCols[0] || null;
  const secondaryMetric =
    numericCols.find(c => c !== primaryMetric && !/discount|pct/i.test(c)) || numericCols[1] || null;
  const tertiaryMetric = numericCols.find(c => c !== primaryMetric && c !== secondaryMetric) || null;

  // Geo column
  const geoPriority = allCols.filter(c =>
    /region|province|provinsi|wilayah|city|kota|country|negara|lokasi|area/i.test(c)
  );
  const geoCol =
    geoPriority.find(c => stats.categoricalCols.includes(c) || stats.textCols.includes(c)) ||
    geoPriority[0] ||
    null;

  const geoHierarchy = [
    ...allCols.filter(c => /country|negara/i.test(c)),
    ...allCols.filter(c => /region|province|provinsi|wilayah/i.test(c)),
    ...allCols.filter(c => /city|kota|area/i.test(c)),
  ].filter((v, i, a) => a.indexOf(v) === i);

  // Categorical columns excluding pure ID columns
  const nonIdTextAndCat = [...stats.categoricalCols, ...stats.textCols].filter(
    c =>
      c !== dateCol &&
      !/^order_id$|^id$|^_id$|uuid/i.test(c) &&
      new Set(rows.map(r => String(r[c] ?? '').trim()).filter(Boolean)).size <= Math.max(30, rows.length * 0.85)
  );
  const uniqueCatCols = Array.from(new Set(nonIdTextAndCat));

  // Category hierarchy (Category -> Subcategory/Channel -> Product)
  const catPreferred = [
    uniqueCatCols.find(c => /category|kategori/i.test(c)),
    uniqueCatCols.find(c => /channel|department|divisi|customer_segment|segment/i.test(c)),
    uniqueCatCols.find(c => /product|produk|item|sku/i.test(c)),
    ...uniqueCatCols,
  ].filter((c): c is string => Boolean(c));
  const categoryHierarchy = Array.from(new Set(catPreferred)).slice(0, 4);

  // Filterable columns (skip IDs and purely numeric)
  const orderedFilterCols = [
    ...uniqueCatCols.filter(c => /category|kategori/i.test(c)),
    ...uniqueCatCols.filter(c => /region|province|provinsi|kota|city|country|wilayah/i.test(c)),
    ...uniqueCatCols.filter(c => /product|produk|item/i.test(c)),
    ...uniqueCatCols.filter(c => /department|divisi|channel|segment/i.test(c)),
    ...uniqueCatCols.filter(c => /status|tier|kondisi/i.test(c)),
    ...uniqueCatCols,
  ];
  const dedupFilterCols = Array.from(new Set(orderedFilterCols)).slice(0, 6);

  const filterableCols = dedupFilterCols.map(col => {
    const vals = Array.from(
      new Set(
        rows
          .map(r => r[col])
          .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
          .map(v => String(v).trim())
      )
    ).sort((a, b) => a.localeCompare(b));

    return {
      key: col,
      label: col.replace(/_/g, ' '),
      role: classifyFacetRole(col),
      values: vals,
    };
  });

  return {
    domain,
    rowCount: rows.length,
    dateCol,
    primaryMetric,
    secondaryMetric,
    tertiaryMetric,
    numericCols,
    categoricalCols: uniqueCatCols,
    categoryHierarchy,
    geoCol,
    geoHierarchy: geoHierarchy.length > 0 ? geoHierarchy : categoryHierarchy,
    filterableCols,
    dateBounds,
  };
}

export function createEmptyFilterState(schema: BiSchema): BiFilterState {
  return {
    dateFrom: schema.dateBounds?.min || '',
    dateTo: schema.dateBounds?.max || '',
    facets: {},
    searchQuery: '',
    customColumn: schema.numericCols[0] || schema.categoricalCols[0] || '',
    customOperator: 'contains',
    customValue: '',
  };
}

export function getTimeBucketKey(dt: Date, granularity: TimeGranularity): { key: string; label: string; sortKey: string } {
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + 1;
  const d = dt.getUTCDate();
  const pad = (n: number) => String(n).padStart(2, '0');

  if (granularity === 'year') {
    return { key: `${y}`, label: `${y}`, sortKey: `${y}` };
  }
  if (granularity === 'quarter') {
    const q = Math.floor((m - 1) / 3) + 1;
    return { key: `${y}-Q${q}`, label: `Q${q} ${y}`, sortKey: `${y}-${q}` };
  }
  if (granularity === 'month') {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return {
      key: `${y}-${pad(m)}`,
      label: `${monthNames[m - 1]} ${String(y).slice(2)}`,
      sortKey: `${y}-${pad(m)}`,
    };
  }
  if (granularity === 'week') {
    const startOfYear = new Date(Date.UTC(y, 0, 1));
    const diffDays = Math.floor((dt.getTime() - startOfYear.getTime()) / 86400000);
    const week = Math.floor(diffDays / 7) + 1;
    return { key: `${y}-W${pad(week)}`, label: `W${pad(week)} ${String(y).slice(2)}`, sortKey: `${y}-${pad(week)}` };
  }
  return { key: `${y}-${pad(m)}-${pad(d)}`, label: `${pad(d)}/${pad(m)}/${String(y).slice(2)}`, sortKey: `${y}-${pad(m)}-${pad(d)}` };
}

export function applyBiFilters(
  rows: Record<string, any>[],
  schema: BiSchema,
  filters: BiFilterState,
  options?: {
    crossFilter?: BiCrossFilter | null;
    categoryDrill?: BiCategoryDrill | null;
    timeDrill?: BiTimeDrill | null;
    ignoreCrossFilterFromPanel?: string;
  }
): Record<string, any>[] {
  if (!rows || rows.length === 0) return [];

  const fromMs = filters.dateFrom ? Date.parse(filters.dateFrom) : NaN;
  const toMs = filters.dateTo ? Date.parse(filters.dateTo) : NaN;
  const searchLower = filters.searchQuery.trim().toLowerCase();
  const activeCross =
    options?.crossFilter && options.crossFilter.sourcePanel !== options.ignoreCrossFilterFromPanel
      ? options.crossFilter
      : null;

  return rows.filter(row => {
    // 1. Date range filter
    if (schema.dateCol && (!isNaN(fromMs) || !isNaN(toMs))) {
      const dt = parseBiDate(row[schema.dateCol]);
      if (dt) {
        const ms = dt.getTime();
        if (!isNaN(fromMs) && ms < fromMs) return false;
        if (!isNaN(toMs) && ms > toMs + 86399999) return false;
      }
    }

    // 2. Facet multi-select filters
    for (const [col, selected] of Object.entries(filters.facets)) {
      if (selected && selected.length > 0) {
        const val = String(row[col] ?? '').trim();
        if (!selected.includes(val)) return false;
      }
    }

    // 3. Custom column filter
    if (filters.customColumn && filters.customValue.trim() !== '') {
      const cell = row[filters.customColumn];
      const targetStr = filters.customValue.trim().toLowerCase();
      if (filters.customOperator === 'contains') {
        if (!String(cell ?? '').toLowerCase().includes(targetStr)) return false;
      } else if (filters.customOperator === 'equals') {
        if (String(cell ?? '').trim().toLowerCase() !== targetStr) return false;
      } else if (filters.customOperator === 'gt') {
        if (parseBiNumber(cell) <= parseBiNumber(filters.customValue)) return false;
      } else if (filters.customOperator === 'lt') {
        if (parseBiNumber(cell) >= parseBiNumber(filters.customValue)) return false;
      }
    }

    // 4. Global search query across row cells
    if (searchLower) {
      const matches = Object.values(row).some(v => String(v ?? '').toLowerCase().includes(searchLower));
      if (!matches) return false;
    }

    // 5. Cross-filter
    if (activeCross) {
      if (activeCross.column === '__TIME_BUCKET__' && schema.dateCol) {
        const dt = parseBiDate(row[schema.dateCol]);
        if (!dt) return false;
        const gran = options?.timeDrill?.granularity || 'month';
        if (getTimeBucketKey(dt, gran).label !== activeCross.value) return false;
      } else {
        const cellVal = String(row[activeCross.column] ?? '').trim();
        if (cellVal !== activeCross.value) return false;
      }
    }

    // 6. Category Drill-down path filters
    if (options?.categoryDrill && options.categoryDrill.filters.length > 0) {
      for (const df of options.categoryDrill.filters) {
        if (String(row[df.column] ?? '').trim() !== df.value) return false;
      }
    }

    // 7. Time Drill-down path filters
    if (options?.timeDrill && schema.dateCol) {
      const td = options.timeDrill;
      if (td.yearFilter || td.quarterFilter || td.monthFilter) {
        const dt = parseBiDate(row[schema.dateCol]);
        if (!dt) return false;
        if (td.yearFilter && getTimeBucketKey(dt, 'year').key !== td.yearFilter) return false;
        if (td.quarterFilter && getTimeBucketKey(dt, 'quarter').key !== td.quarterFilter) return false;
        if (td.monthFilter && getTimeBucketKey(dt, 'month').key !== td.monthFilter) return false;
      }
    }

    return true;
  });
}

export function buildBiKpis(
  filteredRows: Record<string, any>[],
  allRows: Record<string, any>[],
  schema: BiSchema
): BiKpiCardData[] {
  const pMetric = schema.primaryMetric;
  const sMetric = schema.secondaryMetric;

  // Sort chronologically if dateCol present for accurate sparkline & half-split trend
  const ordered = [...filteredRows];
  if (schema.dateCol) {
    ordered.sort((a, b) => {
      const da = parseBiDate(a[schema.dateCol!])?.getTime() || 0;
      const db = parseBiDate(b[schema.dateCol!])?.getTime() || 0;
      return da - db;
    });
  }

  const primaryVals = pMetric ? ordered.map(r => parseBiNumber(r[pMetric])) : [];
  const secondaryVals = sMetric ? ordered.map(r => parseBiNumber(r[sMetric])) : [];

  const sumPrimary = primaryVals.reduce((a, b) => a + b, 0);
  const avgPrimary = primaryVals.length > 0 ? sumPrimary / primaryVals.length : 0;
  const sumSecondary = secondaryVals.reduce((a, b) => a + b, 0);

  // Split first-half vs second-half for period growth rate
  const mid = Math.max(1, Math.floor(primaryVals.length / 2));
  const firstHalf = primaryVals.slice(0, mid);
  const secondHalf = primaryVals.slice(mid);
  const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
  const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : firstAvg;
  const growthPct = firstAvg !== 0 && secondHalf.length > 0 ? ((secondAvg - firstAvg) / Math.abs(firstAvg)) * 100 : 0;

  // First vs last period point delta
  const firstVal = primaryVals[0] ?? 0;
  const lastVal = primaryVals[primaryVals.length - 1] ?? 0;
  const cumulativeDeltaPct =
    primaryVals.length >= 2 && firstVal !== 0 ? ((lastVal - firstVal) / Math.abs(firstVal)) * 100 : 0;

  const sparkStep = Math.max(1, Math.floor(ordered.length / 10));
  const buildSpark = (vals: number[]) =>
    vals
      .filter((_, idx) => idx % sparkStep === 0 || idx === vals.length - 1)
      .slice(-12)
      .map((v, i) => ({ label: `P${i + 1}`, value: v }));

  // Domain-adaptive labels
  const primaryLabel =
    schema.domain === 'sales'
      ? `Total ${pMetric?.replace(/_/g, ' ') || 'Revenue'}`
      : schema.domain === 'saas'
      ? `Total ${pMetric?.replace(/_/g, ' ') || 'MRR'}`
      : `Total ${pMetric?.replace(/_/g, ' ') || 'Nilai'}`;

  const txLabel =
    schema.domain === 'sales'
      ? 'Transactions'
      : schema.domain === 'saas'
      ? 'Periods'
      : 'Responses';

  const avgLabel =
    schema.domain === 'sales'
      ? 'Avg. Value'
      : `Avg. ${pMetric?.replace(/_/g, ' ') || 'Value'}`;

  // Performance index (ratio of secondary/primary if margin/profit, or normalized completeness/efficiency score)
  let perfLabel = 'Perf. Index';
  let perfValue = 100;
  let perfDisplay = '100%';
  let perfSubtitle = 'Data completeness';
  if (schema.domain === 'sales' && sMetric && /profit|laba/i.test(sMetric) && sumPrimary > 0) {
    perfLabel = 'Profit Margin';
    perfValue = (sumSecondary / sumPrimary) * 100;
    perfDisplay = `${perfValue.toFixed(1)}%`;
    perfSubtitle = `Total ${sMetric.replace(/_/g, ' ')}: ${formatBiMetric(sumSecondary, sMetric)}`;
  } else if (schema.domain === 'saas' && sMetric) {
    perfLabel = `Total ${sMetric.replace(/_/g, ' ')}`;
    perfValue = sumSecondary;
    perfDisplay = formatBiMetric(sumSecondary, sMetric);
    perfSubtitle = 'Secondary SaaS KPI';
  } else if (pMetric && primaryVals.length > 0) {
    const stats = computeNumericStats(primaryVals);
    const cv = stats && stats.mean > 0 ? (stats.stdDev / stats.mean) * 100 : 0;
    perfValue = Math.max(0, Math.min(100, 100 - Math.round(cv * 0.4)));
    perfDisplay = `${perfValue.toFixed(0)} / 100`;
    perfSubtitle = 'Stability index (1 - CV)';
  }

  const filterCoveragePct = allRows.length > 0 ? (filteredRows.length / allRows.length) * 100 : 0;

  return [
    {
      id: 'kpi-primary-total',
      label: primaryLabel,
      formattedValue: pMetric ? formatBiMetric(sumPrimary, pMetric) : String(filteredRows.length),
      rawValue: sumPrimary,
      deltaPct: primaryVals.length >= 2 ? Number(growthPct.toFixed(1)) : null,
      deltaLabel: 'vs paruh awal',
      trend: growthPct > 0.5 ? 'up' : growthPct < -0.5 ? 'down' : 'neutral',
      sparkline: buildSpark(primaryVals),
      subtitle: pMetric ? `Kolom ${pMetric}` : 'Belum ada metrik numerik',
      formatType: isCurrencyMetric(pMetric) ? 'currency' : 'number',
    },
    {
      id: 'kpi-transactions',
      label: txLabel,
      formattedValue: filteredRows.length.toLocaleString('id-ID'),
      rawValue: filteredRows.length,
      deltaPct: Number(filterCoveragePct.toFixed(0)),
      deltaLabel: `dari ${allRows.length} total`,
      trend: filteredRows.length > 0 ? 'up' : 'neutral',
      sparkline: buildSpark(
        ordered.map((_, idx) => idx + 1)
      ),
      subtitle: `${filterCoveragePct.toFixed(1)}% cakupan dataset`,
      formatType: 'number',
    },
    {
      id: 'kpi-average',
      label: avgLabel,
      formattedValue: pMetric ? formatBiMetric(avgPrimary, pMetric) : '-',
      rawValue: avgPrimary,
      deltaPct: primaryVals.length >= 2 ? Number(growthPct.toFixed(1)) : null,
      deltaLabel: 'tren rata-rata',
      trend: growthPct > 0.5 ? 'up' : growthPct < -0.5 ? 'down' : 'neutral',
      sparkline: buildSpark(primaryVals),
      subtitle: primaryVals.length > 0 ? `Min ${formatBiMetric(Math.min(...primaryVals), pMetric)}` : '-',
      formatType: isCurrencyMetric(pMetric) ? 'currency' : 'number',
    },
    {
      id: 'kpi-growth',
      label: 'Growth Rate',
      formattedValue: `${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%`,
      rawValue: growthPct,
      deltaPct: Number(cumulativeDeltaPct.toFixed(1)),
      deltaLabel: 'awal → akhir',
      trend: growthPct > 0.5 ? 'up' : growthPct < -0.5 ? 'down' : 'neutral',
      sparkline: buildSpark(primaryVals),
      subtitle: 'Perbandingan setengah periode',
      formatType: 'percent',
    },
    {
      id: 'kpi-records',
      label: 'Dimensions',
      formattedValue: `${schema.categoricalCols.length} / ${schema.numericCols.length}`,
      rawValue: schema.categoricalCols.length + schema.numericCols.length,
      deltaPct: null,
      deltaLabel: 'Dimensi / Metrik',
      trend: 'neutral',
      sparkline: buildSpark(secondaryVals.length > 0 ? secondaryVals : primaryVals),
      subtitle: `${filteredRows.length} records terfilter`,
      formatType: 'number',
    },
    {
      id: 'kpi-performance',
      label: perfLabel,
      formattedValue: perfDisplay,
      rawValue: perfValue,
      deltaPct: sMetric && sumPrimary > 0 && /profit|laba/i.test(sMetric) ? Number(((sumSecondary / sumPrimary) * 100).toFixed(1)) : null,
      deltaLabel: perfSubtitle,
      trend: perfValue >= 20 ? 'up' : 'neutral',
      sparkline: buildSpark(secondaryVals.length > 0 ? secondaryVals : primaryVals),
      subtitle: perfSubtitle,
      formatType: 'percent',
    },
  ];
}

export function buildCategoryClusteredData(
  rows: Record<string, any>[],
  schema: BiSchema,
  drillColumn: string,
  sortOrder: 'desc' | 'asc' | 'alpha' = 'desc'
): ClusteredBarDatum[] {
  if (!rows || rows.length === 0 || !drillColumn) return [];
  const pMetric = schema.primaryMetric;
  const sMetric = schema.secondaryMetric;

  const map = new Map<string, { primary: number; secondary: number; count: number }>();
  let totalPrimary = 0;

  for (const row of rows) {
    const key = String(row[drillColumn] ?? 'Lainnya').trim() || 'Lainnya';
    const pVal = pMetric ? parseBiNumber(row[pMetric]) : 1;
    const sVal = sMetric ? parseBiNumber(row[sMetric]) : 0;
    totalPrimary += pVal;
    const prev = map.get(key) || { primary: 0, secondary: 0, count: 0 };
    prev.primary += pVal;
    prev.secondary += sVal;
    prev.count += 1;
    map.set(key, prev);
  }

  const list: ClusteredBarDatum[] = Array.from(map.entries()).map(([name, agg]) => ({
    name,
    primary: Math.round(agg.primary * 100) / 100,
    secondary: Math.round(agg.secondary * 100) / 100,
    count: agg.count,
    sharePct: totalPrimary > 0 ? Math.round((agg.primary / totalPrimary) * 1000) / 10 : 0,
  }));

  if (sortOrder === 'desc') list.sort((a, b) => b.primary - a.primary);
  else if (sortOrder === 'asc') list.sort((a, b) => a.primary - b.primary);
  else list.sort((a, b) => a.name.localeCompare(b.name));

  return list.slice(0, 12);
}

export function buildStackedAreaTrendData(
  rows: Record<string, any>[],
  schema: BiSchema,
  granularity: TimeGranularity,
  seriesDimension?: string | null
): StackedAreaResult {
  if (!rows || rows.length === 0 || !schema.primaryMetric) {
    return { seriesKeys: [], data: [], granularity, hasDateAxis: false };
  }

  const pMetric = schema.primaryMetric;
  const dimCol = seriesDimension || schema.categoryHierarchy[0] || null;

  // If no date column, build ordered breakdown using primary dimension
  if (!schema.dateCol) {
    const sMetric = schema.secondaryMetric;
    const seriesKeys = sMetric ? [pMetric, sMetric] : [pMetric];
    const slice = rows.slice(0, 18).map((row, idx) => ({
      bucketKey: String(idx),
      label: dimCol ? String(row[dimCol] ?? `Item ${idx + 1}`).slice(0, 14) : `Row ${idx + 1}`,
      [pMetric]: parseBiNumber(row[pMetric]),
      ...(sMetric ? { [sMetric]: parseBiNumber(row[sMetric]) } : {}),
    }));
    return { seriesKeys, data: slice, granularity, hasDateAxis: false };
  }

  // Determine top 4 categories for stacked area (if dimCol exists)
  let topCats: string[] = [];
  if (dimCol) {
    const totals = new Map<string, number>();
    for (const row of rows) {
      const cat = String(row[dimCol] ?? 'Lainnya').trim() || 'Lainnya';
      totals.set(cat, (totals.get(cat) || 0) + parseBiNumber(row[pMetric]));
    }
    topCats = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([k]) => k);
  }

  const hasMultipleSeries = topCats.length > 1;
  const seriesKeys = hasMultipleSeries
    ? topCats
    : schema.secondaryMetric
    ? [pMetric, schema.secondaryMetric]
    : [pMetric];

  const bucketMap = new Map<string, { label: string; sortKey: string; values: Record<string, number> }>();

  for (const row of rows) {
    const dt = parseBiDate(row[schema.dateCol]);
    if (!dt) continue;
    const { key, label, sortKey } = getTimeBucketKey(dt, granularity);
    if (!bucketMap.has(key)) {
      const initVals: Record<string, number> = {};
      for (const sk of seriesKeys) initVals[sk] = 0;
      bucketMap.set(key, { label, sortKey, values: initVals });
    }
    const bucket = bucketMap.get(key)!;
    if (hasMultipleSeries && dimCol) {
      const cat = String(row[dimCol] ?? 'Lainnya').trim() || 'Lainnya';
      const targetSeries = topCats.includes(cat) ? cat : topCats[topCats.length - 1];
      bucket.values[targetSeries] = (bucket.values[targetSeries] || 0) + parseBiNumber(row[pMetric]);
    } else {
      bucket.values[pMetric] = (bucket.values[pMetric] || 0) + parseBiNumber(row[pMetric]);
      if (schema.secondaryMetric) {
        bucket.values[schema.secondaryMetric] =
          (bucket.values[schema.secondaryMetric] || 0) + parseBiNumber(row[schema.secondaryMetric]);
      }
    }
  }

  const data = Array.from(bucketMap.entries())
    .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
    .map(([bucketKey, item]) => ({
      bucketKey,
      label: item.label,
      ...item.values,
    }));

  return { seriesKeys, data, granularity, hasDateAxis: true };
}

export function buildDonutDistributionData(
  rows: Record<string, any>[],
  schema: BiSchema,
  categoryCol: string
): DonutSliceDatum[] {
  if (!rows || rows.length === 0 || !categoryCol) return [];
  const pMetric = schema.primaryMetric;
  const map = new Map<string, { value: number; count: number }>();
  let total = 0;

  for (const row of rows) {
    const key = String(row[categoryCol] ?? 'Lainnya').trim() || 'Lainnya';
    const val = pMetric ? parseBiNumber(row[pMetric]) : 1;
    total += val;
    const prev = map.get(key) || { value: 0, count: 0 };
    prev.value += val;
    prev.count += 1;
    map.set(key, prev);
  }

  return Array.from(map.entries())
    .map(([name, item]) => ({
      name,
      value: Math.round(item.value * 100) / 100,
      count: item.count,
      percentage: total > 0 ? Math.round((item.value / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);
}

export function buildComparativePeriodData(
  rows: Record<string, any>[],
  schema: BiSchema,
  granularity: TimeGranularity
): ComparativePeriodDatum[] {
  if (!rows || rows.length === 0 || !schema.primaryMetric) return [];
  const pMetric = schema.primaryMetric;

  if (schema.dateCol) {
    const bucketMap = new Map<string, { label: string; sortKey: string; total: number }>();
    for (const row of rows) {
      const dt = parseBiDate(row[schema.dateCol]);
      if (!dt) continue;
      const { key, label, sortKey } = getTimeBucketKey(dt, granularity);
      const prev = bucketMap.get(key) || { label, sortKey, total: 0 };
      prev.total += parseBiNumber(row[pMetric]);
      bucketMap.set(key, prev);
    }

    const sorted = Array.from(bucketMap.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    if (sorted.length < 2) {
      return sorted.map(item => ({
        period: item.label,
        current: item.total,
        previous: item.total,
        delta: 0,
        deltaPct: 0,
        isPositive: true,
      }));
    }

    return sorted.slice(1).map((item, idx) => {
      const prev = sorted[idx];
      const delta = item.total - prev.total;
      const deltaPct = prev.total !== 0 ? (delta / Math.abs(prev.total)) * 100 : 0;
      return {
        period: item.label,
        current: Math.round(item.total * 100) / 100,
        previous: Math.round(prev.total * 100) / 100,
        delta: Math.round(delta * 100) / 100,
        deltaPct: Math.round(deltaPct * 10) / 10,
        isPositive: delta >= 0,
      };
    });
  }

  // Non-date fallback: compare each category vs dataset mean
  const catCol = schema.categoryHierarchy[0];
  if (!catCol) return [];
  const clustered = buildCategoryClusteredData(rows, schema, catCol, 'desc');
  const meanVal = clustered.length > 0 ? clustered.reduce((s, c) => s + c.primary, 0) / clustered.length : 0;

  return clustered.map(item => {
    const delta = item.primary - meanVal;
    const deltaPct = meanVal !== 0 ? (delta / Math.abs(meanVal)) * 100 : 0;
    return {
      period: item.name,
      current: item.primary,
      previous: Math.round(meanVal * 100) / 100,
      delta: Math.round(delta * 100) / 100,
      deltaPct: Math.round(deltaPct * 10) / 10,
      isPositive: delta >= 0,
    };
  });
}

export function buildDetailedGroupedData(
  rows: Record<string, any>[],
  schema: BiSchema,
  groupCol: string
): DetailedGroupedDatum[] {
  if (!rows || rows.length === 0 || !groupCol) return [];
  const pMetric = schema.primaryMetric || 'Count';
  const sMetric = schema.secondaryMetric;

  // If secondary metric exists, compare primary vs secondary per group
  // Otherwise split by top 2 values of a secondary categorical column if available
  const altCatCol = schema.categoryHierarchy.find(c => c !== groupCol);

  if (sMetric) {
    const map = new Map<string, { a: number; b: number; count: number }>();
    for (const row of rows) {
      const key = String(row[groupCol] ?? 'Lainnya').trim() || 'Lainnya';
      const prev = map.get(key) || { a: 0, b: 0, count: 0 };
      prev.a += parseBiNumber(row[pMetric]);
      prev.b += parseBiNumber(row[sMetric]);
      prev.count += 1;
      map.set(key, prev);
    }

    return Array.from(map.entries())
      .map(([name, agg]) => ({
        name,
        groupA: Math.round(agg.a * 100) / 100,
        groupB: Math.round(agg.b * 100) / 100,
        groupALabel: pMetric.replace(/_/g, ' '),
        groupBLabel: sMetric.replace(/_/g, ' '),
        count: agg.count,
      }))
      .sort((a, b) => b.groupA - a.groupA)
      .slice(0, 10);
  }

  if (altCatCol) {
    const topTwo = Array.from(
      new Set(rows.map(r => String(r[altCatCol] ?? '').trim()).filter(Boolean))
    ).slice(0, 2);
    const labelA = topTwo[0] || 'Segmen A';
    const labelB = topTwo[1] || 'Segmen B';
    const map = new Map<string, { a: number; b: number; count: number }>();
    for (const row of rows) {
      const key = String(row[groupCol] ?? 'Lainnya').trim() || 'Lainnya';
      const sub = String(row[altCatCol] ?? '').trim();
      const val = schema.primaryMetric ? parseBiNumber(row[schema.primaryMetric]) : 1;
      const prev = map.get(key) || { a: 0, b: 0, count: 0 };
      if (sub === labelA) prev.a += val;
      else prev.b += val;
      prev.count += 1;
      map.set(key, prev);
    }
    return Array.from(map.entries())
      .map(([name, agg]) => ({
        name,
        groupA: agg.a,
        groupB: agg.b,
        groupALabel: labelA,
        groupBLabel: labelB,
        count: agg.count,
      }))
      .sort((a, b) => b.groupA + b.groupB - (a.groupA + a.groupB))
      .slice(0, 10);
  }

  return [];
}

// Calibrated map projection percentages (viewBox 0 0 800 320 for Indonesian Archipelago)
const INDONESIA_COORDS: Record<string, { xPct: number; yPct: number; lat: number; lng: number }> = {
  'sumatera utara': { xPct: 14, yPct: 26, lat: 3.59, lng: 98.67 },
  medan: { xPct: 14, yPct: 26, lat: 3.59, lng: 98.67 },
  aceh: { xPct: 10, yPct: 18, lat: 5.55, lng: 95.32 },
  riau: { xPct: 20, yPct: 40, lat: 0.51, lng: 101.44 },
  palembang: { xPct: 24, yPct: 55, lat: -2.99, lng: 104.76 },
  lampung: { xPct: 26, yPct: 65, lat: -5.43, lng: 105.26 },
  jabodetabek: { xPct: 29, yPct: 71, lat: -6.21, lng: 106.85 },
  jakarta: { xPct: 29, yPct: 71, lat: -6.21, lng: 106.85 },
  'jawa barat': { xPct: 32, yPct: 75, lat: -6.91, lng: 107.61 },
  bandung: { xPct: 32, yPct: 75, lat: -6.91, lng: 107.61 },
  'jawa tengah': { xPct: 36, yPct: 76, lat: -7.15, lng: 110.14 },
  semarang: { xPct: 36, yPct: 75, lat: -6.97, lng: 110.42 },
  yogyakarta: { xPct: 36, yPct: 79, lat: -7.79, lng: 110.36 },
  'jawa timur': { xPct: 41, yPct: 77, lat: -7.54, lng: 112.24 },
  surabaya: { xPct: 41, yPct: 76, lat: -7.25, lng: 112.75 },
  'bali & nusa': { xPct: 47, yPct: 81, lat: -8.41, lng: 115.19 },
  bali: { xPct: 46, yPct: 80, lat: -8.41, lng: 115.19 },
  lombok: { xPct: 49, yPct: 81, lat: -8.65, lng: 116.32 },
  'kalimantan barat': { xPct: 36, yPct: 42, lat: -0.02, lng: 109.34 },
  'kalimantan timur': { xPct: 48, yPct: 37, lat: 0.54, lng: 116.42 },
  balikpapan: { xPct: 48, yPct: 43, lat: -1.27, lng: 116.83 },
  'kalimantan selatan': { xPct: 45, yPct: 54, lat: -3.09, lng: 115.28 },
  'sulawesi selatan': { xPct: 58, yPct: 60, lat: -5.14, lng: 119.43 },
  makassar: { xPct: 58, yPct: 62, lat: -5.14, lng: 119.43 },
  'sulawesi utara': { xPct: 65, yPct: 32, lat: 1.47, lng: 124.84 },
  maluku: { xPct: 74, yPct: 50, lat: -3.24, lng: 130.15 },
  papua: { xPct: 88, yPct: 52, lat: -4.27, lng: 138.08 },
};

export function buildGeoDistributionData(
  rows: Record<string, any>[],
  schema: BiSchema
): GeoAnalyticsResult {
  const pMetric = schema.primaryMetric;
  const sMetric = schema.secondaryMetric;

  // Alternative breakdown (always computed accurately for non-geo fallback)
  const fallbackCol = schema.categoryHierarchy[0] || schema.categoricalCols[0] || null;
  const altList = fallbackCol
    ? buildCategoryClusteredData(rows, schema, fallbackCol, 'desc').map(c => ({
        label: c.name,
        metricValue: c.primary,
        secondaryValue: c.secondary,
        sharePct: c.sharePct,
        count: c.count,
      }))
    : schema.numericCols.slice(0, 5).map(col => {
        const st = computeNumericStats(rows.map(r => r[col]));
        return {
          label: col.replace(/_/g, ' '),
          metricValue: st?.sum || 0,
          secondaryValue: st?.mean || 0,
          sharePct: 100,
          count: rows.length,
        };
      });

  const alternativeBreakdown = {
    title: fallbackCol
      ? `Distribusi Metrik per ${fallbackCol.replace(/_/g, ' ')}`
      : 'Ringkasan Profil Metrik Numerik',
    subtitle:
      'Dataset aktif tidak memiliki kolom geografis; menampilkan analisis segmentasi alternatif dari data aktual.',
    items: altList,
  };

  if (!schema.geoCol || !rows || rows.length === 0) {
    return {
      hasGeoData: false,
      geoCol: null,
      regions: [],
      alternativeBreakdown,
    };
  }

  const map = new Map<string, { value: number; secondaryValue: number; count: number }>();
  let totalVal = 0;

  for (const row of rows) {
    const reg = String(row[schema.geoCol] ?? '').trim();
    if (!reg) continue;
    const pVal = pMetric ? parseBiNumber(row[pMetric]) : 1;
    const sVal = sMetric ? parseBiNumber(row[sMetric]) : 0;
    totalVal += pVal;
    const prev = map.get(reg) || { value: 0, secondaryValue: 0, count: 0 };
    prev.value += pVal;
    prev.secondaryValue += sVal;
    prev.count += 1;
    map.set(reg, prev);
  }

  if (map.size === 0) {
    return {
      hasGeoData: false,
      geoCol: schema.geoCol,
      regions: [],
      alternativeBreakdown,
    };
  }

  const regions: GeoRegionDatum[] = Array.from(map.entries())
    .map(([region, agg], idx) => {
      const normalized = region.toLowerCase();
      const matchedKey = Object.keys(INDONESIA_COORDS).find(
        k => normalized.includes(k) || k.includes(normalized)
      );
      const coord = matchedKey
        ? INDONESIA_COORDS[matchedKey]
        : {
            xPct: 18 + ((idx * 17) % 68),
            yPct: 28 + ((idx * 23) % 52),
            lat: -4 + (idx % 5),
            lng: 105 + idx * 4,
          };

      return {
        region,
        value: Math.round(agg.value * 100) / 100,
        secondaryValue: Math.round(agg.secondaryValue * 100) / 100,
        count: agg.count,
        sharePct: totalVal > 0 ? Math.round((agg.value / totalVal) * 1000) / 10 : 0,
        ...coord,
      };
    })
    .sort((a, b) => b.value - a.value);

  return {
    hasGeoData: true,
    geoCol: schema.geoCol,
    regions,
    alternativeBreakdown,
  };
}

export function buildDeterministicBiAiInsights(
  datasetName: string,
  filteredRows: Record<string, any>[],
  allRows: Record<string, any>[],
  schema: BiSchema,
  kpis: BiKpiCardData[],
  clustered: ClusteredBarDatum[],
  comparative: ComparativePeriodDatum[],
  geo: GeoAnalyticsResult
): BiAiInsightsPayload {
  const pMetric = schema.primaryMetric || 'Metrik Utama';
  const totalKpi = kpis[0];
  const avgKpi = kpis[2];
  const growthKpi = kpis[3];

  const topCat = clustered[0];
  const bottomCat = clustered[clustered.length - 1];

  const keyInsights: string[] = [];
  if (totalKpi) {
    keyInsights.push(
      `${totalKpi.label} pada cakupan filter saat ini mencapai ${totalKpi.formattedValue} dari ${filteredRows.length} baris observasi.`
    );
  }
  if (topCat) {
    keyInsights.push(
      `Kontributor tertinggi berasal dari segmen "${topCat.name}" sebesar ${formatBiMetric(topCat.primary, pMetric)} (${topCat.sharePct}% pangsa, ${topCat.count} records).`
    );
  }
  if (geo.hasGeoData && geo.regions[0]) {
    keyInsights.push(
      `Wilayah "${geo.regions[0].region}" memimpin distribusi geografis dengan kontribusi ${geo.regions[0].sharePct}% (${formatBiMetric(geo.regions[0].value, pMetric)}).`
    );
  } else if (bottomCat && clustered.length > 1) {
    keyInsights.push(
      `Segmen dengan kontribusi terendah adalah "${bottomCat.name}" sebesar ${formatBiMetric(bottomCat.primary, pMetric)} (${bottomCat.sharePct}%).`
    );
  }

  // Anomalies via IQR on primary metric
  const anomalyDetection: string[] = [];
  if (schema.primaryMetric && filteredRows.length >= 4) {
    const vals = filteredRows.map(r => parseBiNumber(r[schema.primaryMetric!]));
    const outliers = detectOutliers(vals);
    if (outliers.length > 0) {
      const maxOutlier = outliers.reduce((a, b) => (b.value > a.value ? b : a), outliers[0]);
      const labelCol = schema.categoryHierarchy[0] || schema.dateCol;
      const rowRef = filteredRows[maxOutlier.index];
      const refDesc = labelCol && rowRef ? ` (${labelCol}: ${rowRef[labelCol]})` : '';
      anomalyDetection.push(
        `Terdeteksi ${outliers.length} nilai ekstrem (metode IQR 1.5x) pada ${pMetric}; puncak outlier bernilai ${formatBiMetric(maxOutlier.value, pMetric)}${refDesc}.`
      );
    } else {
      anomalyDetection.push(
        `Tidak ditemukan outlier statistik signifikan (aturan IQR 1.5x) pada variabel ${pMetric} untuk data terfilter.`
      );
    }
  } else {
    anomalyDetection.push('Jumlah baris terfilter terlalu kecil (<4) untuk deteksi anomali IQR.');
  }

  // Significant changes from comparative periods
  const significantChanges: string[] = [];
  if (comparative.length > 0) {
    const bestGain = comparative.reduce((a, b) => (b.deltaPct > a.deltaPct ? b : a), comparative[0]);
    const worstDrop = comparative.reduce((a, b) => (b.deltaPct < a.deltaPct ? b : a), comparative[0]);
    significantChanges.push(
      `Lonjakan tertinggi terjadi pada periode "${bestGain.period}" sebesar ${bestGain.deltaPct >= 0 ? '+' : ''}${bestGain.deltaPct}% (${formatBiMetric(bestGain.delta, pMetric)}).`
    );
    if (worstDrop.deltaPct < 0) {
      significantChanges.push(
        `Penurunan terbesar tercatat pada "${worstDrop.period}" sebesar ${worstDrop.deltaPct}% (${formatBiMetric(worstDrop.delta, pMetric)}).`
      );
    }
  }

  const performanceSummary = `${datasetName} menampilkan ${filteredRows.length} dari ${allRows.length} total records dengan rata-rata ${pMetric} sebesar ${avgKpi?.formattedValue || '-'}.`;
  const trendAnalysis = `Laju pertumbuhan paruh periode tercatat ${growthKpi?.formattedValue || '0%'} dengan arah ${
    growthKpi?.trend === 'up' ? 'ekspansi positif' : growthKpi?.trend === 'down' ? 'kontraksi' : 'stabil'
  }.`;

  const recommendedActions: string[] = [];
  if (topCat) {
    recommendedActions.push(
      `Prioritaskan kapasitas & retensi pada segmen unggulan "${topCat.name}" yang menopang ${topCat.sharePct}% total ${pMetric}.`
    );
  }
  if (bottomCat && clustered.length > 2) {
    recommendedActions.push(
      `Audit penyebab rendahnya performa pada "${bottomCat.name}" (${bottomCat.sharePct}%) menggunakan Drill Through ke level transaksi.`
    );
  }
  recommendedActions.push(
    `Lanjutkan proyeksi jangka menengah pada modul Forecasting & ML untuk mengukur Confidence Interval 95% atas tren ${pMetric}.`
  );

  return {
    generatedAt: new Date().toISOString(),
    datasetName,
    filteredRowCount: filteredRows.length,
    totalRowCount: allRows.length,
    keyInsights,
    performanceSummary,
    trendAnalysis,
    anomalyDetection,
    significantChanges,
    recommendedActions,
  };
}
