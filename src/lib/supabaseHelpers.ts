export const CANONICAL_SUPABASE_PROJECT_REF = 'hbfjcqqiqajwbnnoittc';
export const CANONICAL_SUPABASE_URL = `https://${CANONICAL_SUPABASE_PROJECT_REF}.supabase.co`;
export const SUPABASE_STORAGE_BUCKET = 'datasets';

export const REQUIRED_SUPABASE_TABLES = [
  'profiles',
  'datasets',
  'dataset_files',
  'dataset_sheets',
  'analysis_results',
  'ai_conversations',
  'ai_messages',
  'forecasts',
  'reports',
  'activity_logs',
  'system_settings',
] as const;

export type SupabaseTableName = (typeof REQUIRED_SUPABASE_TABLES)[number];

export type SupabaseConnectionStatus =
  | 'CONNECTED'
  | 'CONNECTING'
  | 'RECONNECTING'
  | 'DISCONNECTED'
  | 'AUTHENTICATION ERROR'
  | 'DATABASE ERROR';

export type SubsystemStatus = 'OK' | 'WARNING' | 'ERROR' | 'UNVERIFIED';

export type SupabaseErrorCategory =
  | 'MISSING_ENV'
  | 'INVALID_URL'
  | 'PROJECT_MISMATCH'
  | 'INVALID_API_KEY'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'SESSION_EXPIRED'
  | 'AUTH_ERROR'
  | 'PERMISSION_DENIED'
  | 'RLS_VIOLATION'
  | 'MISSING_TABLE'
  | 'MISSING_COLUMN'
  | 'STORAGE_ERROR'
  | 'DUPLICATE_RECORD'
  | 'FOREIGN_KEY_VIOLATION'
  | 'UNKNOWN_ERROR';

export interface ParsedSupabaseError {
  category: SupabaseErrorCategory;
  code?: string;
  httpStatus?: number;
  userMessage: string;
  retryable: boolean;
  connectionStatus: SupabaseConnectionStatus;
}

export interface SupabaseEnvValidation {
  url: string;
  projectRef: string;
  isUrlValid: boolean;
  isCanonicalProject: boolean;
  hasAnonKey: boolean;
  isConfigured: boolean;
  source: 'env' | 'custom_storage' | 'missing';
  errorMessage: string | null;
}

export function sanitizeSensitiveText(input: string): string {
  if (!input) return '';
  return input
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_JWT]')
    .replace(/sb_(publishable|secret)_[A-Za-z0-9_-]+/gi, '[REDACTED_KEY]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/(apikey|api_key|password|secret|token)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]');
}

export function validateSupabaseConfiguration(params: {
  envUrl?: string;
  envKey?: string;
  customUrl?: string | null;
  customKey?: string | null;
}): SupabaseEnvValidation {
  const customUrlTrimmed = (params.customUrl || '').trim().replace(/\/+$/, '');
  const customKeyTrimmed = (params.customKey || '').trim();
  const envUrlTrimmed = (params.envUrl || '').trim().replace(/\/+$/, '');
  const envKeyTrimmed = (params.envKey || '').trim();

  const hasCustom = Boolean(customUrlTrimmed || customKeyTrimmed);
  const url = (customUrlTrimmed || envUrlTrimmed || CANONICAL_SUPABASE_URL).replace(/\/+$/, '');
  const anonKey = customKeyTrimmed || envKeyTrimmed || '';

  const isPlaceholderKey =
    !anonKey ||
    anonKey === 'your-anon-key' ||
    anonKey === 'ISI_DENGAN_SUPABASE_PUBLISHABLE_KEY' ||
    anonKey.includes('placeholder');

  const isUrlValid = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url);
  const isCanonicalProject = url.toLowerCase() === CANONICAL_SUPABASE_URL.toLowerCase();
  const hasAnonKey = !isPlaceholderKey && anonKey.length >= 20;

  let source: SupabaseEnvValidation['source'] = 'missing';
  if (hasCustom && (customKeyTrimmed || customUrlTrimmed)) {
    source = 'custom_storage';
  } else if (envUrlTrimmed || envKeyTrimmed) {
    source = 'env';
  }

  let errorMessage: string | null = null;
  if (!isUrlValid) {
    errorMessage = `URL Supabase tidak valid. Harus menggunakan ${CANONICAL_SUPABASE_URL}.`;
  } else if (!isCanonicalProject) {
    errorMessage = `Project URL tidak sesuai. Aplikasi dikunci pada project ${CANONICAL_SUPABASE_PROJECT_REF} (${CANONICAL_SUPABASE_URL}).`;
  } else if (!hasAnonKey) {
    errorMessage = 'Konfigurasi Supabase belum lengkap. Periksa environment variables VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.';
  }

  return {
    url: isCanonicalProject ? CANONICAL_SUPABASE_URL : url,
    projectRef: CANONICAL_SUPABASE_PROJECT_REF,
    isUrlValid,
    isCanonicalProject,
    hasAnonKey,
    isConfigured: isUrlValid && isCanonicalProject && hasAnonKey,
    source,
    errorMessage,
  };
}

