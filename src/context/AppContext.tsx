import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { SEED_DATASETS, StoredDataset } from '../data/seedDatasets';
import { analyzeDataset, DatasetStats } from '../utils/analytics';
import { DEFAULT_ADMIN_PROFILE, DEFAULT_USER_PROFILE, UserProfile } from '../lib/supabase';
import { generateUniqueId } from '../utils/idGenerator';
import { useTheme } from './ThemeContext';
import {
  CANONICAL_SUPABASE_PROJECT_REF,
  CANONICAL_SUPABASE_URL,
  SupabaseConnectionStatus,
  getReconnectDelayMs,
  MAX_RECONNECT_ATTEMPTS,
  isValidUuid,
} from '../lib/supabaseHelpers';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  getSupabaseClient,
  testSupabaseLiveConnection,
  checkSupabaseDatabaseHealth,
  checkSupabaseAuthHealth,
  checkSupabaseStorageHealth,
  fetchDatasetsFromSupabase,
  fetchActivityLogsFromSupabase,
  saveDatasetToSupabase,
  deleteDatasetFromSupabase,
  saveActivityLogToSupabase,
  uploadDatasetFileToStorage,
  fetchOrCreateAuthenticatedProfile,
  signInWithSupabaseEmail,
  signUpWithSupabaseEmail,
  signOutFromSupabase,
  sendSupabasePasswordReset,
  updateSupabaseUserPassword,
  updateAuthenticatedProfile,
  appendSupabaseTechLog,
  getSupabaseTechLogs,
  clearSupabaseTechLogs,
  ConnectionTestResult,
  DatabaseCheckResult,
  AuthCheckResult,
  StorageCheckResult,
  AuthActionResult,
  SupabaseConfig,
  SupabaseTechLogEntry,
} from '../lib/supabaseService';

