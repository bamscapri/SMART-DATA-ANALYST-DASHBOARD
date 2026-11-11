import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StoredDataset } from '../data/seedDatasets';
import { ActivityLogItem } from '../context/AppContext';
import { generateUniqueId } from '../utils/idGenerator';

const STORAGE_KEY_URL = 'smart_ai_supabase_url';
const STORAGE_KEY_KEY = 'smart_ai_supabase_key';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

/**
 * Returns current Supabase configuration from localStorage or Vite environment variables.
 */
export function getSupabaseConfig(): SupabaseConfig {
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) : null;

  const envUrl = import.meta.env?.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

  const url = (localUrl || envUrl || '').trim();
  const anonKey = (localKey || envKey || '').trim();

  const isConfigured = Boolean(
    url &&
    anonKey &&
    url.startsWith('https://') &&
    !url.includes('placeholder') &&
    !url.includes('your-project')
  );

  return { url, anonKey, isConfigured };
}

/**
 * Saves custom Supabase credentials to localStorage.
 */
export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  }
}

/**
 * Clears custom Supabase credentials from localStorage.
 */
export function clearSupabaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
  }
}

let cachedClient: SupabaseClient | null = null;
let lastClientKey = '';

/**
 * Obtains an initialized Supabase Client.
 */
export function getSupabaseClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const config = getSupabaseConfig();
  const url = customUrl || config.url;
  const key = customKey || config.anonKey;

  if (!url || !key || !url.startsWith('https://')) {
    return null;
  }

  const clientKey = `${url}:${key}`;
  if (cachedClient && lastClientKey === clientKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    lastClientKey = clientKey;
    return cachedClient;
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
}

export interface ConnectionTestResult {
  success: boolean;
  tablesReady: boolean;
  message: string;
  latencyMs: number;
  datasetCount?: number;
}

/**
 * Performs a live ping and diagnostic test against Supabase PostgreSQL.
 */
export async function testSupabaseLiveConnection(customUrl?: string, customKey?: string): Promise<ConnectionTestResult> {
  const startTime = performance.now();
  const client = getSupabaseClient(customUrl, customKey);

  if (!client) {
    return {
      success: false,
      tablesReady: false,
      message: 'Kredensial URL atau Anon Key Supabase belum lengkap atau tidak valid.',
      latencyMs: 0,
    };
  }

  try {
    // 1. Verify project connectivity and API key validity via auth service
    const { error: authError } = await client.auth.getSession();
    const latencyMs = Math.round(performance.now() - startTime);

    if (authError && authError.status && authError.status >= 400 && authError.status !== 404) {
      return {
        success: false,
        tablesReady: false,
        message: `Kredensial Supabase ditolak: ${authError.message}`,
        latencyMs,
      };
    }

    // 2. Check if datasets table is created in PostgreSQL schema cache
    const { count, error: tableError } = await client
      .from('datasets')
      .select('*', { count: 'exact', head: true });

    if (tableError) {
      const isTableMissing =
        tableError.code === '42P01' ||
        tableError.code === 'PGRST205' ||
        tableError.code === 'PGRST200' ||
        tableError.message?.toLowerCase().includes('could not find the table') ||
        tableError.message?.toLowerCase().includes('does not exist');

      if (isTableMissing) {
        return {
          success: true,
          tablesReady: false,
          message: `Koneksi Supabase aktif (${latencyMs}ms), namun tabel 'public.datasets' belum dibuat. Salin dan jalankan SQL Migration di dashboard Supabase.`,
          latencyMs,
          datasetCount: 0,
        };
      }

      return {
        success: false,
        tablesReady: false,
        message: `Supabase error: ${tableError.message} (Kode: ${tableError.code})`,
        latencyMs,
      };
    }

    return {
      success: true,
      tablesReady: true,
      message: `Koneksi PostgreSQL Supabase aktif & tabel terverifikasi (${latencyMs}ms). Terdeteksi ${count || 0} dataset tersimpan.`,
      latencyMs,
      datasetCount: count || 0,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      tablesReady: false,
      message: `Gagal menghubungi Supabase: ${err.message || 'Network timeout'}`,
      latencyMs,
    };
  }
}

