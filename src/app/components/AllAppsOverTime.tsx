import { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';
import { NavigationHeader } from './NavigationHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { supabase } from '../lib/supabaseClient';

interface AllAppsOverTimeProps {
  onNavigateToApp: (appId: string) => void;
  onNavigateBack: () => void;
  onNavigateHome?: () => void;
  onNavigateAllApps?: () => void;
  onNavigateKeyJourneys?: () => void;
  onNavigateTopPains?: () => void;
}

type ViewGranularity = 'monthly' | 'quarterly';

interface ScoreData {
  overallScore: number;
  easeOfUse: number;
  usefulness: number;
  responses: number;
}

type AppMetricsRow = {
  app_id: string;
  app_name: string | null;
  period: string;
  period_label: string | null;
  sort_order: number | null;
  overall_score: number | null;
  ease_of_use_avg: number | null;
  usefulness_avg: number | null;
  response_count: number | null;
};

type AppRow = {
  id: string;
  name: string;
  metrics: Record<string, ScoreData>;
};

type SortField = 'name' | 'overallScore' | 'easeOfUse' | 'usefulness' | 'responses';
type SortDirection = 'asc' | 'desc';

const getScoreColor = (score: number): string => {
  if (score >= 75) return 'text-green-700';
  if (score >= 65) return 'text-orange-600';
  return 'text-red-700';
};

const getScoreBgColor = (score: number): string => {
  if (score >= 75) return 'bg-green-50';
  if (score >= 65) return 'bg-orange-50';
  return 'bg-red-50';
};

export function AllAppsOverTime({
  onNavigateToApp,
  onNavigateBack,
  onNavigateHome,
  onNavigateAllApps,
  onNavigateKeyJourneys,
  onNavigateTopPains,
}: AllAppsOverTimeProps) {
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [granularity, setGranularity] = useState<ViewGranularity>('monthly');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [sortPeriod, setSortPeriod] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [appMetricsRows, setAppMetricsRows] = useState<AppMetricsRow[]>([]);

  const getYearFromLabel = (label?: string | null) => {
    if (!label) return null;
    const calendarMatch = label.match(/\b(20\d{2})\b/);
    if (calendarMatch) return calendarMatch[1];
    const fiscalMatch = label.match(/FY(\d{2})/i);
    if (fiscalMatch) {
      const fiscalYear = Number(fiscalMatch[1]);
      // Fiscal year labels map to the year in which the fiscal year ends.
      // Example: FY26 corresponds to calendar 2025 in this dataset.
      return String(2000 + fiscalYear - 1);
    }
    return null;
  };

  const getPeriodKey = (label: string | null, fallback: string, view: ViewGranularity) => {
    if (!label) {
      if (view === 'quarterly') {
        const quarterMatch = fallback.match(/Q[1-4]/i);
        return quarterMatch ? quarterMatch[0].toUpperCase() : fallback;
      }
      return fallback;
    }
    if (view === 'monthly') {
      const token = label.split(' ')[0];
      return token.slice(0, 3);
    }
    const quarterMatch = label.match(/Q[1-4]/i);
    if (quarterMatch) return quarterMatch[0].toUpperCase();
    return label.split(' ')[0];
  };

  // Load app metrics for the selected granularity from Supabase.
  // The response is the single source of truth for year options and table cells.
  useEffect(() => {
    let isMounted = true;
    const loadMetrics = async () => {
      setIsLoading(true);
      setMetricsError(null);

      const viewName = granularity === 'quarterly' ? 'v_app_quarter_metrics' : 'v_app_metrics_trends';
      const { data, error } = await supabase
        .from(viewName)
        .select(
          'app_id, app_name, period, period_label, sort_order, overall_score, ease_of_use_avg, usefulness_avg, response_count'
        )
        .order('sort_order', { ascending: true });

      if (!isMounted) return;

      if (error) {
        setMetricsError(error.message ?? 'Failed to load metrics.');
        setAppMetricsRows([]);
        setIsLoading(false);
        return;
      }

      setAppMetricsRows((data ?? []) as AppMetricsRow[]);
      setIsLoading(false);
    };

    loadMetrics();

    return () => {
      isMounted = false;
    };
  }, [granularity]);

  const getYearFromRow = (row: AppMetricsRow) =>
    getYearFromLabel(row.period_label) ?? getYearFromLabel(row.period);

  // Derive available years from the loaded dataset so the selector only shows real data.
  const availableYears = useMemo(() => {
    const yearSet = new Set<string>();
    appMetricsRows.forEach((row) => {
      const year = getYearFromRow(row);
      if (year) yearSet.add(year);
    });
    return Array.from(yearSet).sort((a, b) => Number(b) - Number(a));
  }, [appMetricsRows]);

  useEffect(() => {
    if (availableYears.length === 0) return;
    if (!availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // Filter rows to the selected year and build the period headers + app rows.
  const rowsForYear = useMemo(() => {
    return appMetricsRows.filter((row) => {
      const year = getYearFromRow(row);
      return year === selectedYear;
    });
  }, [appMetricsRows, selectedYear]);

  const periods = useMemo(() => {
    const periodMap = new Map<string, number>();
    rowsForYear.forEach((row) => {
      const key = getPeriodKey(row.period_label, row.period, granularity);
      const sortOrder = row.sort_order ?? 0;
      const existing = periodMap.get(key);
      if (existing === undefined || sortOrder < existing) {
        periodMap.set(key, sortOrder);
      }
    });
    return Array.from(periodMap.entries())
      .sort(([, a], [, b]) => a - b)
      .map(([key]) => key);
  }, [rowsForYear, granularity]);

  const appRows = useMemo(() => {
    const appMap = new Map<string, AppRow>();
    rowsForYear.forEach((row) => {
      const key = getPeriodKey(row.period_label, row.period, granularity);
      if (!key) return;
      const appId = row.app_id;
      const appName = row.app_name ?? row.app_id ?? 'Unknown';

      if (!appMap.has(appId)) {
        appMap.set(appId, { id: appId, name: appName, metrics: {} });
      }

      const entry = appMap.get(appId)!;
      entry.name = appName;
      entry.metrics[key] = {
        overallScore: row.overall_score ?? 0,
        easeOfUse: Number(row.ease_of_use_avg ?? 0),
        usefulness: Number(row.usefulness_avg ?? 0),
        responses: row.response_count ?? 0,
      };
    });

    return Array.from(appMap.values());
  }, [rowsForYear, granularity]);

  // Handle sorting
  const handleSort = (field: SortField, period: string | null = null) => {
    if (sortField === field && sortPeriod === period) {
      // Toggle direction if clicking the same field+period
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending (except for name)
      setSortField(field);
      setSortPeriod(period);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  // Sort the data
  const sortedData = [...appRows].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    
    if (sortField === 'name') {
      return multiplier * a.name.localeCompare(b.name);
    }
    
    // For metric fields, use the selected period
    if (sortPeriod) {
      const dataA = a.metrics[sortPeriod];
      const dataB = b.metrics[sortPeriod];
      
      // Handle missing or undefined data
      if (!dataA && !dataB) return 0;
      if (!dataA) return 1;
      if (!dataB) return -1;
      
      const valueA = dataA[sortField];
      const valueB = dataB[sortField];
      
      return multiplier * (valueA - valueB);
    }
    
    return 0;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <NavigationHeader
        currentView="all-apps"
        onNavigateHome={onNavigateHome || onNavigateBack}
        onNavigateAllApps={onNavigateAllApps || (() => {})}
        onNavigateKeyJourneys={onNavigateKeyJourneys || onNavigateBack}
        onNavigateTopPains={onNavigateTopPains || onNavigateBack}
        title={`All Apps - ${selectedYear} Year to Date`}
        subtitle="UX-Lite scores and metrics across time periods"
        showExportButton={true}
      />

      {/* Time Granularity Selection */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            {/* Granularity Selector */}
            <div className="inline-flex gap-1 border border-slate-300 rounded-md p-1">
              <Button
                size="sm"
                variant={granularity === 'monthly' ? 'default' : 'ghost'}
                onClick={() => setGranularity('monthly')}
                className={`${
                  granularity === 'monthly'
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'hover:bg-slate-100'
                }`}
              >
                Month
              </Button>
              <Button
                size="sm"
                variant={granularity === 'quarterly' ? 'default' : 'ghost'}
                onClick={() => setGranularity('quarterly')}
                className={`${
                  granularity === 'quarterly'
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'hover:bg-slate-100'
                }`}
              >
                Quarter
              </Button>
            </div>

            {/* Year Selector */}
            <Select value={selectedYear} onValueChange={setSelectedYear} disabled={availableYears.length === 0}>
              <SelectTrigger className="w-32 bg-white border-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.length === 0 ? (
                  <SelectItem value={selectedYear || 'n/a'} disabled>
                    No data
                  </SelectItem>
                ) : (
                  availableYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Section Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-1">Application Scorecard</h2>
          <p className="text-sm text-slate-600">
            Click column headers to sort by metric within each time period. Click any row to view application details.
          </p>
        </div>

        {/* Scorecard Table */}
        <section>
          {metricsError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Supabase error: {metricsError}
            </div>
          )}
          {!metricsError && isLoading && (
            <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Loading app scorecard data…
            </div>
          )}
          {!metricsError && !isLoading && periods.length === 0 && (
            <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              No data found for the selected year.
            </div>
          )}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-6 py-4 font-semibold text-slate-900 sticky left-0 bg-slate-50 z-10">
                      Application
                    </th>
                    {periods.map((period) => (
                      <th key={period} colSpan={4} className={`px-6 py-4 font-semibold text-slate-900 border-l border-slate-200 text-center ${granularity === 'quarterly' ? 'bg-green-50' : 'bg-blue-50'}`}>
                        {period} '{selectedYear.slice(-2)}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-200 bg-slate-100">
                    <th 
                      className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide sticky left-0 bg-slate-100 z-10 cursor-pointer hover:bg-slate-200"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        {appRows.length} Apps
                        {sortField === 'name' && sortPeriod === null && (
                          <span className="text-slate-700">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    {periods.map((period) => [
                      <th 
                        key={`${period}-score`} 
                        className="px-3 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide border-l border-slate-200 text-center cursor-pointer hover:bg-slate-200"
                        onClick={() => handleSort('overallScore', period)}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Overall Score
                          {sortField === 'overallScore' && sortPeriod === period && (
                            <span className="text-slate-700">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>,
                      <th 
                        key={`${period}-ease`} 
                        className="px-3 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide text-center cursor-pointer hover:bg-slate-200"
                        onClick={() => handleSort('easeOfUse', period)}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Ease of Use
                          {sortField === 'easeOfUse' && sortPeriod === period && (
                            <span className="text-slate-700">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>,
                      <th 
                        key={`${period}-useful`} 
                        className="px-3 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide text-center cursor-pointer hover:bg-slate-200"
                        onClick={() => handleSort('usefulness', period)}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Usefulness
                          {sortField === 'usefulness' && sortPeriod === period && (
                            <span className="text-slate-700">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>,
                      <th 
                        key={`${period}-responses`} 
                        className="px-3 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide text-center cursor-pointer hover:bg-slate-200"
                        onClick={() => handleSort('responses', period)}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Responses
                          {sortField === 'responses' && sortPeriod === period && (
                            <span className="text-slate-700">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                    ])}
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((app, appIndex) => (
                    <tr 
                      key={app.id} 
                      className={`border-b border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors ${appIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                      onClick={() => onNavigateToApp(app.id)}
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900 sticky left-0 z-10" style={{ backgroundColor: appIndex % 2 === 0 ? 'white' : 'rgb(248 250 252 / 0.5)' }}>
                        {app.name}
                      </td>
                      {periods.map((period) => {
                        const data = app.metrics[period];
                        const hasData = Boolean(data);
                        
                        return [
                          <td
                            key={`${app.id}-${period}-score`}
                            className={`px-3 py-4 text-center border-l-2 border-slate-300 ${hasData ? getScoreBgColor(data?.overallScore ?? 0) : 'bg-slate-100'}`}
                          >
                            {!hasData ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              <span className={`font-semibold ${getScoreColor(data?.overallScore ?? 0)}`}>
                                {data?.overallScore ?? 0}
                              </span>
                            )}
                          </td>,
                          <td key={`${app.id}-${period}-ease`} className={`px-3 py-4 text-center ${hasData ? '' : 'bg-slate-100'}`}>
                            {!hasData ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              <span className="text-slate-700">
                                {data?.easeOfUse.toFixed(1)}
                              </span>
                            )}
                          </td>,
                          <td key={`${app.id}-${period}-useful`} className={`px-3 py-4 text-center ${hasData ? '' : 'bg-slate-100'}`}>
                            {!hasData ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              <span className="text-slate-700">
                                {data?.usefulness.toFixed(1)}
                              </span>
                            )}
                          </td>,
                          <td key={`${app.id}-${period}-responses`} className={`px-3 py-4 text-center ${hasData ? '' : 'bg-slate-100'}`}>
                            {!hasData ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              <span className="text-slate-600">
                                {data?.responses.toLocaleString()}
                              </span>
                            )}
                          </td>
                        ];
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
              <span className="text-slate-700">Good (75+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-50 border border-orange-200 rounded"></div>
              <span className="text-slate-700">Needs Improvement (65-74)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
              <span className="text-slate-700">Poor (&lt;65)</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-slate-600">Click any app row to view details</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}