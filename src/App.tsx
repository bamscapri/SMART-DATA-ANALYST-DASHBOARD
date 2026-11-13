/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ToastContainer } from './components/common/ToastContainer';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { UploadDataset } from './components/upload/UploadDataset';
import { MyDatasets } from './components/datasets/MyDatasets';
import { DataExplorer } from './components/explorer/DataExplorer';
import { AiDataAnalyst } from './components/ai/AiDataAnalyst';
import { AutomatedInsights } from './components/insights/AutomatedInsights';
import { DataVisualization } from './components/visualization/DataVisualization';
import { ForecastingModule } from './components/forecasting/ForecastingModule';
import { DataCleaningModule } from './components/cleaning/DataCleaningModule';
import { ExecutiveSummaryModule } from './components/summary/ExecutiveSummaryModule';
import { ReportsExportModule } from './components/export/ReportsExportModule';
import { ActivityHistory } from './components/activity/ActivityHistory';
import { UserManagement } from './components/admin/UserManagement';
import { SystemSettings } from './components/settings/SystemSettings';
import { UserProfileView } from './components/profile/UserProfileView';

const MainContent: React.FC = () => {
  const { currentView } = useApp();

  const renderActiveView = () => {
    switch (currentView) {
      case 'overview':
        return <OverviewDashboard />;
      case 'upload':
        return <UploadDataset />;
      case 'datasets':
        return <MyDatasets />;
      case 'explorer':
        return <DataExplorer />;
      case 'ai_analyst':
        return <AiDataAnalyst />;
      case 'insights':
        return <AutomatedInsights />;
      case 'visualization':
        return <DataVisualization />;
      case 'forecasting':
        return <ForecastingModule />;
      case 'cleaning':
        return <DataCleaningModule />;
      case 'summary':
        return <ExecutiveSummaryModule />;
      case 'reports':
        return <ReportsExportModule />;
      case 'activity':
        return <ActivityHistory />;
      case 'users':
        return <UserManagement />;
      case 'settings':
        return <SystemSettings />;
      case 'profile':
        return <UserProfileView />;
      default:
        return <OverviewDashboard />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col antialiased bg-[var(--bg-main)] text-[var(--text-main)] transition-theme">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar />

        {/* Right Main Panel */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-[var(--bg-main)] transition-theme">
            {renderActiveView()}
          </main>
        </div>
      </div>

      {/* Floating System Notifications */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <MainContent />
      </AppProvider>
    </ThemeProvider>
  );
}
