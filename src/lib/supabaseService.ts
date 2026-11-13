import { createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { StoredDataset } from '../data/seedDatasets';
import { ActivityLogItem } from '../context/AppContext';
import type { UserProfile } from './supabase';
import {
  CANONICAL_SUPABASE_PROJECT_REF,
  CANONICAL_SUPABASE_URL,
  SUPABASE_STORAGE_BUCKET,
  REQUIRED_SUPABASE_TABLES,
  SupabaseTableName,
  SupabaseConnectionStatus,
  SubsystemStatus,
  SupabaseEnvValidation,
  validateSupabaseConfiguration,
  parseSupabaseError,
  sanitizeSensitiveText,
  buildDatasetStoragePath,
  isValidUuid,
} from './supabaseHelpers';

const STORAGE_KEY_URL = 'smart_ai_supabase_url';
const STORAGE_KEY_KEY = 'smart_ai_supabase_key';
const STORAGE_KEY_TECH_LOGS = 'smart_ai_supabase_tech_logs';
const STORAGE_KEY_AUTH_TOKEN = 'smart_ai_sb_auth_token';

export interface SupabaseConfig {
  url: string;
  projectRef: string;
  anonKey: string;
  isConfigured: boolean;
  envValidation: SupabaseEnvValidation;
}

export type TableCheckState = 'READY' | 'AUTH_REQUIRED' | 'MISSING_TABLE' | 'ERROR';

export interface TableHealthItem {
  table: SupabaseTableName;
  status: TableCheckState;
  detail: string;
  rowCount?: number;
}

export interface SubsystemCheckResult {
  status: SubsystemStatus;
  message: string;
  latencyMs: number;
  checkedAt: string;
}

export interface DatabaseCheckResult extends SubsystemCheckResult {
  tablesReady: boolean;
  accessibleCount: number;
  existingCount: number;
  totalTables: number;
  tables: TableHealthItem[];
}

export interface AuthCheckResult extends SubsystemCheckResult {
  authenticated: boolean;
  userId: string | null;
  email: string | null;
  role: 'admin' | 'user' | null;
  tokenExpiresAt: string | null;
  profileSynced: boolean;
}

export interface StorageCheckResult extends SubsystemCheckResult {
  bucketName: string;
  bucketAccessible: boolean;
  canListOwnFolder: boolean;
  objectCount: number;
}

export interface ConnectionTestResult {
  success: boolean;
  tablesReady: boolean;
  connectionStatus: SupabaseConnectionStatus;
  systemHealth: 'HEALTHY' | 'DEGRADED' | 'AUTH_REQUIRED' | 'OFFLINE' | 'SETUP_REQUIRED';
  message: string;
  latencyMs: number;
  datasetCount?: number;
  apiCheck: SubsystemCheckResult;
  databaseCheck: DatabaseCheckResult;
  authCheck: AuthCheckResult;
  storageCheck: StorageCheckResult;
}

export interface SupabaseTechLogEntry {
  id: string;
  timestamp: string;
  category: 'CONNECTION' | 'AUTH' | 'DATABASE' | 'STORAGE' | 'HEALTH_CHECK' | 'RECOVERY';
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export function getSupabaseTechLogs(): SupabaseTechLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TECH_LOGS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendSupabaseTechLog(
  category: SupabaseTechLogEntry['category'],
  level: SupabaseTechLogEntry['level'],
  message: string
): SupabaseTechLogEntry {
  const entry: SupabaseTechLogEntry = {
    id: `sb-log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    category,
    level,
    message: sanitizeSensitiveText(message),
  };

  if (typeof window !== 'undefined') {
    const current = getSupabaseTechLogs();
    const updated = [entry, ...current].slice(0, 40);
    try {
      localStorage.setItem(STORAGE_KEY_TECH_LOGS, JSON.stringify(updated));
    } catch {
      // ignore storage quota errors
    }
  }
  return entry;
}

export function clearSupabaseTechLogs(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_TECH_LOGS);
  }
}

export function getSupabaseConfig(): SupabaseConfig {
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) : null;

  const envUrl = import.meta.env?.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

  const envValidation = validateSupabaseConfiguration({
    envUrl,
    envKey,
    customUrl: localUrl,
    customKey: localKey,
  });

  const anonKey = (localKey || envKey || '').trim();

  return {
    url: envValidation.url,
    projectRef: CANONICAL_SUPABASE_PROJECT_REF,
    anonKey,
    isConfigured: envValidation.isConfigured,
    envValidation,
  };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  const normalizedUrl = (url || CANONICAL_SUPABASE_URL).trim().replace(/\/+$/, '');
  if (normalizedUrl.toLowerCase() !== CANONICAL_SUPABASE_URL.toLowerCase()) {
    throw new Error(`Project URL harus menggunakan ${CANONICAL_SUPABASE_URL}.`);
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_URL, CANONICAL_SUPABASE_URL);
    localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  }
}

export function clearSupabaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
  }
  cachedClient = null;
  lastClientKey = '';
}

let cachedClient: SupabaseClient | null = null;
let lastClientKey = '';

export function getSupabaseClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const config = getSupabaseConfig();
  const targetUrl = (customUrl || config.url || '').trim().replace(/\/+$/, '');
  const targetKey = (customKey || config.anonKey || '').trim();

  const validation = validateSupabaseConfiguration({
    envUrl: targetUrl,
    envKey: targetKey,
  });

  if (!validation.isConfigured) {
    return null;
  }

  const clientKey = `${validation.url}:${targetKey}`;
  if (cachedClient && lastClientKey === clientKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(validation.url, targetKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: STORAGE_KEY_AUTH_TOKEN,
      },
      global: {
        headers: {
          'x-client-info': 'smart-ai-data-analyst-enterprise/1.0',
        },
      },
    });
    lastClientKey = clientKey;
    return cachedClient;
  } catch {
    appendSupabaseTechLog('CONNECTION', 'error', 'Gagal menginisialisasi Supabase client singleton.');
    return null;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function checkSupabaseApiHealth(customUrl?: string, customKey?: string): Promise<SubsystemCheckResult> {
  const started = performance.now();
  const checkedAt = new Date().toISOString();
  const cfg = getSupabaseConfig();
  const url = (customUrl || cfg.url).trim().replace(/\/+$/, '');
  const anonKey = (customKey || cfg.anonKey).trim();

  const validation = validateSupabaseConfiguration({ envUrl: url, envKey: anonKey });
  if (!validation.isConfigured) {
    return {
      status: 'ERROR',
      message: validation.errorMessage || 'Konfigurasi Supabase belum lengkap.',
      latencyMs: 0,
      checkedAt,
    };
  }

  try {
    const res = await fetchWithTimeout(`${validation.url}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        apikey: anonKey,
      },
    });
    const latencyMs = Math.round(performance.now() - started);

    if (res.status === 401 || res.status === 403) {
      return {
        status: 'ERROR',
        message: 'API Key Supabase ditolak oleh gateway. Periksa VITE_SUPABASE_ANON_KEY.',
        latencyMs,
        checkedAt,
      };
    }

    if (!res.ok) {
      return {
        status: 'ERROR',
        message: `Supabase API gateway merespons HTTP ${res.status}.`,
        latencyMs,
        checkedAt,
      };
    }

    return {
      status: 'OK',
      message: `API Gateway Supabase (${CANONICAL_SUPABASE_PROJECT_REF}) merespons normal (${latencyMs}ms).`,
      latencyMs,
      checkedAt,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - started);
    const parsed = parseSupabaseError(err, 'api');
    return {
      status: 'ERROR',
      message: parsed.userMessage,
      latencyMs,
      checkedAt,
    };
  }
}

