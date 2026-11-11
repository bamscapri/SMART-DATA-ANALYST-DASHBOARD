import test from 'node:test';
import assert from 'node:assert/strict';
import { mapSupabaseRowToDataset } from './supabaseService';

test('mapSupabaseRowToDataset correctly transforms PostgreSQL record and sheets', () => {
  const mockRow = {
    id: 'b8cfc8d8-735c-48be-81e0-0220d3027bca',
    name: 'Enterprise Logistics Q4',
    description: 'Fleet transport performance',
    file_name: 'logistics_q4.xlsx',
    file_type: 'xlsx',
    file_size: 154000,
    created_at: '2024-11-10T12:00:00.000Z',
    is_cleaned: true,
    original_dataset_id: null,
    metadata: {
      data: [{ TripID: 'T-101', FuelLiters: 45, DistanceKm: 320 }]
    }
  };

  const mockSheets = [
    {
      sheet_name: 'Routes',
      sample_data: [
        { RouteID: 'R-01', Origin: 'Jakarta', Dest: 'Surabaya' },
        { RouteID: 'R-02', Origin: 'Bandung', Dest: 'Semarang' }
      ],
      schema: { columns: ['RouteID', 'Origin', 'Dest'] }
    }
  ];

  const result = mapSupabaseRowToDataset(mockRow, mockSheets);

  assert.equal(result.id, 'b8cfc8d8-735c-48be-81e0-0220d3027bca');
  assert.equal(result.name, 'Enterprise Logistics Q4');
  assert.equal(result.fileType, 'xlsx');
  assert.equal(result.isCleaned, true);
  assert.equal(result.sheets?.length, 1);
  assert.equal(result.sheets?.[0].name, 'Routes');
  assert.equal(result.data.length, 2);
  assert.equal(result.data[0].Origin, 'Jakarta');
});

test('mapSupabaseRowToDataset gracefully handles missing sheets and uses row metadata', () => {
  const mockRow = {
    id: 'f1a2b3c4-1234-4567-89ab-cdef01234567',
    name: 'Simple CSV Dataset',
    file_name: 'data.csv',
    file_type: 'csv',
    file_size: 4500,
    metadata: {
      data: [{ ID: 1, Value: 100 }, { ID: 2, Value: 200 }]
    }
  };

  const result = mapSupabaseRowToDataset(mockRow, []);

  assert.equal(result.id, 'f1a2b3c4-1234-4567-89ab-cdef01234567');
  assert.equal(result.data.length, 2);
  assert.equal(result.data[1].Value, 200);
  assert.equal(result.sheets, undefined);
});