export type MenuView =
  | 'overview'
  | 'upload'
  | 'datasets'
  | 'explorer'
  | 'ai_analyst'
  | 'insights'
  | 'visualization'
  | 'forecasting'
  | 'cleaning'
  | 'summary'
  | 'reports'
  | 'activity'
  | 'users'
  | 'settings'
  | 'profile';

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  userName: string;
  action: string;
  entityType: string;
  entityName: string;
  details?: string;
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface AppContextType {
  currentView: MenuView;
  setCurrentView: (view: MenuView) => void;
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  switchRole: (role: 'admin' | 'user') => void;
  datasets: StoredDataset[];
  selectedDataset: StoredDataset | null;
  selectedDatasetId: string;
  selectDataset: (id: string) => void;
  activeSheet: string;
  setActiveSheet: (sheetName: string) => void;
  currentStats: DatasetStats;
  addDataset: (dataset: StoredDataset, sourceFile?: File) => void;
  deleteDataset: (id: string) => void;
  saveCleanedDataset: (cleanedData: Record<string, any>[], name: string) => void;
  activityLogs: ActivityLogItem[];
  logActivity: (action: string, entityType: string, entityName: string, details?: string) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  toasts: ToastNotification[];
  addToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
  removeToast: (id: string) => void;
  supabaseConnected: boolean;
  supabaseTablesReady: boolean;
  supabaseConfig: SupabaseConfig;
  supabaseLatency?: number;
  supabaseConnectionStatus: SupabaseConnectionStatus;
  supabaseHealth: ConnectionTestResult | null;
  lastSuccessfulConnection: string | null;
  lastSupabaseError: string | null;
  supabaseTechLogs: SupabaseTechLogEntry[];
  supabaseAuthenticated: boolean;
  isPasswordRecoveryMode: boolean;
  isSyncing: boolean;
  isCheckingHealth: boolean;
  updateSupabaseCredentials: (url: string, key: string) => Promise<ConnectionTestResult>;
  disconnectSupabase: () => void;
  syncWithSupabase: () => Promise<void>;
  runSupabaseConnectionTest: () => Promise<ConnectionTestResult>;
  refreshSupabaseConnection: () => Promise<ConnectionTestResult>;
  checkSupabaseDatabaseOnly: () => Promise<DatabaseCheckResult>;
  checkSupabaseAuthOnly: () => Promise<AuthCheckResult>;
  checkSupabaseStorageOnly: () => Promise<StorageCheckResult>;
  clearTechLogs: () => void;
  loginSupabase: (email: string, password: string) => Promise<AuthActionResult>;
  registerSupabase: (email: string, password: string, fullName: string, company: string) => Promise<AuthActionResult>;
  logoutSupabase: () => Promise<void>;
  forgotPasswordSupabase: (email: string) => Promise<AuthActionResult>;
  resetPasswordSupabase: (newPassword: string) => Promise<AuthActionResult>;
  saveProfileChanges: (fullName: string, company: string) => Promise<{ success: boolean; message: string }>;
  hasGeminiKey: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<MenuView>('overview');
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEFAULT_ADMIN_PROFILE);
  const [supabaseConfig, setSupabaseConfigState] = useState<SupabaseConfig>(() => getSupabaseConfig());
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(false);
  const [supabaseTablesReady, setSupabaseTablesReady] = useState<boolean>(false);
  const [supabaseLatency, setSupabaseLatency] = useState<number | undefined>(undefined);
  const [supabaseConnectionStatus, setSupabaseConnectionStatus] = useState<SupabaseConnectionStatus>(
    () => (getSupabaseConfig().isConfigured ? 'CONNECTING' : 'DISCONNECTED')
  );
  const [supabaseHealth, setSupabaseHealth] = useState<ConnectionTestResult | null>(null);
  const [lastSuccessfulConnection, setLastSuccessfulConnection] = useState<string | null>(null);
  const [lastSupabaseError, setLastSupabaseError] = useState<string | null>(null);
  const [supabaseTechLogs, setSupabaseTechLogs] = useState<SupabaseTechLogEntry[]>(() => getSupabaseTechLogs());
  const [supabaseAuthenticated, setSupabaseAuthenticated] = useState<boolean>(false);
  const [isPasswordRecoveryMode, setIsPasswordRecoveryMode] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(false);

  const reconnectAttemptRef = useRef<number>(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [datasets, setDatasets] = useState<StoredDataset[]>(() => {
    const saved = localStorage.getItem('smart_ai_datasets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return SEED_DATASETS;
      }
    }
    return SEED_DATASETS;
  });

  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(() => {
    return datasets[0]?.id || 'ds_retail_2024';
  });

  const { darkMode, toggleDarkMode } = useTheme();
  const [activeSheet, setActiveSheetState] = useState<string>('Transactions_2024');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(true);

  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([
    {
      id: generateUniqueId('log-init'),
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      userName: 'Director of Analytics',
      action: 'LOAD_DATASET',
      entityType: 'Dataset',
      entityName: 'Nusantara Retail Sales 2024',
      details: 'Loaded 26 sales transactions across 8 provinces',
    },
    {
      id: generateUniqueId('log-init'),
      timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      userName: 'Senior Data Scientist',
      action: 'AI_QUERY',
      entityType: 'AI Analyst',
      entityName: 'Revenue Trend Analysis',
      details: 'Prompted automated correlation on marketing channels',
    },
    {
      id: generateUniqueId('log-init'),
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      userName: 'Director of Analytics',
      action: 'RUN_FORECAST',
      entityType: 'Forecasting',
      entityName: 'Revenue 90-Day Projections',
      details: 'Evaluated Linear Regression with R² = 0.94',
    },
  ]);

  const addToast = useCallback((type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => {
    const id = generateUniqueId('toast');
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const recordTechLog = useCallback(
    (
      category: SupabaseTechLogEntry['category'],
      level: SupabaseTechLogEntry['level'],
      message: string
    ) => {
      appendSupabaseTechLog(category, level, message);
      setSupabaseTechLogs(getSupabaseTechLogs());
    },
    []
  );

  const clearTechLogs = useCallback(() => {
    clearSupabaseTechLogs();
    setSupabaseTechLogs([]);
  }, []);

  const applyHealthResult = useCallback(
    (testResult: ConnectionTestResult) => {
      setSupabaseHealth(testResult);
      setSupabaseConnectionStatus(testResult.connectionStatus);
      setSupabaseConnected(testResult.success);
      setSupabaseTablesReady(testResult.tablesReady);
      setSupabaseLatency(testResult.latencyMs);
      setSupabaseAuthenticated(testResult.authCheck.authenticated);

      if (testResult.success) {
        setLastSuccessfulConnection(new Date().toISOString());
        if (testResult.systemHealth === 'HEALTHY') {
          setLastSupabaseError(null);
        } else if (testResult.systemHealth === 'SETUP_REQUIRED' || testResult.systemHealth === 'DEGRADED') {
          setLastSupabaseError(testResult.message);
        } else {
          setLastSupabaseError(null);
        }
      } else {
        setLastSupabaseError(testResult.message);
      }
    },
    []
  );

  const hydrateAuthenticatedData = useCallback(async () => {
    try {
      const [remoteDatasets, remoteLogs] = await Promise.all([
        fetchDatasetsFromSupabase(),
        fetchActivityLogsFromSupabase(),
      ]);

      if (remoteDatasets && remoteDatasets.length > 0) {
        setDatasets(prev => {
          const remoteIds = new Set(remoteDatasets.map(r => r.id));
          const localOnly = prev.filter(p => !isValidUuid(p.id) && !remoteIds.has(p.id));
          return [...remoteDatasets, ...localOnly];
        });
        setSelectedDatasetId(prev => prev || remoteDatasets[0].id);
      }

      if (remoteLogs && remoteLogs.length > 0) {
        setActivityLogs(remoteLogs);
      }
    } catch {
      recordTechLog('DATABASE', 'warning', 'Sinkronisasi data awal dilewati sambil menunggu tabel siap.');
    }
  }, [recordTechLog]);

  const runSupabaseConnectionTest = useCallback(async (): Promise<ConnectionTestResult> => {
    const cfg = getSupabaseConfig();
    setSupabaseConfigState(cfg);
    setIsCheckingHealth(true);
    setSupabaseConnectionStatus(prev => (prev === 'RECONNECTING' ? 'RECONNECTING' : 'CONNECTING'));

    try {
      const testResult = await testSupabaseLiveConnection(cfg.url, cfg.anonKey);
      applyHealthResult(testResult);

      recordTechLog(
        'HEALTH_CHECK',
        testResult.success ? (testResult.systemHealth === 'HEALTHY' ? 'success' : 'warning') : 'error',
        `[${testResult.connectionStatus}] ${testResult.message}`
      );

      if (testResult.success && testResult.authCheck.authenticated && testResult.tablesReady) {
        await hydrateAuthenticatedData();
      }

      return testResult;
    } finally {
      setIsCheckingHealth(false);
    }
  }, [applyHealthResult, hydrateAuthenticatedData, recordTechLog]);

  const scheduleReconnectRetry = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setSupabaseConnectionStatus('DISCONNECTED');
      setSupabaseConnected(false);
      setLastSupabaseError('Koneksi internet perangkat terputus. Menunggu jaringan kembali online.');
      return;
    }

    if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setSupabaseConnectionStatus('DISCONNECTED');
      recordTechLog(
        'RECOVERY',
        'error',
        `Auto-reconnect mencapai batas maksimum (${MAX_RECONNECT_ATTEMPTS}x). Gunakan tombol Refresh Connection saat siap.`
      );
      return;
    }

    const delayMs = getReconnectDelayMs(reconnectAttemptRef.current);
    reconnectAttemptRef.current += 1;
    setSupabaseConnectionStatus('RECONNECTING');
    recordTechLog(
      'RECOVERY',
      'warning',
      `Menjadwalkan reconnect otomatis percobaan #${reconnectAttemptRef.current}/${MAX_RECONNECT_ATTEMPTS} dalam ${Math.round(delayMs / 1000)}s.`
    );

    reconnectTimerRef.current = setTimeout(async () => {
      const res = await runSupabaseConnectionTest();
      if (res.success) {
        reconnectAttemptRef.current = 0;
        recordTechLog('RECOVERY', 'success', 'Koneksi Supabase berhasil dipulihkan secara otomatis.');
      } else if (res.connectionStatus === 'DISCONNECTED' || res.connectionStatus === 'RECONNECTING') {
        scheduleReconnectRetry();
      }
    }, delayMs);
  }, [recordTechLog, runSupabaseConnectionTest]);

  const refreshSupabaseConnection = useCallback(async (): Promise<ConnectionTestResult> => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptRef.current = 0;
    setSupabaseConnectionStatus('RECONNECTING');
    recordTechLog('CONNECTION', 'info', `Memulai Refresh Connection ke ${CANONICAL_SUPABASE_URL}...`);
    const result = await runSupabaseConnectionTest();
    if (!result.success && result.connectionStatus === 'DISCONNECTED') {
      scheduleReconnectRetry();
    }
    return result;
  }, [recordTechLog, runSupabaseConnectionTest, scheduleReconnectRetry]);

  const checkSupabaseDatabaseOnly = useCallback(async (): Promise<DatabaseCheckResult> => {
    setIsCheckingHealth(true);
    try {
      const dbRes = await checkSupabaseDatabaseHealth();
      setSupabaseTablesReady(dbRes.tablesReady);
      setSupabaseHealth(prev => (prev ? { ...prev, databaseCheck: dbRes, tablesReady: dbRes.tablesReady } : prev));
      if (dbRes.status === 'ERROR') {
        setLastSupabaseError(dbRes.message);
      }
      recordTechLog('DATABASE', dbRes.status === 'OK' ? 'success' : dbRes.status === 'WARNING' ? 'warning' : 'error', dbRes.message);
      return dbRes;
    } finally {
      setIsCheckingHealth(false);
    }
  }, [recordTechLog]);

  const checkSupabaseAuthOnly = useCallback(async (): Promise<AuthCheckResult> => {
    setIsCheckingHealth(true);
    try {
      const authRes = await checkSupabaseAuthHealth();
      setSupabaseAuthenticated(authRes.authenticated);
      setSupabaseHealth(prev => (prev ? { ...prev, authCheck: authRes } : prev));
      recordTechLog('AUTH', authRes.status === 'OK' ? 'success' : authRes.status === 'WARNING' ? 'warning' : 'error', authRes.message);
      return authRes;
    } finally {
      setIsCheckingHealth(false);
    }
  }, [recordTechLog]);

  const checkSupabaseStorageOnly = useCallback(async (): Promise<StorageCheckResult> => {
    setIsCheckingHealth(true);
    try {
      const authRes = await checkSupabaseAuthHealth();
      const storageRes = await checkSupabaseStorageHealth(undefined, authRes.userId);
      setSupabaseHealth(prev => (prev ? { ...prev, storageCheck: storageRes } : prev));
      recordTechLog('STORAGE', storageRes.status === 'OK' ? 'success' : storageRes.status === 'WARNING' ? 'warning' : 'error', storageRes.message);
      return storageRes;
    } finally {
      setIsCheckingHealth(false);
    }
  }, [recordTechLog]);

  // Persist datasets to localStorage
  useEffect(() => {
    localStorage.setItem('smart_ai_datasets', JSON.stringify(datasets));
  }, [datasets]);

  // Initial Supabase connection + Auth state listener + Online/Offline network recovery
  useEffect(() => {
    let mounted = true;
    const client = getSupabaseClient();

    const init = async () => {
      const cfg = getSupabaseConfig();
      setSupabaseConfigState(cfg);

      if (!cfg.isConfigured) {
        setSupabaseConnectionStatus('DISCONNECTED');
        setSupabaseConnected(false);
        setLastSupabaseError(cfg.envValidation.errorMessage);
        recordTechLog('CONNECTION', 'error', cfg.envValidation.errorMessage || 'Environment variables Supabase tidak lengkap.');
        return;
      }

      recordTechLog('CONNECTION', 'info', `Menginisialisasi koneksi Supabase Project ${CANONICAL_SUPABASE_PROJECT_REF}...`);

      if (client) {
        try {
          const { data } = await client.auth.getSession();
          if (mounted && data.session?.user) {
            const prof = await fetchOrCreateAuthenticatedProfile(data.session.user);
            if (mounted) {
              setCurrentUser(prof);
              setSupabaseAuthenticated(true);
            }
          }
        } catch {
          // handled cleanly in runSupabaseConnectionTest
        }
      }

      const res = await runSupabaseConnectionTest();
      if (mounted && !res.success && res.connectionStatus === 'DISCONNECTED') {
        scheduleReconnectRetry();
      }
    };

    init();

    const subscription = client
      ? client.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;
          if (event === 'PASSWORD_RECOVERY') {
            setIsPasswordRecoveryMode(true);
            recordTechLog('AUTH', 'info', 'Mode pemulihan password (PASSWORD_RECOVERY) terdeteksi.');
          }
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session?.user) {
            setSupabaseAuthenticated(true);
            const prof = await fetchOrCreateAuthenticatedProfile(session.user);
            if (mounted) {
              setCurrentUser(prof);
            }
            recordTechLog('AUTH', 'success', `Event Auth '${event}' berhasil diproses untuk ${session.user.email}.`);
            if (event === 'SIGNED_IN') {
              await runSupabaseConnectionTest();
            }
          } else if (event === 'SIGNED_OUT') {
            setSupabaseAuthenticated(false);
            setIsPasswordRecoveryMode(false);
            setCurrentUser(DEFAULT_ADMIN_PROFILE);
            recordTechLog('AUTH', 'info', 'Sesi Supabase Auth berakhir (SIGNED_OUT).');
            await runSupabaseConnectionTest();
          }
        }).data.subscription
      : null;

    const handleOnline = () => {
      if (!mounted) return;
      reconnectAttemptRef.current = 0;
      setSupabaseConnectionStatus('RECONNECTING');
      recordTechLog('RECOVERY', 'info', 'Jaringan perangkat kembali online. Mencoba menghubungkan ulang ke Supabase...');
      runSupabaseConnectionTest();
    };

    const handleOffline = () => {
      if (!mounted) return;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      setSupabaseConnectionStatus('DISCONNECTED');
      setSupabaseConnected(false);
      setLastSupabaseError('Koneksi jaringan browser offline. Perubahan tetap aman di penyimpanan lokal.');
      recordTechLog('RECOVERY', 'error', 'Jaringan browser offline. Koneksi Supabase beralih ke DISCONNECTED.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [recordTechLog, runSupabaseConnectionTest, scheduleReconnectRetry]);

  // Check health / gemini key on mount
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setHasGeminiKey(Boolean(data.hasGeminiKey));
      })
      .catch(() => {
        setHasGeminiKey(false);
      });
  }, []);

  const selectedDataset = datasets.find(d => d.id === selectedDatasetId) || datasets[0] || null;

  const setActiveSheet = (sheetName: string) => {
    setActiveSheetState(sheetName);
    if (selectedDataset && selectedDataset.sheets) {
      const targetSheet = selectedDataset.sheets.find(s => s.name === sheetName);
      if (targetSheet) {
        selectedDataset.data = targetSheet.data;
        selectedDataset.activeSheet = sheetName;
        setDatasets([...datasets]);
      }
    }
  };

  const selectDataset = (id: string) => {
    setSelectedDatasetId(id);
    const target = datasets.find(d => d.id === id);
    if (target && target.sheets && target.sheets.length > 0) {
      setActiveSheetState(target.sheets[0].name);
      target.data = target.sheets[0].data;
    }
    logActivity('SWITCH_DATASET', 'Dataset', target?.name || id);
  };

  const currentStats: DatasetStats = React.useMemo(() => {
    if (!selectedDataset || !selectedDataset.data) {
      return analyzeDataset([]);
    }
    return analyzeDataset(selectedDataset.data);
  }, [selectedDataset, selectedDataset?.data]);

  const logActivity = (action: string, entityType: string, entityName: string, details?: string) => {
    const newLog: ActivityLogItem = {
      id: generateUniqueId('log'),
      timestamp: new Date().toISOString(),
      userName: currentUser.fullName,
      action,
      entityType,
      entityName,
      details,
    };
    setActivityLogs(prev => [newLog, ...prev]);

    if (supabaseConnected && supabaseTablesReady && supabaseAuthenticated) {
      saveActivityLogToSupabase(newLog, currentUser.id).catch(() => {});
    }
  };

  const addDataset = (newDs: StoredDataset, sourceFile?: File) => {
    setDatasets(prev => [newDs, ...prev]);
    setSelectedDatasetId(newDs.id);
    logActivity('UPLOAD_FILE', 'Dataset', newDs.name, `Format: ${newDs.fileType.toUpperCase()}`);
    addToast('success', 'Dataset Berhasil Diunggah', `${newDs.name} telah diproses dan siap dianalisis.`);

    if (supabaseConnected && supabaseAuthenticated) {
      const handleRemotePersist = async () => {
        let targetDatasetId = newDs.id;

        if (supabaseTablesReady) {
          const saveRes = await saveDatasetToSupabase(newDs, currentUser.id);
          if (saveRes.success && saveRes.savedId) {
            targetDatasetId = saveRes.savedId;
            if (saveRes.savedId !== newDs.id) {
              setDatasets(prev =>
                prev.map(d => (d.id === newDs.id ? { ...d, id: saveRes.savedId! } : d))
              );
              setSelectedDatasetId(prev => (prev === newDs.id ? saveRes.savedId! : prev));
            }
            addToast('info', 'Tersinkronisasi ke Cloud Supabase', `${newDs.name} tersimpan di PostgreSQL.`);
          } else if (saveRes.message) {
            recordTechLog('DATABASE', 'warning', `Dataset tersimpan lokal: ${saveRes.message}`);
          }
        }

        if (sourceFile) {
          const uploadRes = await uploadDatasetFileToStorage(sourceFile, targetDatasetId);
          setSupabaseTechLogs(getSupabaseTechLogs());
          if (!uploadRes.success) {
            recordTechLog('STORAGE', 'warning', `Upload Storage: ${uploadRes.message}`);
          }
        }
      };

      handleRemotePersist().catch(() => {});
    }
  };

  const deleteDataset = (id: string) => {
    const target = datasets.find(d => d.id === id);
    setDatasets(prev => prev.filter(d => d.id !== id));
    if (selectedDatasetId === id) {
      const remaining = datasets.filter(d => d.id !== id);
      if (remaining.length > 0) setSelectedDatasetId(remaining[0].id);
    }
    logActivity('DELETE_DATASET', 'Dataset', target?.name || id);
    addToast('info', 'Dataset Dihapus', `Dataset telah dihapus.`);

    if (supabaseConnected && supabaseTablesReady && supabaseAuthenticated && isValidUuid(id)) {
      deleteDatasetFromSupabase(id).catch(() => {});
    }
  };

  const saveCleanedDataset = (cleanedData: Record<string, any>[], name: string) => {
    const newDs: StoredDataset = {
      id: generateUniqueId('ds_clean'),
      name: `${name} (Cleaned)`,
      description: `Versi data yang telah dibersihkan dan dinormalisasi dari ${selectedDataset?.name || 'asli'}.`,
      fileName: `cleaned_${selectedDataset?.fileName || 'dataset.csv'}`,
      fileType: selectedDataset?.fileType || 'csv',
      fileSize: Math.round((selectedDataset?.fileSize || 50000) * 0.95),
      uploadedAt: new Date().toISOString(),
      data: cleanedData,
      isCleaned: true,
      originalId: selectedDataset?.id,
    };
    addDataset(newDs);
    addToast('success', 'Data Hasil Pembersihan Disimpan', 'Dataset bersih baru telah dibuat terpisah dari data asli.');
  };

  const switchRole = (role: 'admin' | 'user') => {
    if (supabaseAuthenticated) {
      addToast(
        'warning',
        'Role Dikontrol oleh Database Supabase',
        `Anda login sebagai ${currentUser.email} dengan role ${currentUser.role.toUpperCase()} dari tabel public.profiles.`
      );
      return;
    }

    if (role === 'admin') {
      setCurrentUser(DEFAULT_ADMIN_PROFILE);
      addToast('info', 'Mode Admin Aktif (Preview)', 'Akses penuh ke User Management dan Konfigurasi Sistem.');
    } else {
      setCurrentUser(DEFAULT_USER_PROFILE);
      addToast('info', 'Mode User Aktif (Preview)', 'Akses analisis data mandiri.');
    }
  };

  const updateSupabaseCredentials = async (url: string, key: string): Promise<ConnectionTestResult> => {
    setIsSyncing(true);
    try {
      const normalizedUrl = url.trim().replace(/\/+$/, '');
      if (normalizedUrl.toLowerCase() !== CANONICAL_SUPABASE_URL.toLowerCase()) {
        const mismatchMsg = `URL Project ditolak. Aplikasi terkunci ke ${CANONICAL_SUPABASE_URL} (${CANONICAL_SUPABASE_PROJECT_REF}).`;
        addToast('error', 'Project Supabase Tidak Sesuai', mismatchMsg);
        return await testSupabaseLiveConnection();
      }

      const testRes = await testSupabaseLiveConnection(normalizedUrl, key.trim());
      if (testRes.success) {
        saveSupabaseConfig(normalizedUrl, key.trim());
        const newCfg = getSupabaseConfig();
        setSupabaseConfigState(newCfg);
        applyHealthResult(testRes);
        recordTechLog('CONNECTION', 'success', 'Kredensial anon key berhasil diverifikasi dan diterapkan.');

        if (testRes.tablesReady && testRes.authCheck.authenticated) {
          await hydrateAuthenticatedData();
        }

        addToast('success', 'Supabase Terhubung', testRes.message);
      } else {
        setLastSupabaseError(testRes.message);
        recordTechLog('CONNECTION', 'error', testRes.message);
        addToast('error', 'Koneksi Supabase Gagal', testRes.message);
      }
      return testRes;
    } catch (err: any) {
      addToast('error', 'Gagal Memperbarui Kredensial', err?.message || 'Input tidak valid');
      return await runSupabaseConnectionTest();
    } finally {
      setIsSyncing(false);
    }
  };

  const disconnectSupabase = () => {
    clearSupabaseConfig();
    const newCfg = getSupabaseConfig();
    setSupabaseConfigState(newCfg);
    setSupabaseConnected(false);
    setSupabaseTablesReady(false);
    setSupabaseLatency(undefined);
    setSupabaseConnectionStatus(newCfg.isConfigured ? 'CONNECTING' : 'DISCONNECTED');
    recordTechLog('CONNECTION', 'info', 'Override kredensial lokal dihapus; kembali ke konfigurasi environment.');
    if (newCfg.isConfigured) {
      runSupabaseConnectionTest();
    } else {
      addToast('info', 'Supabase Disconnect', 'Aplikasi beralih ke local storage persistence.');
    }
  };

  const syncWithSupabase = async () => {
    if (!supabaseConnected) {
      addToast('warning', 'Supabase Belum Terhubung', 'Periksa status koneksi di System Settings.');
      return;
    }

    if (!supabaseTablesReady) {
      addToast('warning', 'Skema Tabel Belum Lengkap', 'Salin dan eksekusi SQL Migration di SQL Editor Supabase terlebih dahulu.');
      return;
    }

    if (!supabaseAuthenticated) {
      addToast('warning', 'Login Supabase Diperlukan', 'Silakan login dengan akun Supabase Auth di System Settings untuk menyinkronkan data RLS.');
      return;
    }

    setIsSyncing(true);
    try {
      const remote = await fetchDatasetsFromSupabase();
      if (remote && remote.length > 0) {
        setDatasets(remote);
        if (!remote.some(d => d.id === selectedDatasetId)) {
          setSelectedDatasetId(remote[0].id);
        }
        addToast('success', 'Sinkronisasi Berhasil', `Memuat ${remote.length} dataset dari Supabase Cloud.`);
      } else {
        let savedCount = 0;
        for (const ds of datasets) {
          const res = await saveDatasetToSupabase(ds, currentUser.id);
          if (res.success) savedCount++;
        }
        addToast('success', 'Data Diunggah ke Supabase', `${savedCount} dataset lokal telah disimpan ke PostgreSQL.`);
      }
    } catch (err: any) {
      addToast('error', 'Gagal Sinkronisasi Supabase', err?.message || 'Network error');
    } finally {
      setIsSyncing(false);
      setSupabaseTechLogs(getSupabaseTechLogs());
    }
  };

  const loginSupabase = async (email: string, password: string): Promise<AuthActionResult> => {
    const res = await signInWithSupabaseEmail(email, password);
    setSupabaseTechLogs(getSupabaseTechLogs());
    if (res.success && res.profile) {
      setCurrentUser(res.profile);
      setSupabaseAuthenticated(true);
      addToast('success', 'Login Supabase Berhasil', `Selamat datang kembali, ${res.profile.fullName}.`);
      await runSupabaseConnectionTest();
    } else {
      setLastSupabaseError(res.message);
      addToast('error', 'Login Gagal', res.message);
    }
    return res;
  };

  const registerSupabase = async (
    email: string,
    password: string,
    fullName: string,
    company: string
  ): Promise<AuthActionResult> => {
    const res = await signUpWithSupabaseEmail(email, password, fullName, company);
    setSupabaseTechLogs(getSupabaseTechLogs());
    if (res.success) {
      if (res.profile && res.session) {
        setCurrentUser(res.profile);
        setSupabaseAuthenticated(true);
        await runSupabaseConnectionTest();
      }
      addToast(
        res.requiresEmailConfirmation ? 'info' : 'success',
        res.requiresEmailConfirmation ? 'Verifikasi Email Diperlukan' : 'Akun Terdaftar & Aktif',
        res.message
      );
    } else {
      setLastSupabaseError(res.message);
      addToast('error', 'Registrasi Gagal', res.message);
    }
    return res;
  };

  const logoutSupabase = async (): Promise<void> => {
    const res = await signOutFromSupabase();
    setSupabaseTechLogs(getSupabaseTechLogs());
    if (res.success) {
      setSupabaseAuthenticated(false);
      setIsPasswordRecoveryMode(false);
      setCurrentUser(DEFAULT_ADMIN_PROFILE);
      addToast('info', 'Logout Berhasil', res.message);
      await runSupabaseConnectionTest();
    } else {
      addToast('error', 'Logout Gagal', res.message);
    }
  };

  const forgotPasswordSupabase = async (email: string): Promise<AuthActionResult> => {
    const res = await sendSupabasePasswordReset(email);
    setSupabaseTechLogs(getSupabaseTechLogs());
    if (res.success) {
      addToast('success', 'Email Reset Terkirim', res.message);
    } else {
      addToast('error', 'Gagal Mengirim Reset Password', res.message);
    }
    return res;
  };

  const resetPasswordSupabase = async (newPassword: string): Promise<AuthActionResult> => {
    const res = await updateSupabaseUserPassword(newPassword);
    setSupabaseTechLogs(getSupabaseTechLogs());
    if (res.success) {
      setIsPasswordRecoveryMode(false);
      addToast('success', 'Password Diperbarui', res.message);
    } else {
      addToast('error', 'Gagal Memperbarui Password', res.message);
    }
    return res;
  };

  const saveProfileChanges = async (fullName: string, company: string): Promise<{ success: boolean; message: string }> => {
    setCurrentUser(prev => ({ ...prev, fullName, company }));
    if (supabaseAuthenticated && isValidUuid(currentUser.id)) {
      const res = await updateAuthenticatedProfile(currentUser.id, fullName, company);
      setSupabaseTechLogs(getSupabaseTechLogs());
      addToast(res.success ? 'success' : 'warning', res.success ? 'Profil Disinkronkan ke Supabase' : 'Tersimpan Lokal', res.message);
      return res;
    }
    addToast('success', 'Profil Berhasil Diperbarui', 'Perubahan identitas telah disimpan pada sesi lokal.');
    return { success: true, message: 'Perubahan tersimpan di sesi lokal.' };
  };

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        currentUser,
        setCurrentUser,
        switchRole,
        datasets,
        selectedDataset,
        selectedDatasetId,
        selectDataset,
        activeSheet,
        setActiveSheet,
        currentStats,
        addDataset,
        deleteDataset,
        saveCleanedDataset,
        activityLogs,
        logActivity,
        darkMode,
        toggleDarkMode,
        mobileMenuOpen,
        setMobileMenuOpen,
        toggleMobileMenu: () => setMobileMenuOpen(prev => !prev),
        toasts,
        addToast,
        removeToast,
        supabaseConnected,
        supabaseTablesReady,
        supabaseConfig,
        supabaseLatency,
        supabaseConnectionStatus,
        supabaseHealth,
        lastSuccessfulConnection,
        lastSupabaseError,
        supabaseTechLogs,
        supabaseAuthenticated,
        isPasswordRecoveryMode,
        isSyncing,
        isCheckingHealth,
        updateSupabaseCredentials,
        disconnectSupabase,
        syncWithSupabase,
        runSupabaseConnectionTest,
        refreshSupabaseConnection,
        checkSupabaseDatabaseOnly,
        checkSupabaseAuthOnly,
        checkSupabaseStorageOnly,
        clearTechLogs,
        loginSupabase,
        registerSupabase,
        logoutSupabase,
        forgotPasswordSupabase,
        resetPasswordSupabase,
        saveProfileChanges,
        hasGeminiKey,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