export async function checkSupabaseAuthHealth(clientOverride?: SupabaseClient | null): Promise<AuthCheckResult> {
  const started = performance.now();
  const checkedAt = new Date().toISOString();
  const client = clientOverride ?? getSupabaseClient();

  if (!client) {
    return {
      status: 'ERROR',
      message: 'Supabase Client belum terkonfigurasi.',
      latencyMs: 0,
      checkedAt,
      authenticated: false,
      userId: null,
      email: null,
      role: null,
      tokenExpiresAt: null,
      profileSynced: false,
    };
  }

  try {
    const { data: sessionData, error: sessionErr } = await client.auth.getSession();
    const latencyMs = Math.round(performance.now() - started);

    if (sessionErr) {
      const parsed = parseSupabaseError(sessionErr, 'auth');
      return {
        status: 'ERROR',
        message: parsed.userMessage,
        latencyMs,
        checkedAt,
        authenticated: false,
        userId: null,
        email: null,
        role: null,
        tokenExpiresAt: null,
        profileSynced: false,
      };
    }

    const session = sessionData?.session;
    if (!session?.user) {
      return {
        status: 'WARNING',
        message: 'Auth Service aktif, namun belum ada sesi pengguna yang login (mode anonim/lokal).',
        latencyMs,
        checkedAt,
        authenticated: false,
        userId: null,
        email: null,
        role: null,
        tokenExpiresAt: null,
        profileSynced: false,
      };
    }

    const { data: userData, error: userErr } = await client.auth.getUser();
    if (userErr || !userData?.user) {
      const parsed = parseSupabaseError(userErr || { status: 401, message: 'Session expired' }, 'auth');
      return {
        status: 'ERROR',
        message: parsed.userMessage,
        latencyMs: Math.round(performance.now() - started),
        checkedAt,
        authenticated: false,
        userId: null,
        email: null,
        role: null,
        tokenExpiresAt: null,
        profileSynced: false,
      };
    }

    const { data: profileRow, error: profileErr } = await client
      .from('profiles')
      .select('id, role')
      .eq('id', userData.user.id)
      .maybeSingle();

    const expiresAt = session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null;

    return {
      status: profileErr ? 'WARNING' : 'OK',
      message: profileErr
        ? `Session aktif (${userData.user.email}), namun sinkronisasi tabel profiles perlu dicek.`
        : `Session valid untuk ${userData.user.email} (Role: ${(profileRow?.role || 'user').toUpperCase()}).`,
      latencyMs: Math.round(performance.now() - started),
      checkedAt,
      authenticated: true,
      userId: userData.user.id,
      email: userData.user.email || null,
      role: profileRow?.role === 'admin' ? 'admin' : 'user',
      tokenExpiresAt: expiresAt,
      profileSynced: Boolean(profileRow?.id),
    };
  } catch (err: any) {
    const parsed = parseSupabaseError(err, 'auth');
    return {
      status: 'ERROR',
      message: parsed.userMessage,
      latencyMs: Math.round(performance.now() - started),
      checkedAt,
      authenticated: false,
      userId: null,
      email: null,
      role: null,
      tokenExpiresAt: null,
      profileSynced: false,
    };
  }
}

