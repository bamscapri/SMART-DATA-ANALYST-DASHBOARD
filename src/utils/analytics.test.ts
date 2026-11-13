import test from 'node:test';
import assert from 'node:assert/strict';
import { inferColumnType, computeNumericStats, analyzeDataset, detectOutliers } from './analytics';
import { generateForecast, calculateMetrics } from './forecasting';
import { cleanDataset } from './dataCleaner';

test('inferColumnType accurately identifies types', () => {
  assert.equal(inferColumnType([10, 20.5, '35', 40]), 'numeric');
  assert.equal(inferColumnType(['2024-01-01', '2024-02-15', '2024-03-30']), 'date');
  assert.equal(inferColumnType(['North', 'South', 'North', 'East', 'South']), 'categorical');
  assert.equal(inferColumnType(['Detailed comment 1', 'Detailed note 2', 'Unique description 3', 'Another unique text 4']), 'text');
});

test('computeNumericStats calculates descriptive stats correctly', () => {
  const values = [10, 20, 30, 40, 50];
  const stats = computeNumericStats(values);
  assert.ok(stats);
  assert.equal(stats.min, 10);
  assert.equal(stats.max, 50);
  assert.equal(stats.mean, 30);
  assert.equal(stats.median, 30);
  assert.equal(stats.sum, 150);
});

test('detectOutliers identifies values exceeding 1.5 * IQR', () => {
  const normalAndOutlier = [10, 12, 11, 13, 12, 11, 14, 100];
  const outliers = detectOutliers(normalAndOutlier);
  assert.ok(outliers.length >= 1);
  assert.equal(outliers[0].value, 100);
});

test('generateForecast produces future projections and evaluation metrics', () => {
  const history = [
    { date: '2024-01-01', value: 100 },
    { date: '2024-01-02', value: 110 },
    { date: '2024-01-03', value: 120 },
    { date: '2024-01-04', value: 130 },
    { date: '2024-01-05', value: 140 }
  ];

  const forecast = generateForecast(history, 'linear', '7d', 0.95);
  assert.equal(forecast.horizonSteps, 7);
  assert.equal(forecast.points.length, 5 + 7);
  assert.ok(forecast.evaluation.r2 > 0.9);
  assert.equal(forecast.evaluation.trend, 'UPWARD');
  assert.equal(forecast.evaluation.confidenceLevel, 0.95);
  assert.equal(forecast.evaluation.zScore, 1.96);
  assert.ok(forecast.evaluation.ciUpper > forecast.evaluation.ciLower);

  // Verify every forecast point has lowerBound, upperBound, and marginOfError
  forecast.points.forEach(pt => {
    assert.ok(typeof pt.lowerBound === 'number');
    assert.ok(typeof pt.upperBound === 'number');
    assert.ok(pt.upperBound >= pt.lowerBound);
    assert.ok(typeof pt.marginOfError === 'number');
  });
});

test('generateForecast handles non-ISO date strings and sequence labels without crashing', () => {
  const sequenceHistory = [
    { date: 'Periode 1', value: 50 },
    { date: 'Periode 2', value: 55 },
    { date: 'Periode 3', value: 60 }
  ];

  const forecast = generateForecast(sequenceHistory, 'linear', '7d', 0.95);
  assert.equal(forecast.points.length, 3 + 7);
  assert.equal(forecast.points[3].date, 'Periode 4');
  assert.ok(forecast.evaluation.ciUpper > forecast.evaluation.ciLower);
});

test('cleanDataset drops duplicates and imputes missing values', () => {
  const dirtyData = [
    { id: 1, region: 'North', sales: 100 },
    { id: 1, region: 'North', sales: 100 }, // duplicate
    { id: 2, region: 'South', sales: null }, // missing sales
    { id: 3, region: 'East', sales: 200 }
  ];

  const result = cleanDataset(dirtyData, [
    { column: 'sales', missingAction: 'fill_mean' }
  ], true);

  assert.equal(result.report.duplicatesRemoved, 1);
  assert.equal(result.cleanedData.length, 3);
  assert.equal(result.cleanedData[1].sales, 150); // mean of 100 and 200
});
