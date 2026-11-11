import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SEED_DATASETS, StoredDataset } from '../data/seedDatasets';
import { analyzeDataset, DatasetStats } from '../utils/analytics';
import { DEFAULT_ADMIN_PROFILE, DEFAULT_USER_PROFILE, UserProfile } from '../lib/supabase';
import { generateUniqueId } from '../utils/idGenerator';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseLiveConnection,
  fetchDatasetsFromSupabase,
  saveDatasetToSupabase,
  deleteDatasetFromSupabase,
  saveActivityLogToSupabase,
  ConnectionTestResult,
  SupabaseConfig
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
  addDataset: (dataset: StoredDataset) => void;
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
  isSyncing: boolean;
  updateSupabaseCredentials: (url: string, key: string) => Promise<ConnectionTestResult>;
  disconnectSupabase: () => void;
  syncWithSupabase: () => Promise<void>;
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
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [datasets, setDatasets] = useState<StoredDataset[]>(() => {
    const saved = localStorage.getItem('smart_ai_datasets');
    if (saved) {
      try { return JSON.parse(saved); } catch { return SEED_DATASETS; }
    }
    return SEED_DATASETS;
  });

  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(() => {
    return datasets[0]?.id || 'ds_retail_2024';
  });

  const [activeSheet, setActiveSheetState] = useState<string>('Transactions_2024');
  const [darkMode, setDarkMode] = useState<boolean>(true);
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
      details: 'Loaded 26 sales transactions across 8 provinces'
    },
    {
      id: generateUniqueId('log-init'),
      timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      userName: 'Senior Data Scientist',
      action: 'AI_QUERY',
      entityType: 'AI Analyst',
      entityName: 'Revenue Trend Analysis',
      details: 'Prompted automated correlation on marketing channels'
    },
    {
      id: generateUniqueId('log-init'),
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      userName: 'Director of Analytics',
      action: 'RUN_FORECAST',
      entityType: 'Forecasting',
      entityName: 'Revenue 90-Day Projections',
      details: 'Evaluated Linear Regression with R² = 0.94'
    }
  ]);

  // Persist datasets to localStorage
  useEffect(() => {
    localStorage.setItem('smart_ai_datasets', JSON.stringify(datasets));
  }, [datasets]);

  // Initial Supabase connection check and hydration
  useEffect(() => {
    const initSupabase = async () => {
      const cfg = getSupabaseConfig();
      setSupabaseConfigState(cfg);
      if (!cfg.isConfigured) {
        setSupabaseConnected(false);
        return;
      }

      const testResult = await testSupabaseLiveConnection(cfg.url, cfg.anonKey);
      setSupabaseConnected(testResult.success);
      setSupabaseTablesReady(testResult.tablesReady);
      setSupabaseLatency(testResult.latencyMs);

      if (testResult.success && testResult.tablesReady) {
        // Hydrate from Supabase only if tables have been created
        try {
          const remoteDatasets = await fetchDatasetsFromSupabase();
          if (remoteDatasets && remoteDatasets.length > 0) {
            setDatasets(remoteDatasets);
            setSelectedDatasetId(remoteDatasets[0].id);
          } else {
            // Seed default datasets to remote Supabase
            for (const ds of SEED_DATASETS) {
              await saveDatasetToSupabase(ds);
            }
          }
        } catch (err) {
          console.warn('Initial Supabase hydration note:', err);
        }
      }
    };

    initSupabase();
  }, []);

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

  // Active sheet handler
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

  // Compute stats on active data
  const currentStats: DatasetStats = React.useMemo(() => {
    if (!selectedDataset || !selectedDataset.data) {
      return analyzeDataset([]);
    }
    return analyzeDataset(selectedDataset.data);
  }, [selectedDataset, selectedDataset?.data]);

  const addToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => {
    const id = generateUniqueId('toast');
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const logActivity = (action: string, entityType: string, entityName: string, details?: string) => {
    const newLog: ActivityLogItem = {
      id: generateUniqueId('log'),
      timestamp: new Date().toISOString(),
      userName: currentUser.fullName,
      action,
      entityType,
      entityName,
      details
    };
    setActivityLogs(prev => [newLog, ...prev]);

    // Async persist to Supabase if connected and tables are ready
    if (supabaseConnected && supabaseTablesReady) {
      saveActivityLogToSupabase(newLog, currentUser.id).catch(() => {});
    }
  };

  const addDataset = (newDs: StoredDataset) => {
    setDatasets(prev => [newDs, ...prev]);
    setSelectedDatasetId(newDs.id);
    logActivity('UPLOAD_FILE', 'Dataset', newDs.name, `Format: ${newDs.fileType.toUpperCase()}`);
    addToast('success', 'Dataset Berhasil Diunggah', `${newDs.name} telah diproses dan siap dianalisis.`);

    // Persist to Supabase in background
    if (supabaseConnected && supabaseTablesReady) {
      saveDatasetToSupabase(newDs, currentUser.id).then(success => {
        if (success) {
          addToast('info', 'Tersinkronisasi ke Cloud Supabase', `${newDs.name} tersimpan di PostgreSQL.`);
        }
      }).catch(err => {
        console.warn('Background Supabase save note:', err);
      });
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

    // Delete from Supabase in background
    if (supabaseConnected && supabaseTablesReady) {
      deleteDatasetFromSupabase(id).catch(err => {
        console.warn('Background Supabase delete note:', err);
      });
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
      originalId: selectedDataset?.id
    };
    addDataset(newDs);
    addToast('success', 'Data Hasil Pembersihan Disimpan', 'Dataset bersih baru telah dibuat terpisah dari data asli.');
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const switchRole = (role: 'admin' | 'user') => {
    if (role === 'admin') {
      setCurrentUser(DEFAULT_ADMIN_PROFILE);
      addToast('info', 'Mode Admin Aktif', 'Akses penuh ke User Management dan Konfigurasi Sistem.');
    } else {
      setCurrentUser(DEFAULT_USER_PROFILE);
      addToast('info', 'Mode User Aktif', 'Akses analisis data mandiri.');
    }
  };

  const updateSupabaseCredentials = async (url: string, key: string): Promise<ConnectionTestResult> => {
    setIsSyncing(true);
    const testRes = await testSupabaseLiveConnection(url, key);
    if (testRes.success) {
      saveSupabaseConfig(url, key);
      const newCfg = getSupabaseConfig();
      setSupabaseConfigState(newCfg);
      setSupabaseConnected(true);
      setSupabaseTablesReady(testRes.tablesReady);
      setSupabaseLatency(testRes.latencyMs);

      // Hydrate remote datasets only if tables are ready
      if (testRes.tablesReady) {
        try {
          const remoteData = await fetchDatasetsFromSupabase();
          if (remoteData && remoteData.length > 0) {
            setDatasets(remoteData);
            setSelectedDatasetId(remoteData[0].id);
          } else {
            for (const ds of datasets) {
              await saveDatasetToSupabase(ds, currentUser.id);
            }
          }
        } catch (err) {
          console.warn('Supabase post-connection sync note:', err);
        }
      }

      addToast('success', 'Supabase Terhubung', testRes.message);
    } else {
      addToast('error', 'Koneksi Supabase Gagal', testRes.message);
    }
    setIsSyncing(false);
    return testRes;
  };

  const disconnectSupabase = () => {
    clearSupabaseConfig();
    const newCfg = getSupabaseConfig();
    setSupabaseConfigState(newCfg);
    setSupabaseConnected(false);
    setSupabaseTablesReady(false);
    setSupabaseLatency(undefined);
    addToast('info', 'Supabase Disconnect', 'Aplikasi beralih ke local storage persistence.');
  };

  const syncWithSupabase = async () => {
    if (!supabaseConnected) {
      addToast('warning', 'Supabase Belum Terhubung', 'Konfigurasikan URL dan Anon Key di System Settings.');
      return;
    }

    if (!supabaseTablesReady) {
      addToast('warning', 'Skema Tabel Belum Dibuat', 'Salin dan eksekusi SQL Migration di dashboard Supabase terlebih dahulu.');
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Fetch remote datasets
      const remote = await fetchDatasetsFromSupabase();
      if (remote && remote.length > 0) {
        setDatasets(remote);
        if (!remote.some(d => d.id === selectedDatasetId)) {
          setSelectedDatasetId(remote[0].id);
        }
        addToast('success', 'Sinkronisasi Berhasil', `Memuat ${remote.length} dataset dari Supabase Cloud.`);
      } else {
        // Upload local datasets to Supabase
        for (const ds of datasets) {
          await saveDatasetToSupabase(ds, currentUser.id);
        }
        addToast('success', 'Data Diunggah ke Supabase', `${datasets.length} dataset lokal telah disimpan ke PostgreSQL.`);
      }
    } catch (err: any) {
      addToast('error', 'Gagal Sinkronisasi Supabase', err.message || 'Network error');
    } finally {
      setIsSyncing(false);
    }
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
        isSyncing,
        updateSupabaseCredentials,
        disconnectSupabase,
        syncWithSupabase,
        hasGeminiKey
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