export async function checkSupabaseDatabaseHealth(clientOverride?: SupabaseClient | null): Promise<DatabaseCheckResult> {
  const started = performance.now();
  const checkedAt = new Date().toISOString();
  const client = clientOverride ?? getSupabaseClient();

  if (!client) {
    return {
      status: 'ERROR',
      message: 'Supabase Client belum siap untuk pemeriksaan database.',
      latencyMs: 0,
      checkedAt,
      tablesReady: false,
      accessibleCount: 0,
      existingCount: 0,
      totalTables: REQUIRED_SUPABASE_TABLES.length,
      tables: REQUIRED_SUPABASE_TABLES.map(table => ({
        table,
        status: 'ERROR',
        detail: 'Client belum terinisialisasi',
      })),
    };
  }

  const results: TableHealthItem[] = await Promise.all(
    REQUIRED_SUPABASE_TABLES.map(async (table) => {
      try {
        const { data, error } = await client.from(table).select('id').limit(1);
        if (!error) {
          return {
            table,
            status: 'READY' as const,
            detail: 'Tabel tersedia & dapat diakses sesuai kebijakan RLS',
            rowCount: Array.isArray(data) ? data.length : 0,
          };
        }

        const parsed = parseSupabaseError(error, 'database');
        if (parsed.category === 'MISSING_TABLE') {
          return {
            table,
            status: 'MISSING_TABLE' as const,
            detail: 'Tabel belum dibuat di schema public',
          };
        }

        if (parsed.category === 'PERMISSION_DENIED' || parsed.category === 'RLS_VIOLATION') {
          return {
            table,
            status: 'AUTH_REQUIRED' as const,
            detail: 'Tabel ada & dilindungi RLS/Grant (memerlukan login authenticated)',
          };
        }

        return {
          table,
          status: 'ERROR' as const,
          detail: parsed.userMessage,
        };
      } catch (err: any) {
        const parsed = parseSupabaseError(err, 'database');
        return {
          table,
          status: 'ERROR' as const,
          detail: parsed.userMessage,
        };
      }
    })
  );

  const latencyMs = Math.round(performance.now() - started);
  const accessibleCount = results.filter(r => r.status === 'READY').length;
  const existingCount = results.filter(r => r.status === 'READY' || r.status === 'AUTH_REQUIRED').length;
  const missingCount = results.filter(r => r.status === 'MISSING_TABLE').length;
  const authReqCount = results.filter(r => r.status === 'AUTH_REQUIRED').length;
  const errorCount = results.filter(r => r.status === 'ERROR').length;

  let status: SubsystemStatus = 'OK';
  let message = `${accessibleCount}/${REQUIRED_SUPABASE_TABLES.length} tabel siap digunakan (${latencyMs}ms).`;

  if (errorCount > 0 && existingCount === 0) {
    status = 'ERROR';
    message = results.find(r => r.status === 'ERROR')?.detail || 'Gagal menghubungi PostgreSQL Supabase.';
  } else if (missingCount === REQUIRED_SUPABASE_TABLES.length) {
    status = 'ERROR';
    message = 'Seluruh 11 tabel belum dibuat. Jalankan SQL Migration di Supabase Dashboard.';
  } else if (missingCount > 0) {
    status = 'WARNING';
    message = `${existingCount}/${REQUIRED_SUPABASE_TABLES.length} tabel terdeteksi, ${missingCount} tabel belum tersedia.`;
  } else if (authReqCount > 0 && accessibleCount === 0) {
    status = 'WARNING';
    message = `11/11 tabel terdeteksi & terlindungi RLS/Grant. Silakan login Supabase Auth untuk akses baca/tulis.`;
  } else if (authReqCount > 0) {
    status = 'WARNING';
    message = `${accessibleCount} tabel siap diakses, ${authReqCount} tabel memerlukan sesi login Supabase Auth.`;
  }

  return {
    status,
    message,
    latencyMs,
    checkedAt,
    tablesReady: accessibleCount > 0 || (existingCount === REQUIRED_SUPABASE_TABLES.length && missingCount === 0),
    accessibleCount,
    existingCount,
    totalTables: REQUIRED_SUPABASE_TABLES.length,
    tables: results,
  };
}