export function parseSupabaseError(err: any, context: 'api' | 'auth' | 'database' | 'storage' = 'api'): ParsedSupabaseError {
  const code = String(err?.code || err?.error_code || '').toUpperCase();
  const status = Number(err?.status || err?.statusCode || 0) || undefined;
  const rawMessage = sanitizeSensitiveText(String(err?.message || err?.error_description || err?.msg || '')).trim();
  const lower = rawMessage.toLowerCase();

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('err_internet_disconnected') ||
    lower.includes('offline')
  ) {
    return {
      category: 'NETWORK_ERROR',
      code: code || 'NETWORK',
      httpStatus: status,
      userMessage: 'Supabase sedang tidak dapat diakses. Sistem akan mencoba menghubungkan kembali.',
      retryable: true,
      connectionStatus: 'DISCONNECTED',
    };
  }

  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('abort')) {
    return {
      category: 'TIMEOUT',
      code: code || 'TIMEOUT',
      httpStatus: status,
      userMessage: 'Permintaan ke Supabase melebihi batas waktu. Sistem akan mencoba menghubungkan kembali.',
      retryable: true,
      connectionStatus: 'RECONNECTING',
    };
  }

  if (lower.includes('invalid api key') || lower.includes('no api key found') || (status === 401 && lower.includes('apikey'))) {
    return {
      category: 'INVALID_API_KEY',
      code: code || 'INVALID_API_KEY',
      httpStatus: status || 401,
      userMessage: 'Kredensial Publishable / Anon Key Supabase tidak valid. Periksa konfigurasi environment variables.',
      retryable: false,
      connectionStatus: 'AUTHENTICATION ERROR',
    };
  }

  if (
    code === '42P01' ||
    code === 'PGRST205' ||
    code === 'PGRST200' ||
    lower.includes('could not find the table') ||
    lower.includes('does not exist')
  ) {
    return {
      category: 'MISSING_TABLE',
      code: code || 'PGRST205',
      httpStatus: status,
      userMessage: 'Tabel database Supabase belum tersedia. Jalankan skrip SQL Migration pada System Configuration.',
      retryable: false,
      connectionStatus: 'DATABASE ERROR',
    };
  }

  if (code === '42703' || code === 'PGRST204' || (lower.includes('column') && lower.includes('not'))) {
    return {
      category: 'MISSING_COLUMN',
      code: code || '42703',
      httpStatus: status,
      userMessage: 'Skema kolom database belum sesuai dengan aplikasi. Perbarui migrasi SQL Supabase.',
      retryable: false,
      connectionStatus: 'DATABASE ERROR',
    };
  }

  if (code === '23505' || lower.includes('duplicate key')) {
    return {
      category: 'DUPLICATE_RECORD',
      code: '23505',
      httpStatus: status || 409,
      userMessage: 'Data dengan identitas yang sama sudah tersimpan di database.',
      retryable: false,
      connectionStatus: 'CONNECTED',
    };
  }

  if (code === '23503' || lower.includes('foreign key')) {
    return {
      category: 'FOREIGN_KEY_VIOLATION',
      code: '23503',
      httpStatus: status || 400,
      userMessage: 'Relasi referensi data tidak ditemukan. Pastikan profil pengguna telah tersinkronisasi.',
      retryable: false,
      connectionStatus: 'DATABASE ERROR',
    };
  }

  if (code === '42501' || status === 403 || (status === 401 && lower.includes('permission denied')) || lower.includes('row-level security')) {
    const isRls = lower.includes('row-level security');
    return {
      category: isRls ? 'RLS_VIOLATION' : 'PERMISSION_DENIED',
      code: code || '42501',
      httpStatus: status || 401,
      userMessage: isRls
        ? 'Akses ditolak oleh kebijakan keamanan database (RLS).'
        : 'Akses ditolak oleh kebijakan keamanan database. Pastikan Anda telah login atau memiliki izin tabel yang sesuai.',
      retryable: false,
      connectionStatus: context === 'auth' ? 'AUTHENTICATION ERROR' : 'DATABASE ERROR',
    };
  }

  if (
    status === 401 ||
    lower.includes('jwt expired') ||
    lower.includes('session_not_found') ||
    lower.includes('invalid refresh token') ||
    lower.includes('invalid login credentials') ||
    lower.includes('email not confirmed')
  ) {
    let msg = 'Autentikasi diperlukan. Silakan login kembali.';
    if (lower.includes('invalid login credentials')) {
      msg = 'Email atau password tidak sesuai. Silakan periksa kembali kredensial Anda.';
    } else if (lower.includes('email not confirmed')) {
      msg = 'Email akun belum terverifikasi. Periksa kotak masuk email Anda untuk konfirmasi.';
    }
    return {
      category: context === 'auth' ? 'AUTH_ERROR' : 'SESSION_EXPIRED',
      code: code || 'AUTH_401',
      httpStatus: status || 401,
      userMessage: msg,
      retryable: false,
      connectionStatus: 'AUTHENTICATION ERROR',
    };
  }

  if (context === 'storage' || lower.includes('bucket') || lower.includes('object not found')) {
    return {
      category: 'STORAGE_ERROR',
      code: code || 'STORAGE_ERR',
      httpStatus: status,
      userMessage: rawMessage || 'Layanan Supabase Storage tidak dapat diakses sesuai izin bucket.',
      retryable: false,
      connectionStatus: 'DATABASE ERROR',
    };
  }

  return {
    category: 'UNKNOWN_ERROR',
    code: code || undefined,
    httpStatus: status,
    userMessage: rawMessage || 'Terjadi kendala koneksi saat berkomunikasi dengan Supabase.',
    retryable: status ? status >= 500 : false,
    connectionStatus: context === 'auth' ? 'AUTHENTICATION ERROR' : 'DATABASE ERROR',
  };
}

export function getReconnectDelayMs(attempt: number, baseMs = 2000, maxMs = 32000): number {
  const safeAttempt = Math.max(0, Math.min(attempt, 10));
  return Math.min(maxMs, baseMs * Math.pow(2, safeAttempt));
}

export const MAX_RECONNECT_ATTEMPTS = 5;

export function buildDatasetStoragePath(userId: string, datasetId: string, fileName: string): string {
  const safeUser = (userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeDataset = (datasetId || 'dataset').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFile = (fileName || 'file.dat').replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${safeUser}/${safeDataset}/${safeFile}`;
}

export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
}
