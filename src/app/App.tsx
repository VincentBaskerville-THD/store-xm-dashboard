import React, { useEffect, useState } from 'react';
import { PortfolioOverview } from './components/PortfolioOverview';
import { AppDetail } from './components/AppDetail';
import { AppDetailEnhanced } from './components/AppDetailEnhanced';
import { JourneyDetail } from './components/JourneyDetail';
import { JourneyDetailEnhanced } from './components/JourneyDetailEnhanced';
import { AllAppsOverTime } from './components/AllAppsOverTime';
import { AllJourneysView } from './components/AllJourneysView';
import { TimeSeriesView } from './components/TimeSeriesView';
import { AllAppsTimeGrid } from './components/AllAppsTimeGrid';
import { TopPains } from './components/TopPains';
import { ManageThemes } from './components/ManageThemes';
import { ManageTopPains } from './components/ManageTopPains';
import { ManageJourneys } from './components/ManageJourneys';
import { ManageApps } from './components/ManageApps';
import { ManageSettings } from './components/ManageSettings';
import { ManageFeatureFlags } from './components/ManageFeatureFlags';
import { ExportReport } from './components/ExportReport';
import { AdminPasswordDialog } from './components/AdminPasswordDialog';
import { DashboardPasswordDialog } from './components/DashboardPasswordDialog';
import { supabase } from './lib/supabaseClient';
import type { TimePeriodData } from './components/TimeSelector';

export type ViewType =
  | 'portfolio'
  | 'app-detail'
  | 'app-detail-enhanced'
  | 'journey-detail'
  | 'journey-detail-enhanced'
  | 'all-apps'
  | 'all-journeys'
  | 'time-series'
  | 'apps-time-grid-executive'
  | 'apps-time-grid-practitioner'
  | 'top-pains'
  | 'admin-manage-themes'
  | 'admin-manage-top-pains'
  | 'admin-manage-journeys'
  | 'admin-manage-apps'
  | 'admin-feature-flags'
  | 'admin-settings'
  | 'export-report';
export type TimePeriod = 'November 2025' | 'October 2025' | 'Q4 2025' | 'Q3 2025' | '2025' | '2024';

export interface AppData {
  id: string;
  name: string;
  overallScore: number;
  scoreMoM: number;
  easeOfUse: number;
  usefulness: number;
  responses: number;
  trend: 'up' | 'down' | 'stable';
  metricsSystem: 'pendo' | 'medallia';
  isKTLO?: boolean;
  noUX?: boolean;
}

export interface JourneyData {
  id: string;
  name: string;
  description?: string;
  overallScore: number;
  touchpoints: number;
  appsInvolved: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  trendPercentage: number;
}

interface NavigationState {
  view: ViewType;
  selectedApp?: string | null;
  selectedJourney?: string | null;
}

interface FeatureFlags {
  keyJourneysEnabled: boolean;
  topPainsEnabled: boolean;
}