export async function checkSupabaseStorageHealth(
  clientOverride?: SupabaseClient | null,
  userId?: string | null
): Promise<StorageCheckResult> {
  const started = performance.now();
  const checkedAt = new Date().toISOString();
  const client = clientOverride ?? getSupabaseClient();

  if (!client) {
    return {
      status: 'ERROR',
      message: 'Supabase Client belum terkonfigurasi.',
      latencyMs: 0,
      checkedAt,
      bucketName: SUPABASE_STORAGE_BUCKET,
      bucketAccessible: false,
      canListOwnFolder: false,
      objectCount: 0,
    };
  }

  try {
    const folderPrefix = userId && isValidUuid(userId) ? userId : '';
    const [bucketsRes, listRes] = await Promise.all([
      client.storage.listBuckets(),
      client.storage.from(SUPABASE_STORAGE_BUCKET).list(folderPrefix, { limit: 20 }),
    ]);

    const latencyMs = Math.round(performance.now() - started);

    if (listRes.error) {
      const parsed = parseSupabaseError(listRes.error, 'storage');
      const isBucketMissing = listRes.error.message?.toLowerCase().includes('bucket not found');
      return {
        status: userId ? 'ERROR' : 'WARNING',
        message: isBucketMissing
          ? `Bucket '${SUPABASE_STORAGE_BUCKET}' belum dibuat. Jalankan SQL Migration untuk membuat private bucket.`
          : userId
          ? parsed.userMessage
          : `Private bucket '${SUPABASE_STORAGE_BUCKET}' memerlukan login Supabase Auth untuk akses file pengguna.`,
        latencyMs,
        checkedAt,
        bucketName: SUPABASE_STORAGE_BUCKET,
        bucketAccessible: !isBucketMissing,
        canListOwnFolder: false,
        objectCount: 0,
      };
    }

    const bucketFound = Array.isArray(bucketsRes.data)
      ? bucketsRes.data.some(b => b.id === SUPABASE_STORAGE_BUCKET || b.name === SUPABASE_STORAGE_BUCKET)
      : true;

    const objectCount = Array.isArray(listRes.data) ? listRes.data.length : 0;

    return {
      status: userId ? 'OK' : 'WARNING',
      message: userId
        ? `Private bucket '${SUPABASE_STORAGE_BUCKET}' aktif & terisolasi per pengguna (${objectCount} item di folder Anda).`
        : bucketFound
        ? `Storage API aktif (${latencyMs}ms). Login diperlukan untuk membaca/mengunggah file pada private bucket '${SUPABASE_STORAGE_BUCKET}'.`
        : `Storage API aktif (${latencyMs}ms). Bucket '${SUPABASE_STORAGE_BUCKET}' siap digunakan setelah autentikasi & migrasi.`,
      latencyMs,
      checkedAt,
      bucketName: SUPABASE_STORAGE_BUCKET,
      bucketAccessible: true,
      canListOwnFolder: Boolean(userId),
      objectCount,
    };
  } catch (err: any) {
    const parsed = parseSupabaseError(err, 'storage');
    return {
      status: 'ERROR',
      message: parsed.userMessage,
      latencyMs: Math.round(performance.now() - started),
      checkedAt,
      bucketName: SUPABASE_STORAGE_BUCKET,
      bucketAccessible: false,
      canListOwnFolder: false,
      objectCount: 0,
    };
  }
}

