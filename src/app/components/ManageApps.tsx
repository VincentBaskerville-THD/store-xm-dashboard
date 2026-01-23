import { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { AdminTabNav } from './AdminTabNav';
import { Save, Search, Settings } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface ManageAppsProps {
  onNavigateBack: () => void;
  onNavigateHome?: () => void;
  onNavigateAllApps?: () => void;
  onNavigateKeyJourneys?: () => void;
  onNavigateTopPains?: () => void;
  onTabChange: (tab: 'manage-themes' | 'manage-journeys' | 'manage-apps' | 'settings') => void;
}

interface AppFlags {
  isKTLO: boolean;
  noUX: boolean;
}

type AppRow = {
  id: string;
  name: string;
  is_ktlo?: boolean | null;
  no_ux?: boolean | null;
};

type MetricsRow = {
  app_id: string;
  period: string | null;
  sort_order: number | null;
  resolved_metrics_system: string | null;
};

export function ManageApps({
  onNavigateBack,
  onNavigateHome,
  onNavigateAllApps,
  onNavigateKeyJourneys,
  onNavigateTopPains,
  onTabChange,
}: ManageAppsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [apps, setApps] = useState<AppRow[]>([]);
  const [appFlags, setAppFlags] = useState<Record<string, AppFlags>>({});
  const [initialFlags, setInitialFlags] = useState<Record<string, AppFlags>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [metricsByApp, setMetricsByApp] = useState<Record<string, { months: number; metricsSystem: 'pendo' | 'medallia' | null }>>({});
  const [themesByApp, setThemesByApp] = useState<Record<string, number>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const toggleFlag = (appId: string, flag: 'isKTLO' | 'noUX') => {
    setAppFlags(prev => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        [flag]: !prev[appId][flag],
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    const changedAppIds = Object.keys(appFlags).filter((appId) => {
      const current = appFlags[appId];
      const initial = initialFlags[appId];
      if (!current || !initial) return false;
      return current.isKTLO !== initial.isKTLO || current.noUX !== initial.noUX;
    });

    if (changedAppIds.length === 0) {
      setHasChanges(false);
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    Promise.all(
      changedAppIds.map((appId) =>
        supabase
          .from('apps')
          .update({
            is_ktlo: appFlags[appId]?.isKTLO ?? false,
            no_ux: appFlags[appId]?.noUX ?? false,
          })
          .eq('id', appId)
      )
    )
      .then((results) => {
        const failed = results.find((result) => result.error);
        if (failed?.error) {
          throw failed.error;
        }
        setInitialFlags({ ...appFlags });
        setHasChanges(false);
      })
      .catch((error) => {
        setSaveError(error?.message ?? 'Failed to save app flags.');
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  useEffect(() => {
    let isMounted = true;

    const normalizeMetricsSystem = (value: string | null): 'pendo' | 'medallia' => {
      const normalized = value?.toLowerCase() ?? '';
      return normalized.includes('medallia') ? 'medallia' : 'pendo';
    };

    const loadApps = async () => {
      setIsLoading(true);
      setLoadError(null);

      const { data: appData, error: appError } = await supabase
        .from('apps')
        .select('id,name,is_ktlo,no_ux')
        .order('name', { ascending: true });

      if (!isMounted) return;

      if (appError) {
        setLoadError(appError.message);
        setApps([]);
        setIsLoading(false);
        return;
      }

      const rows = (appData ?? []) as AppRow[];
      setApps(rows);
      const nextFlags: Record<string, AppFlags> = {};
      rows.forEach((app) => {
        nextFlags[app.id] = {
          isKTLO: Boolean(app.is_ktlo),
          noUX: Boolean(app.no_ux),
        };
      });
      setAppFlags(nextFlags);
      setInitialFlags(nextFlags);

      const { data: metricsData } = await supabase
        .from('v_app_metrics_trends')
        .select('app_id, period, sort_order, resolved_metrics_system')
        .order('sort_order', { ascending: false });

      if (!isMounted) return;

      const metricsRows = (metricsData ?? []) as MetricsRow[];
      const nextMetrics: Record<string, { months: number; metricsSystem: 'pendo' | 'medallia' | null }> = {};
      const seenPeriod = new Map<string, Set<string>>();
      const seenSystem = new Set<string>();

      metricsRows.forEach((row) => {
        if (!row.app_id) return;
        const period = row.period ?? '';
        if (!seenPeriod.has(row.app_id)) {
          seenPeriod.set(row.app_id, new Set<string>());
        }
        if (period && !seenPeriod.get(row.app_id)!.has(period)) {
          seenPeriod.get(row.app_id)!.add(period);
        }
        if (!seenSystem.has(row.app_id)) {
          nextMetrics[row.app_id] = {
            months: seenPeriod.get(row.app_id)!.size,
            metricsSystem: row.resolved_metrics_system ? normalizeMetricsSystem(row.resolved_metrics_system) : null,
          };
          seenSystem.add(row.app_id);
        } else {
          nextMetrics[row.app_id] = {
            months: seenPeriod.get(row.app_id)!.size,
            metricsSystem: nextMetrics[row.app_id]?.metricsSystem ?? null,
          };
        }
      });

      setMetricsByApp(nextMetrics);

      const { data: themeData } = await supabase
        .from('pain_observations')
        .select('app_id');

      if (!isMounted) return;

      const themeRows = (themeData ?? []) as Array<{ app_id: string | null }>;
      const themeCounts: Record<string, number> = {};
      themeRows.forEach((row) => {
        if (!row.app_id) return;
        themeCounts[row.app_id] = (themeCounts[row.app_id] ?? 0) + 1;
      });
      setThemesByApp(themeCounts);
      setIsLoading(false);
    };

    void loadApps();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredApps = useMemo(
    () => apps.filter(app => app.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [apps, searchQuery]
  );

  const navItems = [
    { id: 'portfolio', label: 'Portfolio', onClick: onNavigateHome || onNavigateBack },
    { id: 'all-apps', label: 'All Apps', onClick: onNavigateAllApps || onNavigateBack },
    { id: 'key-journeys', label: 'Key Journeys', onClick: onNavigateKeyJourneys || onNavigateBack },
    { id: 'top-pains', label: 'Top Pains', onClick: onNavigateTopPains || onNavigateBack },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 text-white" style={{ backgroundColor: '#ff6900' }}>
        {/* Navigation Tabs */}
        <nav className="border-b border-orange-700">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1">
              {navItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  size="sm"
                  onClick={item.onClick}
                  className="rounded-none border-b-2 border-transparent px-4 py-3 transition-colors text-white/80 hover:bg-orange-700 hover:text-white"
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </nav>

        {/* Page Title Section */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Settings className="size-5" />
                <h1 className="font-semibold">Admin: Manage Apps</h1>
              </div>
              <p className="text-sm text-white/80 mt-1">
                Configure app metadata and settings
              </p>
            </div>
          </div>
        </div>
      </header>

      <AdminTabNav activeTab="manage-apps" onTabChange={onTabChange} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">App Configuration</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Mark apps as "Keep The Lights On" (KTLO) or indicate if they don't have a UX designer
                </p>
              </div>
              
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className={`${
                  hasChanges && !isSaving
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Save size={16} className="mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search applications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
          {loadError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Failed to load apps: {loadError}
            </div>
          )}
          {saveError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Failed to save app settings: {saveError}
            </div>
          )}
          {isLoading && (
            <div className="mb-4 text-sm text-slate-600">Loading apps...</div>
          )}

          {/* Apps Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Application Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Months of Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    # of Related Themes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Collection Tool
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    KTLO
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    No UX
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredApps.map(app => (
                  <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">{app.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-slate-700">
                        {metricsByApp[app.id]?.months ?? 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-slate-700">
                        {themesByApp[app.id] ?? 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (metricsByApp[app.id]?.metricsSystem ?? 'pendo') === 'pendo'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {(metricsByApp[app.id]?.metricsSystem ?? 'pendo') === 'pendo' ? 'Pendo' : 'Medallia'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={appFlags[app.id]?.isKTLO || false}
                        onChange={() => toggleFlag(app.id, 'isKTLO')}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={appFlags[app.id]?.noUX || false}
                        onChange={() => toggleFlag(app.id, 'noUX')}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
            <div>
              Showing {filteredApps.length} of {apps.length} applications
            </div>
            <div className="flex gap-6">
              <div>
                <span className="font-medium text-gray-900">
                  {Object.values(appFlags).filter(f => f.isKTLO).length}
                </span>{' '}
                marked as KTLO
              </div>
              <div>
                <span className="font-medium text-gray-900">
                  {Object.values(appFlags).filter(f => f.noUX).length}
                </span>{' '}
                marked as No UX
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">What do these flags mean?</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                <strong>KTLO (Keep The Lights On):</strong> Applications in maintenance mode with minimal active development
              </li>
              <li>
                <strong>No UX:</strong> Applications without a dedicated UX designer on the team
              </li>
            </ul>
            <p className="text-xs text-blue-700 mt-3">
              These tags will appear in exported reports next to "AI Supported Summary" on app detail pages
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}