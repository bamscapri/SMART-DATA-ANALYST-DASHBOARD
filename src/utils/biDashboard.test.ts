import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectBiSchema,
  createEmptyFilterState,
  applyBiFilters,
  buildBiKpis,
  buildCategoryClusteredData,
  buildStackedAreaTrendData,
  buildDonutDistributionData,
  buildComparativePeriodData,
  buildDetailedGroupedData,
  buildGeoDistributionData,
  buildDeterministicBiAiInsights,
} from './biDashboard';
import { SEED_DATASETS } from '../data/seedDatasets';

test('detectBiSchema identifies sales retail dataset accurately including geoCol and hierarchy', () => {
  const retailRows = SEED_DATASETS[0].sheets![0].data;
  const schema = detectBiSchema(retailRows);

  assert.equal(schema.domain, 'sales');
  assert.equal(schema.dateCol, 'Date');
  assert.equal(schema.primaryMetric, 'Revenue');
  assert.equal(schema.secondaryMetric, 'Profit');
  assert.equal(schema.geoCol, 'Region');
  assert.ok(schema.categoryHierarchy.includes('Category'));
  assert.ok(schema.categoryHierarchy.includes('Product'));
  assert.ok(schema.filterableCols.some(f => f.key === 'Region'));
  assert.ok(schema.filterableCols.some(f => f.key === 'Category'));
});

test('detectBiSchema identifies SaaS dataset and safely reports non-geo alternative', () => {
  const saasRows = SEED_DATASETS[1].data;
  const schema = detectBiSchema(saasRows);

  assert.equal(schema.domain, 'saas');
  assert.equal(schema.dateCol, 'Month');
  assert.equal(schema.primaryMetric, 'MRR');
  assert.equal(schema.geoCol, null);

  const geo = buildGeoDistributionData(saasRows, schema);
  assert.equal(geo.hasGeoData, false);
  assert.ok(geo.alternativeBreakdown.items.length > 0);
});

test('applyBiFilters filters non-destructively by facet, date range, crossFilter, and category drill without mutating rows', () => {
  const retailRows = SEED_DATASETS[0].sheets![0].data;
  const originalSnapshot = JSON.stringify(retailRows);
  const schema = detectBiSchema(retailRows);
  const filters = createEmptyFilterState(schema);

  filters.facets = { Category: ['Electronics'] };
  const electronicsOnly = applyBiFilters(retailRows, schema, filters);
  assert.ok(electronicsOnly.length > 0 && electronicsOnly.length < retailRows.length);
  assert.ok(electronicsOnly.every(r => r.Category === 'Electronics'));

  // Cross filter from Region map
  const electronicsJabodetabek = applyBiFilters(retailRows, schema, filters, {
    crossFilter: { column: 'Region', value: 'Jabodetabek', sourcePanel: 'geo' },
  });
  assert.ok(electronicsJabodetabek.length > 0);
  assert.ok(
    electronicsJabodetabek.every(r => r.Category === 'Electronics' && r.Region === 'Jabodetabek')
  );

  // Date bounds narrowing
  const q1Filters = { ...createEmptyFilterState(schema), dateFrom: '2024-01-01', dateTo: '2024-03-31' };
  const q1Rows = applyBiFilters(retailRows, schema, q1Filters);
  assert.ok(q1Rows.every(r => r.Date >= '2024-01-01' && r.Date <= '2024-03-31'));

  // Ensure source data was never mutated
  assert.equal(JSON.stringify(retailRows), originalSnapshot);
});

test('all visualization builders produce coherent, non-empty aggregations for retail dataset', () => {
  const retailRows = SEED_DATASETS[0].sheets![0].data;
  const schema = detectBiSchema(retailRows);

  const kpis = buildBiKpis(retailRows, retailRows, schema);
  assert.equal(kpis.length, 6);
  assert.ok(kpis[0].rawValue > 0);

  const clustered = buildCategoryClusteredData(retailRows, schema, 'Category', 'desc');
  assert.equal(clustered.length, 4);
  assert.equal(clustered[0].name, 'Electronics');

  const stacked = buildStackedAreaTrendData(retailRows, schema, 'quarter');
  assert.equal(stacked.hasDateAxis, true);
  assert.equal(stacked.data.length, 4); // Q1..Q4 2024
  assert.ok(stacked.seriesKeys.length >= 2);

  const donut = buildDonutDistributionData(retailRows, schema, 'Category');
  const totalPct = donut.reduce((sum, s) => sum + s.percentage, 0);
  assert.ok(totalPct >= 99.5 && totalPct <= 100.5);

  const comp = buildComparativePeriodData(retailRows, schema, 'quarter');
  assert.equal(comp.length, 3); // Q2 vs Q1, Q3 vs Q2, Q4 vs Q3
  assert.ok(comp.some(c => typeof c.deltaPct === 'number'));

  const grouped = buildDetailedGroupedData(retailRows, schema, 'Region');
  assert.ok(grouped.length >= 4);
  assert.equal(grouped[0].groupALabel, 'Revenue');
  assert.equal(grouped[0].groupBLabel, 'Profit');

  const geo = buildGeoDistributionData(retailRows, schema);
  assert.equal(geo.hasGeoData, true);
  assert.equal(geo.regions[0].region, 'Jabodetabek');

  const ai = buildDeterministicBiAiInsights('Retail 2024', retailRows, retailRows, schema, kpis, clustered, comp, geo);
  assert.ok(ai.keyInsights.length >= 2);
  assert.ok(ai.recommendedActions.length >= 2);
});

test('non-dated Regional_Summary sheet produces valid fallback charts without crashing', () => {
  const summaryRows = SEED_DATASETS[0].sheets![1].data;
  const schema = detectBiSchema(summaryRows);

  assert.equal(schema.dateCol, null);
  assert.equal(schema.geoCol, 'Region');

  const stacked = buildStackedAreaTrendData(summaryRows, schema, 'month');
  assert.equal(stacked.hasDateAxis, false);
  assert.ok(stacked.data.length > 0);

  const comp = buildComparativePeriodData(summaryRows, schema, 'month');
  assert.ok(comp.length > 0);
  assert.ok(comp.some(c => c.isPositive) && comp.some(c => !c.isPositive));
});

test('empty dataset returns safe zeroed structures', () => {
  const schema = detectBiSchema([]);
  assert.equal(schema.rowCount, 0);
  assert.equal(schema.primaryMetric, null);
  const filtered = applyBiFilters([], schema, createEmptyFilterState(schema));
  assert.deepEqual(filtered, []);
  const kpis = buildBiKpis([], [], schema);
  assert.equal(kpis.length, 6);
  assert.equal(kpis[0].rawValue, 0);
});