export async function testSupabaseLiveConnection(customUrl?: string, customKey?: string): Promise<ConnectionTestResult> {
  const startTime = performance.now();
  const cfg = getSupabaseConfig();
  const url = customUrl || cfg.url;
  const key = customKey || cfg.anonKey;

  const client = getSupabaseClient(url, key);
  const apiCheck = await checkSupabaseApiHealth(url, key);

  if (!client || apiCheck.status === 'ERROR') {
    const latencyMs = Math.round(performance.now() - startTime);
    const isNetwork = apiCheck.message.toLowerCase().includes('tidak dapat diakses') || apiCheck.message.toLowerCase().includes('batas waktu');
    const isAuthKeyErr = apiCheck.message.toLowerCase().includes('api key') || apiCheck.message.toLowerCase().includes('environment');

    const emptyDb: DatabaseCheckResult = {
      status: 'UNVERIFIED',
      message: 'Pemeriksaan database dilewati karena API Gateway tidak terjangkau.',
      latencyMs: 0,
      checkedAt: new Date().toISOString(),
      tablesReady: false,
      accessibleCount: 0,
      existingCount: 0,
      totalTables: REQUIRED_SUPABASE_TABLES.length,
      tables: REQUIRED_SUPABASE_TABLES.map(table => ({ table, status: 'ERROR', detail: 'Menunggu koneksi API' })),
    };

    const emptyAuth: AuthCheckResult = {
      status: 'UNVERIFIED',
      message: 'Pemeriksaan Auth menunggu koneksi API.',
      latencyMs: 0,
      checkedAt: new Date().toISOString(),
      authenticated: false,
      userId: null,
      email: null,
      role: null,
      tokenExpiresAt: null,
      profileSynced: false,
    };

    const emptyStorage: StorageCheckResult = {
      status: 'UNVERIFIED',
      message: 'Pemeriksaan Storage menunggu koneksi API.',
      latencyMs: 0,
      checkedAt: new Date().toISOString(),
      bucketName: SUPABASE_STORAGE_BUCKET,
      bucketAccessible: false,
      canListOwnFolder: false,
      objectCount: 0,
    };

    const connectionStatus: SupabaseConnectionStatus = isNetwork
      ? 'DISCONNECTED'
      : isAuthKeyErr
      ? 'AUTHENTICATION ERROR'
      : 'DATABASE ERROR';

    return {
      success: false,
      tablesReady: false,
      connectionStatus,
      systemHealth: !cfg.isConfigured ? 'SETUP_REQUIRED' : isNetwork ? 'OFFLINE' : 'DEGRADED',
      message: apiCheck.message,
      latencyMs,
      apiCheck,
      databaseCheck: emptyDb,
      authCheck: emptyAuth,
      storageCheck: emptyStorage,
    };
  }

  const authCheck = await checkSupabaseAuthHealth(client);
  const [databaseCheck, storageCheck] = await Promise.all([
    checkSupabaseDatabaseHealth(client),
    checkSupabaseStorageHealth(client, authCheck.userId),
  ]);

  const totalLatency = Math.round(performance.now() - startTime);
  const datasetsTable = databaseCheck.tables.find(t => t.table === 'datasets');
  const datasetCount = datasetsTable?.rowCount;
  const missingCount = databaseCheck.totalTables - databaseCheck.existingCount;

  let connectionStatus: SupabaseConnectionStatus = 'CONNECTED';
  let systemHealth: ConnectionTestResult['systemHealth'] = 'HEALTHY';
  let summaryMsg = `Supabase terhubung stabil (${totalLatency}ms).`;

  if (authCheck.status === 'ERROR') {
    connectionStatus = 'AUTHENTICATION ERROR';
    systemHealth = 'DEGRADED';
    summaryMsg = authCheck.message;
  } else if (databaseCheck.status === 'ERROR') {
    connectionStatus = 'DATABASE ERROR';
    systemHealth = 'SETUP_REQUIRED';
    summaryMsg = databaseCheck.message;
  } else if (missingCount > 0) {
    connectionStatus = 'CONNECTED';
    systemHealth = 'SETUP_REQUIRED';
    summaryMsg = `Koneksi API Supabase aktif (${totalLatency}ms). Terdeteksi ${databaseCheck.existingCount}/${databaseCheck.totalTables} tabel (${missingCount} tabel belum dibuat—jalankan SQL Migration).`;
  } else if (!authCheck.authenticated && databaseCheck.accessibleCount === 0 && databaseCheck.existingCount === databaseCheck.totalTables) {
    connectionStatus = 'CONNECTED';
    systemHealth = 'AUTH_REQUIRED';
    summaryMsg = `Koneksi API Supabase aktif (${totalLatency}ms). Seluruh ${databaseCheck.totalTables} tabel terlindungi RLS—login via Supabase Auth untuk sinkronisasi penuh.`;
  } else if (databaseCheck.status === 'WARNING' || storageCheck.status === 'WARNING') {
    connectionStatus = 'CONNECTED';
    systemHealth = 'DEGRADED';
    summaryMsg = databaseCheck.status === 'WARNING' ? databaseCheck.message : storageCheck.message;
  } else {
    summaryMsg = `Seluruh layanan Supabase (API, Auth, PostgreSQL 11/11 tabel, Storage) sehat dan terhubung (${totalLatency}ms).`;
  }

  return {
    success: true,
    tablesReady: databaseCheck.tablesReady,
    connectionStatus,
    systemHealth,
    message: summaryMsg,
    latencyMs: totalLatency,
    datasetCount,
    apiCheck,
    databaseCheck,
    authCheck,
    storageCheck,
  };
}

export interface AuthActionResult {
  success: boolean;
  message: string;
  requiresEmailConfirmation?: boolean;
  user?: User | null;
  session?: Session | null;
  profile?: UserProfile | null;
}

export async function fetchOrCreateAuthenticatedProfile(user: User): Promise<UserProfile> {
  const client = getSupabaseClient();
  const fallbackName =
    (user.user_metadata?.full_name as string) ||
    (user.email ? user.email.split('@')[0] : 'Enterprise Analyst');
  const fallbackCompany = (user.user_metadata?.company as string) || 'Enterprise Organization';

  if (!client) {
    return {
      id: user.id,
      email: user.email || '',
      fullName: fallbackName,
      role: 'user',
      company: fallbackCompany,
    };
  }

  try {
    const { data: existing, error } = await client
      .from('profiles')
      .select('id, full_name, email, role, avatar_url, company')
      .eq('id', user.id)
      .maybeSingle();

    if (!error && existing) {
      return {
        id: existing.id,
        email: existing.email || user.email || '',
        fullName: existing.full_name || fallbackName,
        role: existing.role === 'admin' ? 'admin' : 'user',
        avatarUrl: existing.avatar_url || '/src/assets/images/avatar_analyst_1794548317627.jpg',
        company: existing.company || fallbackCompany,
      };
    }

    const { data: inserted } = await client
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email || '',
          full_name: fallbackName,
          role: 'user',
          company: fallbackCompany,
        },
        { onConflict: 'id' }
      )
      .select('id, full_name, email, role, avatar_url, company')
      .maybeSingle();

    if (inserted) {
      return {
        id: inserted.id,
        email: inserted.email || user.email || '',
        fullName: inserted.full_name || fallbackName,
        role: inserted.role === 'admin' ? 'admin' : 'user',
        avatarUrl: inserted.avatar_url || '/src/assets/images/avatar_analyst_1794548317627.jpg',
        company: inserted.company || fallbackCompany,
      };
    }
  } catch {
    appendSupabaseTechLog('AUTH', 'warning', 'Gagal membaca tabel profiles, menggunakan metadata sesi terverifikasi.');
  }

  return {
    id: user.id,
    email: user.email || '',
    fullName: fallbackName,
    role: 'user',
    avatarUrl: '/src/assets/images/avatar_analyst_1794548317627.jpg',
    company: fallbackCompany,
  };
}

