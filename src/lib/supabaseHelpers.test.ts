import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_SUPABASE_PROJECT_REF,
  CANONICAL_SUPABASE_URL,
  validateSupabaseConfiguration,
  parseSupabaseError,
  sanitizeSensitiveText,
  getReconnectDelayMs,
  buildDatasetStoragePath,
  isValidUuid,
} from './supabaseHelpers';

test('validateSupabaseConfiguration enforces canonical project URL and detects placeholders', () => {
  const valid = validateSupabaseConfiguration({
    envUrl: CANONICAL_SUPABASE_URL,
    envKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.validpayload.validsignature123',
  });
  assert.equal(valid.isConfigured, true);
  assert.equal(valid.isCanonicalProject, true);
  assert.equal(valid.projectRef, CANONICAL_SUPABASE_PROJECT_REF);
  assert.equal(valid.errorMessage, null);

  const mismatched = validateSupabaseConfiguration({
    envUrl: 'https://otherproject.supabase.co',
    envKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.validpayload.validsignature123',
  });
  assert.equal(mismatched.isConfigured, false);
  assert.equal(mismatched.isCanonicalProject, false);
  assert.match(mismatched.errorMessage || '', /hbfjcqqiqajwbnnoittc/);

  const placeholderKey = validateSupabaseConfiguration({
    envUrl: CANONICAL_SUPABASE_URL,
    envKey: 'ISI_DENGAN_SUPABASE_PUBLISHABLE_KEY',
  });
  assert.equal(placeholderKey.isConfigured, false);
  assert.equal(placeholderKey.hasAnonKey, false);
  assert.match(placeholderKey.errorMessage || '', /environment variables/i);
});

test('parseSupabaseError accurately maps PostgreSQL, PostgREST, Auth, and network errors', () => {
  const permDenied = parseSupabaseError(
    { code: '42501', status: 401, message: 'permission denied for table datasets' },
    'database'
  );
  assert.equal(permDenied.category, 'PERMISSION_DENIED');
  assert.equal(permDenied.retryable, false);
  assert.match(permDenied.userMessage, /keamanan database/i);

  const missingTable = parseSupabaseError(
    { code: 'PGRST205', message: "Could not find the table 'public.datasets' in the schema cache" },
    'database'
  );
  assert.equal(missingTable.category, 'MISSING_TABLE');
  assert.equal(missingTable.connectionStatus, 'DATABASE ERROR');

  const networkErr = parseSupabaseError(new Error('TypeError: Failed to fetch'), 'api');
  assert.equal(networkErr.category, 'NETWORK_ERROR');
  assert.equal(networkErr.retryable, true);
  assert.equal(networkErr.connectionStatus, 'DISCONNECTED');

  const duplicateErr = parseSupabaseError({ code: '23505', message: 'duplicate key value violates unique constraint' });
  assert.equal(duplicateErr.category, 'DUPLICATE_RECORD');
});

test('sanitizeSensitiveText redacts JWTs, Supabase keys, Bearer tokens, and passwords', () => {
  const raw = 'Error with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc123.xyz789 and password=supersecret';
  const clean = sanitizeSensitiveText(raw);
  assert.equal(clean.includes('eyJhbGci'), false);
  assert.equal(clean.includes('supersecret'), false);
  assert.match(clean, /\[REDACTED\]/);
});

test('getReconnectDelayMs scales exponentially with ceiling cap', () => {
  assert.equal(getReconnectDelayMs(0), 2000);
  assert.equal(getReconnectDelayMs(1), 4000);
  assert.equal(getReconnectDelayMs(2), 8000);
  assert.equal(getReconnectDelayMs(3), 16000);
  assert.equal(getReconnectDelayMs(4), 32000);
  assert.equal(getReconnectDelayMs(9), 32000);
});

test('buildDatasetStoragePath creates owner-scoped safe storage path and validates UUIDs', () => {
  const path = buildDatasetStoragePath('550e8400-e29b-41d4-a716-446655440000', 'ds_01', 'Laporan Penjualan (Final).xlsx');
  assert.equal(path, '550e8400-e29b-41d4-a716-446655440000/ds_01/Laporan_Penjualan__Final_.xlsx');
  assert.equal(isValidUuid('550e8400-e29b-41d4-a716-446655440000'), true);
  assert.equal(isValidUuid('usr_admin_001'), false);
});