/**
 * Transforms a Supabase dataset row + sheets into StoredDataset.
 */
export function mapSupabaseRowToDataset(row: any, sheets: any[] = []): StoredDataset {
  const datasetSheets = sheets.map(s => ({
    name: s.sheet_name || 'Sheet1',
    data: Array.isArray(s.sample_data) ? s.sample_data : [],
    columns: Array.isArray(s.schema?.columns) ? s.schema.columns : []
  }));

  const primaryData = datasetSheets.length > 0 && datasetSheets[0].data.length > 0
    ? datasetSheets[0].data
    : (Array.isArray(row.metadata?.data) ? row.metadata.data : []);

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

/**
 * Fetches all datasets from Supabase PostgreSQL.
 */
export async function fetchDatasetsFromSupabase(): Promise<StoredDataset[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data: datasetRows, error } = await client
      .from('datasets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !datasetRows || datasetRows.length === 0) {
      return [];
    }

    // Fetch associated sheets
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
    console.warn('Failed to fetch datasets from Supabase:', err);
    return [];
  }
}

/**
 * Saves or updates a single dataset in Supabase PostgreSQL.
 */
export async function saveDatasetToSupabase(dataset: StoredDataset, userId: string = '00000000-0000-0000-0000-000000000001'): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const rowCount = dataset.data?.length || 0;
    const colCount = dataset.data && dataset.data[0] ? Object.keys(dataset.data[0]).length : 0;

    // Normalize UUID
    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(dataset.id);
    const dbId = isValidUuid ? dataset.id : undefined;

    const payload: any = {
      user_id: userId,
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
        activeSheet: dataset.activeSheet
      }
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
      console.warn('Supabase upsert dataset error:', error.message);
      return false;
    }

    const targetId = savedRow?.id || dataset.id;

    // Save sheets if available
    if (dataset.sheets && dataset.sheets.length > 0) {
      // Clear previous sheets
      await client.from('dataset_sheets').delete().eq('dataset_id', targetId);

      const sheetsPayload = dataset.sheets.map((sheet, idx) => ({
        dataset_id: targetId,
        sheet_name: sheet.name,
        sheet_index: idx,
        row_count: sheet.data.length,
        col_count: sheet.data[0] ? Object.keys(sheet.data[0]).length : 0,
        sample_data: sheet.data,
        schema: { columns: sheet.columns || (sheet.data[0] ? Object.keys(sheet.data[0]) : []) }
      }));

      await client.from('dataset_sheets').insert(sheetsPayload);
    }

    return true;
  } catch (err) {
    console.warn('Failed to save dataset to Supabase:', err);
    return false;
  }
}

/**
 * Deletes a dataset from Supabase PostgreSQL.
 */
export async function deleteDatasetFromSupabase(datasetId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('datasets')
      .delete()
      .eq('id', datasetId);

    return !error;
  } catch (err) {
    console.warn('Failed to delete dataset from Supabase:', err);
    return false;
  }
}

/**
 * Fetches recent activity logs from Supabase PostgreSQL.
 */
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
  } catch (err) {
    console.warn('Failed to fetch activity logs from Supabase:', err);
    return [];
  }
}

/**
 * Persists an activity log item to Supabase PostgreSQL.
 */
export async function saveActivityLogToSupabase(log: ActivityLogItem, userId?: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    await client.from('activity_logs').insert({
      user_id: userId || null,
      action: log.action,
      entity_type: log.entityType,
      entity_id: log.entityName,
      details: {
        userName: log.userName,
        text: log.details,
      },
    });
  } catch (err) {
    console.warn('Failed to log activity to Supabase:', err);
  }
}