export async function signInWithSupabaseEmail(email: string, password: string): Promise<AuthActionResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Konfigurasi Supabase belum lengkap. Periksa environment variables.' };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      const parsed = parseSupabaseError(error, 'auth');
      appendSupabaseTechLog('AUTH', 'error', `Login gagal: ${parsed.userMessage}`);
      return { success: false, message: parsed.userMessage };
    }

    const profile = data.user ? await fetchOrCreateAuthenticatedProfile(data.user) : null;
    appendSupabaseTechLog('AUTH', 'success', `Login berhasil untuk ${data.user?.email || email}.`);

    return {
      success: true,
      message: 'Login Supabase berhasil dan profil tersinkronisasi.',
      user: data.user,
      session: data.session,
      profile,
    };
  } catch (err: any) {
    const parsed = parseSupabaseError(err, 'auth');
    return { success: false, message: parsed.userMessage };
  }
}

export async function signUpWithSupabaseEmail(
  email: string,
  password: string,
  fullName: string,
  company: string
): Promise<AuthActionResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Konfigurasi Supabase belum lengkap. Periksa environment variables.' };
  }

  try {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: fullName.trim() || email.split('@')[0],
          company: company.trim() || 'Enterprise Organization',
        },
      },
    });

    if (error) {
      const parsed = parseSupabaseError(error, 'auth');
      appendSupabaseTechLog('AUTH', 'error', `Registrasi gagal: ${parsed.userMessage}`);
      return { success: false, message: parsed.userMessage };
    }

    const needsConfirm = Boolean(data.user && !data.session);
    const profile = data.user && data.session ? await fetchOrCreateAuthenticatedProfile(data.user) : null;

    appendSupabaseTechLog(
      'AUTH',
      'success',
      needsConfirm
        ? `Registrasi berhasil untuk ${email} (menunggu konfirmasi email).`
        : `Registrasi dan login otomatis berhasil untuk ${email}.`
    );

    return {
      success: true,
      requiresEmailConfirmation: needsConfirm,
      message: needsConfirm
        ? 'Registrasi berhasil. Silakan periksa email Anda untuk mengklik tautan verifikasi akun.'
        : 'Akun berhasil didaftarkan dan sesi aktif.',
      user: data.user,
      session: data.session,
      profile,
    };
  } catch (err: any) {
    const parsed = parseSupabaseError(err, 'auth');
    return { success: false, message: parsed.userMessage };
  }
}

export async function signOutFromSupabase(): Promise<AuthActionResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: true, message: 'Sesi lokal dibersihkan.' };
  }

  try {
    const { error } = await client.auth.signOut();
    if (error) {
      const parsed = parseSupabaseError(error, 'auth');
      return { success: false, message: parsed.userMessage };
    }
    appendSupabaseTechLog('AUTH', 'info', 'Pengguna logout dari sesi Supabase Auth.');
    return { success: true, message: 'Berhasil logout dari Supabase.' };
  } catch (err: any) {
    const parsed = parseSupabaseError(err, 'auth');
    return { success: false, message: parsed.userMessage };
  }
}

export async function sendSupabasePasswordReset(email: string): Promise<AuthActionResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Konfigurasi Supabase belum lengkap.' };
  }

  try {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) {
      const parsed = parseSupabaseError(error, 'auth');
      return { success: false, message: parsed.userMessage };
    }
    appendSupabaseTechLog('AUTH', 'info', `Permintaan reset password dikirim ke ${email.trim()}.`);
    return {
      success: true,
      message: 'Tautan reset password telah dikirim ke alamat email terdaftar Anda.',
    };
  } catch (err: any) {
    const parsed = parseSupabaseError(err, 'auth');
    return { success: false, message: parsed.userMessage };
  }
}

export async function updateSupabaseUserPassword(newPassword: string): Promise<AuthActionResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Konfigurasi Supabase belum lengkap.' };
  }

  try {
    const { data, error } = await client.auth.updateUser({ password: newPassword });
    if (error) {
      const parsed = parseSupabaseError(error, 'auth');
      return { success: false, message: parsed.userMessage };
    }
    appendSupabaseTechLog('AUTH', 'success', 'Password akun Supabase berhasil diperbarui.');
    return {
      success: true,
      message: 'Password akun Supabase berhasil diperbarui.',
      user: data.user,
    };
  } catch (err: any) {
    const parsed = parseSupabaseError(err, 'auth');
    return { success: false, message: parsed.userMessage };
  }
}