interface AppSettings {
  adminAuthEnabled: boolean;
  adminShowButton: boolean;
  adminPassword: string;
  dashboardAuthEnabled: boolean;
  dashboardPassword: string;
  keyJourneysEnabled: boolean;
  topPainsEnabled: boolean;
}

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('portfolio');
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [selectedJourney, setSelectedJourney] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState(() => localStorage.getItem('adminPassword') ?? 'happyness');
  const [adminAuthEnabled, setAdminAuthEnabled] = useState(() => (localStorage.getItem('adminAuthEnabled') ?? 'true') !== 'false');
  const [adminShowButton, setAdminShowButton] = useState(() => (localStorage.getItem('adminShowButton') ?? 'true') !== 'false');
  const [adminAuthenticated, setAdminAuthenticated] = useState(() => sessionStorage.getItem('adminAuthed') === 'true');
  const [dashboardPassword, setDashboardPassword] = useState(() => localStorage.getItem('dashboardPassword') ?? 'hammertime');
  const [dashboardAuthEnabled, setDashboardAuthEnabled] = useState(() => (localStorage.getItem('dashboardAuthEnabled') ?? 'true') === 'true');
  const [dashboardAuthenticated, setDashboardAuthenticated] = useState(() => sessionStorage.getItem('dashboardAuthed') === 'true');
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [isDashboardDialogOpen, setIsDashboardDialogOpen] = useState(false);
  const [pendingAdminRedirect, setPendingAdminRedirect] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<NavigationState[]>([
    { view: 'portfolio', selectedApp: null, selectedJourney: null }
  ]);
  const [timePeriod, setTimePeriod] = useState<TimePeriodData>({
    format: 'month',
    period: 'November 2025',
  });
  const [globalFeatureFlags, setGlobalFeatureFlags] = useState<FeatureFlags>({
    keyJourneysEnabled: false,
    topPainsEnabled: false,
  });
  const [localFeatureFlags, setLocalFeatureFlags] = useState<FeatureFlags>(() => {
    const stored = localStorage.getItem('featureFlagsLocal');
    if (!stored) {
      return { keyJourneysEnabled: false, topPainsEnabled: false };
    }
    try {
      const parsed = JSON.parse(stored) as Partial<FeatureFlags>;
      return {
        keyJourneysEnabled: Boolean(parsed.keyJourneysEnabled),
        topPainsEnabled: Boolean(parsed.topPainsEnabled),
      };
    } catch {
      return { keyJourneysEnabled: false, topPainsEnabled: false };
    }
  });
  const [useLocalFeatureFlags, setUseLocalFeatureFlags] = useState(() => {
    const stored = localStorage.getItem('featureFlagsUseLocal');
    if (stored !== null) return stored === 'true';
    return import.meta.env.DEV;
  });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    document.title = currentView.startsWith('admin')
      ? 'Admin: Manage Dashboard'
      : 'Store XM Dashboard';
  }, [currentView]);

  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('id,admin_auth_enabled,admin_show_button,admin_password,dashboard_auth_enabled,dashboard_password,key_journeys_enabled,top_pains_enabled')
        .eq('id', 'global')
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        console.warn('Failed to load app settings:', error.message);
        setSettingsLoaded(true);
        return;
      }

      if (!data) {
        setSettingsLoaded(true);
        return;
      }

      const nextSettings: AppSettings = {
        adminAuthEnabled: data.admin_auth_enabled ?? adminAuthEnabled,
        adminShowButton: data.admin_show_button ?? adminShowButton,
        adminPassword: data.admin_password ?? adminPassword,
        dashboardAuthEnabled: data.dashboard_auth_enabled ?? dashboardAuthEnabled,
        dashboardPassword: data.dashboard_password ?? dashboardPassword,
        keyJourneysEnabled: data.key_journeys_enabled ?? globalFeatureFlags.keyJourneysEnabled,
        topPainsEnabled: data.top_pains_enabled ?? globalFeatureFlags.topPainsEnabled,
      };

      localStorage.setItem('adminAuthEnabled', String(nextSettings.adminAuthEnabled));
      localStorage.setItem('adminShowButton', String(nextSettings.adminShowButton));
      localStorage.setItem('adminPassword', nextSettings.adminPassword);
      localStorage.setItem('dashboardAuthEnabled', String(nextSettings.dashboardAuthEnabled));
      localStorage.setItem('dashboardPassword', nextSettings.dashboardPassword);

      setAdminAuthEnabled(nextSettings.adminAuthEnabled);
      setAdminShowButton(nextSettings.adminShowButton);
      setAdminPassword(nextSettings.adminPassword);
      setDashboardAuthEnabled(nextSettings.dashboardAuthEnabled);
      setDashboardPassword(nextSettings.dashboardPassword);
      setGlobalFeatureFlags({
        keyJourneysEnabled: nextSettings.keyJourneysEnabled,
        topPainsEnabled: nextSettings.topPainsEnabled,
      });
      setSettingsLoaded(true);
    };

    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    const saveSettings = async () => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          id: 'global',
          admin_auth_enabled: adminAuthEnabled,
          admin_show_button: adminShowButton,
          admin_password: adminPassword,
          dashboard_auth_enabled: dashboardAuthEnabled,
          dashboard_password: dashboardPassword,
          key_journeys_enabled: globalFeatureFlags.keyJourneysEnabled,
          top_pains_enabled: globalFeatureFlags.topPainsEnabled,
        });

      if (error) {
        console.warn('Failed to save app settings:', error.message);
      }
    };

    saveSettings();
  }, [
    adminAuthEnabled,
    adminShowButton,
    adminPassword,
    dashboardAuthEnabled,
    dashboardPassword,
    globalFeatureFlags.keyJourneysEnabled,
    globalFeatureFlags.topPainsEnabled,
    settingsLoaded,
  ]);

  useEffect(() => {
    localStorage.setItem('featureFlagsLocal', JSON.stringify(localFeatureFlags));
  }, [localFeatureFlags]);

  useEffect(() => {
    localStorage.setItem('featureFlagsUseLocal', String(useLocalFeatureFlags));
  }, [useLocalFeatureFlags]);

  const effectiveFeatureFlags = useLocalFeatureFlags ? localFeatureFlags : globalFeatureFlags;

  const pushToHistory = (view: ViewType, appId?: string | null, journeyId?: string | null) => {
    const newState: NavigationState = {
      view,
      selectedApp: appId,
      selectedJourney: journeyId,
    };
    setNavigationHistory(prev => [...prev, newState]);
  };

  const basePath = import.meta.env.BASE_URL ?? '/';
  const adminPath = basePath.endsWith('/') ? `${basePath}admin` : `${basePath}/admin`;

  const syncPath = (view: ViewType) => {
    const targetPath = view.startsWith('admin') ? adminPath : basePath;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  };

  const navigateToAppDetail = (appId: string) => {
    pushToHistory('app-detail-enhanced', appId, null);
    setSelectedApp(appId);
    setCurrentView('app-detail-enhanced');
    syncPath('app-detail-enhanced');
  };

  const navigateToJourneyDetail = (journeyId: string) => {
    pushToHistory('journey-detail-enhanced', null, journeyId);
    setSelectedJourney(journeyId);
    setCurrentView('journey-detail-enhanced');
    syncPath('journey-detail-enhanced');
  };

  const navigateToView = (view: ViewType) => {
    pushToHistory(view, null, null);
    setCurrentView(view);
    syncPath(view);
  };

  const navigateToPortfolio = () => {
    pushToHistory('portfolio', null, null);
    setCurrentView('portfolio');
    setSelectedApp(null);
    setSelectedJourney(null);
    syncPath('portfolio');
  };

  const navigateToAllApps = () => {
    pushToHistory('all-apps', null, null);
    setCurrentView('all-apps');
    setSelectedApp(null);
    setSelectedJourney(null);
    syncPath('all-apps');
  };

  const navigateToAllJourneys = () => {
    pushToHistory('all-journeys', null, null);
    setCurrentView('all-journeys');
    setSelectedApp(null);
    setSelectedJourney(null);
    syncPath('all-journeys');
  };

  const navigateToTopPains = () => {
    pushToHistory('top-pains', null, null);
    setCurrentView('top-pains');
    setSelectedApp(null);
    setSelectedJourney(null);
    syncPath('top-pains');
  };

  const navigateToAdminThemes = () => {
    pushToHistory('admin-manage-themes', null, null);
    setCurrentView('admin-manage-themes');
    setSelectedApp(null);
    setSelectedJourney(null);
    syncPath('admin-manage-themes');
  };

  const navigateToManageThemes = () => {
    pushToHistory('admin-manage-themes', null, null);
    setCurrentView('admin-manage-themes');
    setSelectedApp(null);
    setSelectedJourney(null);
    syncPath('admin-manage-themes');
  };

  const navigateToManageTopPains = () => {
    pushToHistory('admin-manage-top-pains', null, null);
    setCurrentView('admin-manage-top-pains');
    setSelectedApp(null);
    setSelectedJourney(null);
    syncPath('admin-manage-top-pains');
  };

  const navigateToManageJourneys = () => {
    pushToHistory('admin-manage-journeys', null, null);
    setCurrentView('admin-manage-journeys');
    setSelectedApp(null);
    setSelectedJourney(null);
    syncPath('admin-manage-journeys');
  };

  const navigateToManageApps = () => {
    pushToHistory('admin-manage-apps', null, null);
    setCurrentView('admin-manage-apps');
    setSelectedApp(null);
    setSelectedJourney(null);
    syncPath('admin-manage-apps');
  };

  const navigateToManageSettings = () => {
    pushToHistory('admin-settings', null, null);
    setCurrentView('admin-settings');
    setSelectedApp(null);
    setSelectedJourney(null);
    syncPath('admin-settings');
  };

  const navigateToFeatureFlags = () => {
    pushToHistory('admin-feature-flags', null, null);
    setCurrentView('admin-feature-flags');
    setSelectedApp(null);
    setSelectedJourney(null);
    syncPath('admin-feature-flags');
  };

  const navigateToExport = () => {
    pushToHistory('export-report', null, null);
    setCurrentView('export-report');
    setSelectedApp(null);
    setSelectedJourney(null);
    syncPath('export-report');
  };

  const requestAdminAccess = () => {
    if (!adminAuthEnabled || adminAuthenticated) {
      navigateToAdminThemes();
      return;
    }
    setPendingAdminRedirect(true);
    setIsAdminDialogOpen(true);
  };

  useEffect(() => {
    localStorage.setItem('adminPassword', adminPassword);
  }, [adminPassword]);

  useEffect(() => {
    localStorage.setItem('adminAuthEnabled', String(adminAuthEnabled));
  }, [adminAuthEnabled]);

  useEffect(() => {
    localStorage.setItem('adminShowButton', String(adminShowButton));
  }, [adminShowButton]);

  useEffect(() => {
    if (adminAuthEnabled) return;
    setIsAdminDialogOpen(false);
  }, [adminAuthEnabled]);

  useEffect(() => {
    localStorage.setItem('dashboardPassword', dashboardPassword);
  }, [dashboardPassword]);

  useEffect(() => {
    localStorage.setItem('dashboardAuthEnabled', String(dashboardAuthEnabled));
    if (!dashboardAuthEnabled) {
      sessionStorage.setItem('dashboardAuthed', 'true');
      setDashboardAuthenticated(true);
      setIsDashboardDialogOpen(false);
    }
  }, [dashboardAuthEnabled]);

  useEffect(() => {
    if (dashboardAuthEnabled && !dashboardAuthenticated) {
      setIsDashboardDialogOpen(true);
    }
  }, [dashboardAuthEnabled, dashboardAuthenticated]);

  useEffect(() => {
    const handlePath = () => {
      const path = window.location.pathname;
      const normalizedAdminPath = adminPath.endsWith('/') ? adminPath.slice(0, -1) : adminPath;
      if (path === adminPath || path === normalizedAdminPath) {
        requestAdminAccess();
      }
    };

    handlePath();
    window.addEventListener('popstate', handlePath);
    return () => window.removeEventListener('popstate', handlePath);
  }, [adminAuthEnabled, adminAuthenticated, adminPath]);
  const handleAdminTabChange = (tab: 'manage-themes' | 'manage-top-pains' | 'manage-journeys' | 'manage-apps' | 'feature-flags' | 'settings') => {
    if (tab === 'manage-themes') {
      navigateToManageThemes();
    } else if (tab === 'manage-top-pains') {
      navigateToManageTopPains();
    } else if (tab === 'manage-journeys') {
      navigateToManageJourneys();
    } else if (tab === 'manage-apps') {
      navigateToManageApps();
    } else if (tab === 'feature-flags') {
      navigateToFeatureFlags();
    } else if (tab === 'settings') {
      navigateToManageSettings();
    }
  };

  const getLegacyFormat = (period: TimePeriodData['period']): TimePeriodData['format'] => {
    if (/^Q[1-4]\b/i.test(period)) return 'quarter';
    if (/^\d{4}$/.test(period)) return 'year';
    return 'month';
  };

  const legacyTimePeriod = timePeriod.period as TimePeriod;

  const handleLegacyTimePeriodChange = (period: TimePeriod) => {
    setTimePeriod({ format: getLegacyFormat(period), period });
  };


  const navigateBack = () => {
    if (navigationHistory.length > 1) {
      // Remove current state
      const newHistory = navigationHistory.slice(0, -1);
      setNavigationHistory(newHistory);
      
      // Go to previous state
      const previousState = newHistory[newHistory.length - 1];
      setCurrentView(previousState.view);
      setSelectedApp(previousState.selectedApp || null);
      setSelectedJourney(previousState.selectedJourney || null);
    } else {
      // Fallback to portfolio if history is empty
      setCurrentView('portfolio');
      setSelectedApp(null);
      setSelectedJourney(null);
    }
  };

  const isDashboardLocked = dashboardAuthEnabled && !dashboardAuthenticated;

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <DashboardPasswordDialog
        open={isDashboardDialogOpen}
        onSuccess={() => {
          sessionStorage.setItem('dashboardAuthed', 'true');
          setDashboardAuthenticated(true);
          setIsDashboardDialogOpen(false);
        }}
        password={dashboardPassword}
      />
      {isDashboardLocked && (
        <div className="fixed inset-0 z-40 backdrop-blur-xl bg-slate-900/30" aria-hidden="true" />
      )}
      <AdminPasswordDialog
        open={isAdminDialogOpen}
        onClose={() => {
          setIsAdminDialogOpen(false);
          setPendingAdminRedirect(false);
        }}
        onSuccess={() => {
          sessionStorage.setItem('adminAuthed', 'true');
          setAdminAuthenticated(true);
          setIsAdminDialogOpen(false);
          setPendingAdminRedirect(false);
          navigateToAdminThemes();
        }}
        password={adminPassword}
      />
      <div className={isDashboardLocked ? 'blur-xl pointer-events-none select-none' : undefined} aria-hidden={isDashboardLocked}>
        {currentView === 'portfolio' && (
        <PortfolioOverview
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          onNavigateToApp={navigateToAppDetail}
          onNavigateToJourney={navigateToJourneyDetail}
          onNavigateToView={navigateToView}
          onNavigateAdmin={requestAdminAccess}
          onNavigateExport={navigateToExport}
          showAdminButton={adminShowButton}
        />
      )}
      {currentView === 'app-detail' && selectedApp && (
        <AppDetail
          appId={selectedApp}
          timePeriod={legacyTimePeriod}
          onTimePeriodChange={handleLegacyTimePeriodChange}
          onNavigateBack={navigateBack}
        />
      )}
      {currentView === 'app-detail-enhanced' && selectedApp && (
        <AppDetailEnhanced
          appId={selectedApp}
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          onNavigateBack={navigateBack}
          onNavigateHome={navigateToPortfolio}
          onNavigateAllApps={navigateToAllApps}
          onNavigateKeyJourneys={navigateToAllJourneys}
          onNavigateTopPains={navigateToTopPains}
          onNavigateAdmin={requestAdminAccess}
          onNavigateExport={navigateToExport}
          showAdminButton={adminShowButton}
        />
      )}
      {currentView === 'journey-detail' && selectedJourney && (
        <JourneyDetail
          journeyId={selectedJourney}
          timePeriod={legacyTimePeriod}
          onTimePeriodChange={handleLegacyTimePeriodChange}
          onNavigateBack={navigateBack}
        />
      )}
      {currentView === 'journey-detail-enhanced' && selectedJourney && (
        <JourneyDetailEnhanced
          journeyId={selectedJourney}
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          onNavigateBack={navigateBack}
          onNavigateToApp={navigateToAppDetail}
          onNavigateHome={navigateToPortfolio}
          onNavigateAllApps={navigateToAllApps}
          onNavigateKeyJourneys={navigateToAllJourneys}
          onNavigateTopPains={navigateToTopPains}
          onNavigateAdmin={requestAdminAccess}
          onNavigateExport={navigateToExport}
          showAdminButton={adminShowButton}
        />
      )}
      {currentView === 'all-apps' && (
        <AllAppsOverTime
          onNavigateToApp={navigateToAppDetail}
          onNavigateBack={navigateBack}
          onNavigateHome={navigateToPortfolio}
          onNavigateAllApps={navigateToAllApps}
          onNavigateKeyJourneys={navigateToAllJourneys}
          onNavigateTopPains={navigateToTopPains}
          onNavigateAdmin={requestAdminAccess}
          onNavigateExport={navigateToExport}
          showAdminButton={adminShowButton}
        />
      )}
      {currentView === 'all-journeys' && (
        <AllJourneysView
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          onNavigateToJourney={navigateToJourneyDetail}
          onNavigateBack={navigateBack}
          onNavigateHome={navigateToPortfolio}
          onNavigateAllApps={navigateToAllApps}
          onNavigateKeyJourneys={navigateToAllJourneys}
          onNavigateTopPains={navigateToTopPains}
          onNavigateAdmin={requestAdminAccess}
          onNavigateExport={navigateToExport}
          isFeatureEnabled={effectiveFeatureFlags.keyJourneysEnabled}
          showAdminButton={adminShowButton}
        />
      )}
      {currentView === 'time-series' && (
        <TimeSeriesView
          timePeriod={legacyTimePeriod}
          onTimePeriodChange={handleLegacyTimePeriodChange}
          onNavigateBack={navigateBack}
        />
      )}
      {currentView === 'apps-time-grid-executive' && (
        <AllAppsTimeGrid
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          onNavigateToApp={navigateToAppDetail}
          onNavigateBack={navigateBack}
          role="executive"
        />
      )}
      {currentView === 'apps-time-grid-practitioner' && (
        <AllAppsTimeGrid
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          onNavigateToApp={navigateToAppDetail}
          onNavigateBack={navigateBack}
          role="practitioner"
        />
      )}
      {currentView === 'top-pains' && (
        <TopPains
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          onNavigateBack={navigateBack}
          onNavigateHome={navigateToPortfolio}
          onNavigateAllApps={navigateToAllApps}
          onNavigateKeyJourneys={navigateToAllJourneys}
          onNavigateTopPains={navigateToTopPains}
          onNavigateAdmin={navigateToAdminThemes}
          onNavigateExport={navigateToExport}
          isFeatureEnabled={effectiveFeatureFlags.topPainsEnabled}
          showAdminButton={adminShowButton}
        />
      )}
      {currentView === 'admin-manage-themes' && (
        <ManageThemes
          onNavigateBack={navigateBack}
          onNavigateHome={navigateToPortfolio}
          onNavigateAllApps={navigateToAllApps}
          onNavigateKeyJourneys={navigateToAllJourneys}
          onNavigateTopPains={navigateToTopPains}
          onTabChange={handleAdminTabChange}
        />
      )}
      {currentView === 'admin-manage-top-pains' && (
        <ManageTopPains
          onNavigateBack={navigateBack}
          onNavigateHome={navigateToPortfolio}
          onNavigateAllApps={navigateToAllApps}
          onNavigateKeyJourneys={navigateToAllJourneys}
          onNavigateTopPains={navigateToTopPains}
          onTabChange={handleAdminTabChange}
        />
      )}
      {currentView === 'admin-manage-journeys' && (
        <ManageJourneys
          onNavigateBack={navigateBack}
          onNavigateHome={navigateToPortfolio}
          onNavigateAllApps={navigateToAllApps}
          onNavigateKeyJourneys={navigateToAllJourneys}
          onNavigateTopPains={navigateToTopPains}
          onTabChange={handleAdminTabChange}
        />
      )}
      {currentView === 'admin-manage-apps' && (
        <ManageApps
          onNavigateBack={navigateBack}
          onNavigateHome={navigateToPortfolio}
          onNavigateAllApps={navigateToAllApps}
          onNavigateKeyJourneys={navigateToAllJourneys}
          onNavigateTopPains={navigateToTopPains}
          onTabChange={handleAdminTabChange}
        />
      )}
      {currentView === 'admin-feature-flags' && (
        <ManageFeatureFlags
          onNavigateBack={navigateBack}
          onNavigateHome={navigateToPortfolio}
          onNavigateAllApps={navigateToAllApps}
          onNavigateKeyJourneys={navigateToAllJourneys}
          onNavigateTopPains={navigateToTopPains}
          onTabChange={handleAdminTabChange}
          flags={effectiveFeatureFlags}
          onFlagsChange={(nextFlags) => {
            if (useLocalFeatureFlags) {
              setLocalFeatureFlags(nextFlags);
            } else {
              setGlobalFeatureFlags(nextFlags);
            }
          }}
          useLocalOverrides={useLocalFeatureFlags}
          onUseLocalOverridesChange={setUseLocalFeatureFlags}
        />
      )}
      {currentView === 'admin-settings' && (
        <ManageSettings
          onNavigateBack={navigateBack}
          onNavigateHome={navigateToPortfolio}
          onNavigateAllApps={navigateToAllApps}
          onNavigateKeyJourneys={navigateToAllJourneys}
          onNavigateTopPains={navigateToTopPains}
          onTabChange={handleAdminTabChange}
          dashboardAuthEnabled={dashboardAuthEnabled}
          dashboardPassword={dashboardPassword}
          onDashboardAuthEnabledChange={setDashboardAuthEnabled}
          onDashboardPasswordChange={setDashboardPassword}
          adminAuthEnabled={adminAuthEnabled}
          adminShowButton={adminShowButton}
          adminPassword={adminPassword}
          onAdminAuthEnabledChange={setAdminAuthEnabled}
          onAdminShowButtonChange={setAdminShowButton}
          onAdminPasswordChange={setAdminPassword}
        />
      )}
        {currentView === 'export-report' && (
        <ExportReport
          onNavigateBack={navigateBack}
          onNavigateHome={navigateToPortfolio}
          onNavigateAllApps={navigateToAllApps}
          onNavigateKeyJourneys={navigateToAllJourneys}
          onNavigateTopPains={navigateToTopPains}
          onNavigateAdmin={requestAdminAccess}
          showAdminButton={adminShowButton}
        />
      )}
      </div>
    </div>
  );
}

export default App;