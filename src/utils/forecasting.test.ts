import test from 'node:test';
import assert from 'node:assert/strict';
import {
  prepareTimeSeries,
  computeTimeSeriesStats,
  runRollingOriginBacktest,
  compareForecastModels,
  runAdvancedForecastPipeline,
  MODEL_CATALOG,
  ForecastModelId,
} from './forecasting';

function buildDateRows(count: number, stepDays: number, valueFn: (i: number) => number | null, startIso = '2024-01-01') {
  const start = new Date(`${startIso}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start.getTime() + i * stepDays * 24 * 60 * 60 * 1000);
    return {
      Date: d.toISOString().split('T')[0],
      Value: valueFn(i),
    };
  });
}

test('1. Daily dataset: detects daily frequency, runs backtesting and 80%/95% CI', () => {
  const rows = buildDateRows(24, 1, i => 100 + i * 5 + (i % 2 === 0 ? 2 : -2));
  const out = runAdvancedForecastPipeline({
    rows,
    dateColumn: 'Date',
    targetColumn: 'Value',
    frequency: 'auto',
    method: 'auto',
    horizon: '7d',
    confidenceLevel: 0.95,
  });

  assert.equal(out.success, true);
  assert.ok(out.result);
  assert.equal(out.result.appliedFrequency, 'daily');
  assert.equal(out.result.horizonSteps, 7);
  assert.equal(out.result.evaluation.validationStatus, 'VALIDATED');
  assert.ok(out.result.backtestPoints.length >= 2);
  assert.ok(out.result.evaluation.ci95Upper >= out.result.evaluation.ci80Upper);
  assert.ok(out.result.evaluation.ci80Lower >= out.result.evaluation.ci95Lower);
});

test('2. Weekly dataset: detects weekly frequency and projects +7 day intervals', () => {
  const rows = buildDateRows(18, 7, i => 500 + i * 25);
  const out = runAdvancedForecastPipeline({
    rows,
    dateColumn: 'Date',
    targetColumn: 'Value',
    frequency: 'auto',
    method: 'holt',
    horizon: '30d',
  });

  assert.equal(out.success, true);
  assert.ok(out.result);
  assert.equal(out.result.appliedFrequency, 'weekly');
  const futurePts = out.result.points.filter(p => p.status === 'Forecast');
  assert.equal(futurePts.length, 4);
  const diffMs = Date.parse(futurePts[1].date) - Date.parse(futurePts[0].date);
  assert.equal(Math.round(diffMs / (1000 * 60 * 60 * 24)), 7);
});

test('3. Monthly dataset: detects monthly frequency and runs 6m horizon accurately', () => {
  const rows = Array.from({ length: 16 }, (_, i) => {
    const year = 2023 + Math.floor(i / 12);
    const month = String((i % 12) + 1).padStart(2, '0');
    return { Month: `${year}-${month}-01`, MRR: 100000 + i * 12000 };
  });

  const out = runAdvancedForecastPipeline({
    rows,
    dateColumn: 'Month',
    targetColumn: 'MRR',
    frequency: 'auto',
    method: 'linear',
    horizon: '6m',
  });

  assert.equal(out.success, true);
  assert.ok(out.result);
  assert.equal(out.result.appliedFrequency, 'monthly');
  assert.equal(out.result.horizonSteps, 6);
  const futurePts = out.result.points.filter(p => p.status === 'Forecast');
  assert.equal(futurePts[0].date, '2024-05-01');
  assert.equal(futurePts[5].date, '2024-10-01');
});

test('4. Yearly dataset: detects yearly frequency and projects integer year labels', () => {
  const rows = Array.from({ length: 10 }, (_, i) => ({
    Year: String(2015 + i),
    Revenue: 200 + i * 35,
  }));

  const out = runAdvancedForecastPipeline({
    rows,
    dateColumn: 'Year',
    targetColumn: 'Revenue',
    frequency: 'auto',
    method: 'linear',
    horizon: 'custom',
    customSteps: 4,
  });

  assert.equal(out.success, true);
  assert.ok(out.result);
  assert.equal(out.result.appliedFrequency, 'yearly');
  const futurePts = out.result.points.filter(p => p.status === 'Forecast');
  assert.equal(futurePts.length, 4);
  assert.equal(futurePts[0].date, '2025');
  assert.equal(futurePts[3].date, '2028');
});

test('5. Upward trend dataset: identifies UPWARD trend and achieves strong accuracy', () => {
  const rows = buildDateRows(20, 1, i => 100 + i * 15);
  const out = runAdvancedForecastPipeline({
    rows,
    dateColumn: 'Date',
    targetColumn: 'Value',
    method: 'linear',
    horizon: '7d',
  });

  assert.equal(out.success, true);
  assert.ok(out.result);
  assert.equal(out.result.statistics.trendDirection, 'UPWARD');
  assert.equal(out.result.evaluation.trend, 'UPWARD');
  assert.ok(out.result.evaluation.growthPercentage > 0);
  assert.ok(out.result.evaluation.r2 > 0.95);
});

test('6. Downward trend dataset: identifies DOWNWARD trend and negative growth rate', () => {
  const rows = buildDateRows(20, 1, i => 500 - i * 12);
  const out = runAdvancedForecastPipeline({
    rows,
    dateColumn: 'Date',
    targetColumn: 'Value',
    method: 'holt',
    horizon: '7d',
  });

  assert.equal(out.success, true);
  assert.ok(out.result);
  assert.equal(out.result.statistics.trendDirection, 'DOWNWARD');
  assert.equal(out.result.evaluation.trend, 'DOWNWARD');
  assert.ok(out.result.evaluation.growthPercentage < 0);
});

test('7. Seasonal dataset: detects seasonal period and activates Holt-Winters & SARIMA', () => {
  // Strong 7-day cycle across 35 days
  const pattern = [100, 120, 140, 160, 220, 260, 190];
  const rows = buildDateRows(35, 1, i => pattern[i % 7] + i * 2);

  const out = runAdvancedForecastPipeline({
    rows,
    dateColumn: 'Date',
    targetColumn: 'Value',
    frequency: 'daily',
    method: 'holt_winters',
    horizon: '14d',
  });

  assert.equal(out.success, true);
  assert.ok(out.result);
  assert.equal(out.result.statistics.seasonalityDetected, true);
  assert.equal(out.result.statistics.seasonalPeriod, 7);
  assert.equal(out.result.evaluation.selectedModelId, 'holt_winters');

  const sarimaRow = out.result.modelComparisons.find(m => m.modelId === 'sarima');
  assert.ok(sarimaRow);
  assert.equal(sarimaRow.eligible, true);
});

test('8. Dataset with missing values: linearly interpolates gaps and emits warning', () => {
  const rows = [
    { Date: '2024-01-01', Value: 100 },
    { Date: '2024-01-02', Value: 110 },
    { Date: '2024-01-03', Value: null },
    { Date: '2024-01-04', Value: 130 },
    { Date: '2024-01-05', Value: 140 },
    { Date: '2024-01-06', Value: 150 },
    { Date: '2024-01-07', Value: 160 },
  ];

  const prep = prepareTimeSeries({ rows, dateColumn: 'Date', targetColumn: 'Value' });
  assert.equal(prep.valid, true);
  assert.equal(prep.imputedCount, 1);
  assert.equal(prep.points[2].value, 120);
  assert.ok(prep.issues.some(i => i.code === 'MISSING_VALUES_IMPUTED'));
});

test('9. Dataset with outliers: detects extreme IQR anomaly cleanly', () => {
  const rows = buildDateRows(15, 1, i => (i === 8 ? 1500 : 100 + (i % 3) * 4));
  const prep = prepareTimeSeries({ rows, dateColumn: 'Date', targetColumn: 'Value' });
  assert.equal(prep.valid, true);
  const stats = computeTimeSeriesStats(prep.points, prep.appliedFrequency);
  assert.ok(stats.outliers.length >= 1);
  assert.equal(stats.outliers[0].value, 1500);
});

test('10. Dataset without valid date column: fails cleanly without fake forecast', () => {
  const rows = [
    { Region: 'Jabodetabek', Total_Revenue: 1293400000 },
    { Region: 'Jawa Timur', Total_Revenue: 745600000 },
    { Region: 'Bali & Nusa', Total_Revenue: 610400000 },
    { Region: 'Jawa Barat', Total_Revenue: 231000000 },
  ];

  const out = runAdvancedForecastPipeline({
    rows,
    dateColumn: 'Region',
    targetColumn: 'Total_Revenue',
  });

  assert.equal(out.success, false);
  assert.equal(out.result, undefined);
  assert.ok(out.error && out.error.length > 0);
  assert.ok(out.issues.some(i => i.code === 'MISSING_DATE_COLUMN' && i.severity === 'error'));
});

test('11. Limited / insufficient dataset: <3 rows blocks, 3-5 rows marks INSUFFICIENT_DATA', () => {
  const tinyRows = buildDateRows(2, 1, i => 100 + i * 10);
  const blocked = runAdvancedForecastPipeline({
    rows: tinyRows,
    dateColumn: 'Date',
    targetColumn: 'Value',
  });
  assert.equal(blocked.success, false);
  assert.ok(blocked.issues.some(i => i.code === 'INSUFFICIENT_DATA' && i.severity === 'error'));

  const smallRows = buildDateRows(4, 1, i => 100 + i * 10);
  const limited = runAdvancedForecastPipeline({
    rows: smallRows,
    dateColumn: 'Date',
    targetColumn: 'Value',
    horizon: '30d',
  });
  assert.equal(limited.success, true);
  assert.ok(limited.result);
  assert.equal(limited.result.evaluation.validationStatus, 'INSUFFICIENT_DATA');
  assert.ok(limited.result.issues.some(i => i.code === 'HORIZON_TOO_LONG'));
});

test('12. Multi-category segmented dataset: filters and aggregates segment accurately', () => {
  const rows = [
    { Date: '2024-01-01', Category: 'Electronics', Revenue: 100 },
    { Date: '2024-01-01', Category: 'Electronics', Revenue: 50 }, // same day duplicate to aggregate
    { Date: '2024-01-01', Category: 'Furniture', Revenue: 900 },
    { Date: '2024-01-02', Category: 'Electronics', Revenue: 170 },
    { Date: '2024-01-03', Category: 'Electronics', Revenue: 190 },
    { Date: '2024-01-04', Category: 'Electronics', Revenue: 210 },
    { Date: '2024-01-05', Category: 'Electronics', Revenue: 230 },
    { Date: '2024-01-06', Category: 'Electronics', Revenue: 250 },
  ];

  const out = runAdvancedForecastPipeline({
    rows,
    dateColumn: 'Date',
    targetColumn: 'Revenue',
    categoryColumn: 'Category',
    segmentValue: 'Electronics',
    aggregation: 'sum',
    method: 'linear',
    horizon: '7d',
  });

  assert.equal(out.success, true);
  assert.ok(out.result);
  assert.equal(out.prepared?.points.length, 6);
  assert.equal(out.prepared?.points[0].value, 150); // 100 + 50 summed, Furniture 900 excluded
  assert.ok(out.issues.some(i => i.code === 'DUPLICATE_TIMESTAMPS'));
});

test('Zero-leakage backtesting & zero-actual MAPE nullability & all 10 models execute', () => {
  const rows = buildDateRows(28, 1, i => (i === 25 ? 0 : 120 + i * 3 + Math.sin(i) * 10));
  const prep = prepareTimeSeries({ rows, dateColumn: 'Date', targetColumn: 'Value' });
  assert.equal(prep.valid, true);
  const stats = computeTimeSeriesStats(prep.points, 'daily');
  const comparisons = compareForecastModels(prep.points, stats);

  const expectedIds = Object.keys(MODEL_CATALOG) as Exclude<ForecastModelId, 'auto'>[];
  assert.equal(comparisons.length, expectedIds.length);
  assert.equal(expectedIds.length, 10);

  // Rolling-origin backtest contains zero inside test split -> mape should be null on metrics
  const bt = runRollingOriginBacktest(prep.points, 'linear', 1);
  assert.equal(bt.status, 'VALIDATED');
  assert.equal(bt.metrics.mape, null);
  assert.ok(Number.isFinite(bt.metrics.smape));
  assert.equal(bt.trainCount + bt.testCount, prep.points.length);
});