export async function updateAuthenticatedProfile(
  userId: string,
  fullName: string,
  company: string
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client || !isValidUuid(userId)) {
    return { success: false, message: 'Perubahan disimpan di profil sesi lokal (belum login Supabase).' };
  }

  try {
    const { error } = await client
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        company: company.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      const parsed = parseSupabaseError(error, 'database');
      return { success: false, message: parsed.userMessage };
    }

    appendSupabaseTechLog('DATABASE', 'success', 'Profil pengguna disinkronkan ke public.profiles.');
    return { success: true, message: 'Profil berhasil diperbarui di database Supabase.' };
  } catch (err: any) {
    const parsed = parseSupabaseError(err, 'database');
    return { success: false, message: parsed.userMessage };
  }
}

export interface StorageUploadResult {
  success: boolean;
  filePath?: string;
  message: string;
}

export async function uploadDatasetFileToStorage(
  file: File,
  datasetId: string
): Promise<StorageUploadResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase Client belum siap.' };
  }

  try {
    const { data: sessionRes } = await client.auth.getSession();
    const authUserId = sessionRes?.session?.user?.id;
    if (!authUserId) {
      return { success: false, message: 'Upload ke Private Storage memerlukan login Supabase Auth.' };
    }

    const storagePath = buildDatasetStoragePath(authUserId, datasetId, file.name);
    const { error: uploadErr } = await client.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .upload(storagePath, file, {
        upsert: true,
        contentType: file.type || 'application/octet-stream',
      });

    if (uploadErr) {
      const parsed = parseSupabaseError(uploadErr, 'storage');
      appendSupabaseTechLog('STORAGE', 'error', `Upload file gagal: ${parsed.userMessage}`);
      return { success: false, message: parsed.userMessage };
    }

    if (isValidUuid(datasetId)) {
      await client.from('dataset_files').insert({
        dataset_id: datasetId,
        file_path: storagePath,
        storage_bucket: SUPABASE_STORAGE_BUCKET,
        original_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        file_size_bytes: file.size,
        uploaded_by: authUserId,
      });
    }

    appendSupabaseTechLog('STORAGE', 'success', `File diunggah aman ke private bucket '${SUPABASE_STORAGE_BUCKET}': ${storagePath}`);
    return {
      success: true,
      filePath: storagePath,
      message: 'File berhasil diunggah ke private Supabase Storage.',
    };
  } catch (err: any) {
    const parsed = parseSupabaseError(err, 'storage');
    return { success: false, message: parsed.userMessage };
  }
}

export async function createDatasetSignedDownloadUrl(filePath: string, expiresInSeconds = 300): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client || !filePath) return null;

  try {
    const { data, error } = await client.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .createSignedUrl(filePath, expiresInSeconds);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

export async function deleteDatasetFileFromStorage(filePath: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !filePath) return false;

  try {
    const { error } = await client.storage.from(SUPABASE_STORAGE_BUCKET).remove([filePath]);
    return !error;
  } catch {
    return false;
  }
}

export function mapSupabaseRowToDataset(row: any, sheets: any[] = []): StoredDataset {
  const datasetSheets = sheets.map(s => ({
    name: s.sheet_name || 'Sheet1',
    data: Array.isArray(s.sample_data) ? s.sample_data : [],
    columns: Array.isArray(s.schema?.columns) ? s.schema.columns : [],
  }));

  const primaryData =
    datasetSheets.length > 0 && datasetSheets[0].data.length > 0
      ? datasetSheets[0].data
      : Array.isArray(row.metadata?.data)
      ? row.metadata.data
      : [];

  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    fileName: row.file_name,
    fileType: (row.file_type || 'csv').toLowerCase(),
    fileSize: Number(row.file_size) || 0,
    uploadedAt: row.created_at || new Date().toISOString(),
    data: primaryData,
    sheets: datasetSheets.length > 0 ? datasetSheets : undefined,
    activeSheet: datasetSheets.length > 0 ? datasetSheets[0].name : undefined,
    isCleaned: Boolean(row.is_cleaned),
    originalId: row.original_dataset_id || undefined,
  };
}

export async function fetchDatasetsFromSupabase(): Promise<StoredDataset[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data: datasetRows, error } = await client
      .from('datasets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      const parsed = parseSupabaseError(error, 'database');
      appendSupabaseTechLog('DATABASE', 'warning', `Gagal membaca datasets: ${parsed.userMessage}`);
      return [];
    }

    if (!datasetRows || datasetRows.length === 0) {
      return [];
    }

    const { data: sheetsRows } = await client
      .from('dataset_sheets')
      .select('*')
      .order('sheet_index', { ascending: true });

    const sheetsByDataset: Record<string, any[]> = {};
    if (sheetsRows) {
      for (const sheet of sheetsRows) {
        if (!sheetsByDataset[sheet.dataset_id]) {
          sheetsByDataset[sheet.dataset_id] = [];
        }
        sheetsByDataset[sheet.dataset_id].push(sheet);
      }
    }

    return datasetRows.map(row => mapSupabaseRowToDataset(row, sheetsByDataset[row.id] || []));
  } catch (err) {
    const parsed = parseSupabaseError(err, 'database');
    appendSupabaseTechLog('DATABASE', 'error', parsed.userMessage);
    return [];
  }
}

export async function saveDatasetToSupabase(dataset: StoredDataset, explicitUserId?: string): Promise<{ success: boolean; savedId?: string; message?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Supabase Client belum siap.' };

  try {
    const { data: sessionRes } = await client.auth.getSession();
    const authUserId = sessionRes?.session?.user?.id || (explicitUserId && isValidUuid(explicitUserId) ? explicitUserId : null);

    if (!authUserId) {
      return { success: false, message: 'Login Supabase diperlukan untuk menyimpan dataset ke PostgreSQL.' };
    }

    const rowCount = dataset.data?.length || 0;
    const colCount = dataset.data && dataset.data[0] ? Object.keys(dataset.data[0]).length : 0;
    const dbId = isValidUuid(dataset.id) ? dataset.id : undefined;

    const payload: Record<string, any> = {
      user_id: authUserId,
      name: dataset.name,
      description: dataset.description || '',
      file_name: dataset.fileName,
      file_type: dataset.fileType,
      file_size: dataset.fileSize,
      row_count: rowCount,
      col_count: colCount,
      status: 'ready',
      is_cleaned: Boolean(dataset.isCleaned),
      metadata: {
        data: dataset.data,
        activeSheet: dataset.activeSheet,
        localRefId: dataset.id,
      },
    };

    if (dbId) {
      payload.id = dbId;
    }

    const { data: savedRow, error } = await client
      .from('datasets')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      const parsed = parseSupabaseError(error, 'database');
      appendSupabaseTechLog('DATABASE', 'error', `Gagal menyimpan dataset: ${parsed.userMessage}`);
      return { success: false, message: parsed.userMessage };
    }

    const targetId = savedRow?.id || dataset.id;

    if (dataset.sheets && dataset.sheets.length > 0 && isValidUuid(targetId)) {
      await client.from('dataset_sheets').delete().eq('dataset_id', targetId);

      const sheetsPayload = dataset.sheets.map((sheet, idx) => ({
        dataset_id: targetId,
        sheet_name: sheet.name,
        sheet_index: idx,
        row_count: sheet.data.length,
        col_count: sheet.data[0] ? Object.keys(sheet.data[0]).length : 0,
        sample_data: sheet.data,
        schema: { columns: sheet.columns || (sheet.data[0] ? Object.keys(sheet.data[0]) : []) },
      }));

      await client.from('dataset_sheets').insert(sheetsPayload);
    }

    appendSupabaseTechLog('DATABASE', 'success', `Dataset '${dataset.name}' tersimpan di PostgreSQL.`);
    return { success: true, savedId: targetId };
  } catch (err: any) {
    const parsed = parseSupabaseError(err, 'database');
    return { success: false, message: parsed.userMessage };
  }
}

export async function deleteDatasetFromSupabase(datasetId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !isValidUuid(datasetId)) return false;

  try {
    const { data: fileRows } = await client
      .from('dataset_files')
      .select('file_path')
      .eq('dataset_id', datasetId);

    if (Array.isArray(fileRows) && fileRows.length > 0) {
      const paths = fileRows.map((f: any) => f.file_path).filter(Boolean);
      if (paths.length > 0) {
        await client.storage.from(SUPABASE_STORAGE_BUCKET).remove(paths);
      }
    }

    const { error } = await client.from('datasets').delete().eq('id', datasetId);
    if (error) {
      const parsed = parseSupabaseError(error, 'database');
      appendSupabaseTechLog('DATABASE', 'error', `Gagal menghapus dataset: ${parsed.userMessage}`);
      return false;
    }
    appendSupabaseTechLog('DATABASE', 'info', `Dataset (${datasetId}) beserta referensi file dihapus.`);
    return true;
  } catch {
    return false;
  }
}

export async function fetchActivityLogsFromSupabase(): Promise<ActivityLogItem[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) return [];

    return data.map((item, idx) => ({
      id: `${item.id}-${idx}`,
      timestamp: item.created_at,
      userName: item.details?.userName || 'System Operator',
      action: item.action,
      entityType: item.entity_type,
      entityName: item.entity_id || 'Entity',
      details: item.details?.text || undefined,
    }));
  } catch {
    return [];
  }
}

export async function saveActivityLogToSupabase(log: ActivityLogItem, explicitUserId?: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { data: sessionRes } = await client.auth.getSession();
    const authUserId = sessionRes?.session?.user?.id || (explicitUserId && isValidUuid(explicitUserId) ? explicitUserId : null);
    if (!authUserId) return;

    await client.from('activity_logs').insert({
      user_id: authUserId,
      action: log.action,
      entity_type: log.entityType,
      entity_id: log.entityName,
      details: {
        userName: log.userName,
        text: sanitizeSensitiveText(log.details || ''),
      },
    });
  } catch {
    // Non-blocking audit log fallback
  }
}
