import React, { useEffect, useState } from 'react';
import { ArrowLeft, FileDown, TrendingUp, TrendingDown, LayoutGrid, Route, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from './ui/select';
import { Card } from './ui/card';
import { getScoreColor, getScoreBgColor, getTrendIcon, getTrendColor } from '../data/mockData';
import type { ViewType, AppData } from '../App';
import type { TimePeriodData } from './TimeSelector';
import { TimeSelector } from './TimeSelector';
import { NavigationHeader } from './NavigationHeader';
import { supabase } from '../lib/supabaseClient';

interface PortfolioOverviewProps {
  timePeriod: TimePeriodData;
  onTimePeriodChange: (period: TimePeriodData) => void;
  onNavigateToApp: (appId: string) => void;
  onNavigateToJourney: (journeyId: string) => void;
  onNavigateToView: (view: ViewType) => void;
  onNavigateAdmin?: () => void;
  onNavigateExport?: () => void;
}

type SortField = 'name' | 'overallScore' | 'scoreMoM' | 'easeOfUse' | 'usefulness' | 'responses';
type SortDirection = 'asc' | 'desc';
type FilterType = 'all' | 'good' | 'fair' | 'needs-improvement' | 'pendo' | 'medallia';

type AppMetricsRow = {
  app_id: string;
  app_name: string;
  period: string;
  period_label: string;
  sort_order: number;
  overall_score?: number | null;
  mom_pct_change?: number | null;
  qoq_pct_change?: number | null;
  yoy_pct_change?: number | null;
  ease_of_use_avg?: number | null;
  usefulness_avg?: number | null;
  response_count?: number | null;
  resolved_metrics_system?: string | null;
  created_at?: string | null;
};

type AvailablePeriods = Record<TimePeriodData['format'], string[]>;

type FiscalPeriodRow = {
  period: string;
  label?: string;
  period_label?: string;
  sort_order: number;
};

export function PortfolioOverview({
  timePeriod,
  onTimePeriodChange,
  onNavigateToApp,
  onNavigateToJourney,
  onNavigateToView,
  onNavigateAdmin,
  onNavigateExport,
}: PortfolioOverviewProps) {
  // UI state + data state for the portfolio view (sorts, filters, and fetched metrics).
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filter, setFilter] = useState<FilterType>('all');
  const [appMetrics, setAppMetrics] = useState<AppData[] | null>(null);
  const [metricsPeriodLabel, setMetricsPeriodLabel] = useState<string | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [periodsError, setPeriodsError] = useState<string | null>(null);
  const [isMetricsLoading, setIsMetricsLoading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [availablePeriods, setAvailablePeriods] = useState<AvailablePeriods>({
    month: [],
    quarter: [],
    year: [],
  });
  const [periodLabelToCode, setPeriodLabelToCode] = useState<Record<string, string>>({});

  const normalizeMetricsSystem = (value: string | null): AppData['metricsSystem'] => {
    const normalized = value?.toLowerCase() ?? '';
    return normalized.includes('medallia') ? 'medallia' : 'pendo';
  };

  const formatPercent = (value: number) => {
    const rounded = Number(value.toFixed(1));
    return `${rounded > 0 ? '+' : ''}${rounded}%`;
  };

  const formatScoreChange = (value: number) => {
    if (appMetrics) return formatPercent(value);
    return `${value > 0 ? '+' : ''}${value} pts`;
  };

  const formatLastUpdated = (value: string | null) => {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(parsed);
  };

  const getFormatFromFiscalRow = (period: string, label: string): TimePeriodData['format'] => {
    if (/^FY\d{2}-Q[1-4]$/i.test(period)) return 'quarter';
    if (/^FY\d{2}-\d{2}$/i.test(period)) return 'month';
    if (/^FY\d{2}$/i.test(period)) return 'year';
    if (/^Q[1-4]\b/i.test(label)) return 'quarter';
    if (/^\d{4}$/.test(label)) return 'year';
    return 'month';
  };

  useEffect(() => {
    let isMounted = true;

    const loadFiscalPeriods = async () => {
      // Load the period dropdown options for the selected granularity only.
      setPeriodsError(null);

      const isMonth = timePeriod.format === 'month';
      const isQuarter = timePeriod.format === 'quarter';
      const source = isMonth
        ? 'v_app_metrics_trends'
        : isQuarter
          ? 'v_app_quarter_metrics'
          : 'v_app_year_metrics';

      const selectFields = isMonth ? 'period, period_label, sort_order' : 'period, period_label, sort_order';

      const { data: periodData, error } = await supabase
        .from(source)
        .select(selectFields)
        .order('sort_order', { ascending: false });

      if (!isMounted) return;

      if (error) {
        setPeriodsError(error.message ?? 'Failed to load periods.');
        setAvailablePeriods({ month: [], quarter: [], year: [] });
        setPeriodLabelToCode({});
        return;
      }

      const rows = (periodData ?? []) as FiscalPeriodRow[];
      const nextAvailablePeriods: AvailablePeriods = { month: [], quarter: [], year: [] };
      const nextLabelToCode: Record<string, string> = {};

      rows.forEach((row) => {
        if (!row.period) return;
        const label = row.period_label ?? row.label;
        if (!label) return;
        const format = timePeriod.format;
        if (nextLabelToCode[label]) return;
        if (!nextAvailablePeriods[format].includes(label)) {
          nextAvailablePeriods[format].push(label);
        }
        nextLabelToCode[label] = row.period;
      });

      const nextAvailablePeriodsByFormat: AvailablePeriods = {
        month: isMonth ? nextAvailablePeriods.month : [],
        quarter: isQuarter ? nextAvailablePeriods.quarter : [],
        year: isMonth || isQuarter ? [] : nextAvailablePeriods.year,
      };

      setAvailablePeriods(nextAvailablePeriodsByFormat);
      setPeriodLabelToCode(nextLabelToCode);

      // Ensure the selected period stays valid when the format changes.
      const availableForFormat = nextAvailablePeriods[timePeriod.format];
      const resolvedPeriodLabel =
        availableForFormat.length > 0
          ? availableForFormat.includes(timePeriod.period)
            ? timePeriod.period
            : availableForFormat[0]
          : null;

      if (resolvedPeriodLabel && resolvedPeriodLabel !== timePeriod.period) {
        onTimePeriodChange({ format: timePeriod.format, period: resolvedPeriodLabel });
      }
    };

    loadFiscalPeriods();

    return () => {
      isMounted = false;
    };
  }, [onTimePeriodChange, timePeriod.format, timePeriod.period]);

  useEffect(() => {
    let isMounted = true;
    const selectedPeriodCode = periodLabelToCode[timePeriod.period];

    const loadAppMetrics = async () => {
      // Fetch the portfolio table + summary metrics for the selected period.
      setIsMetricsLoading(true);
      setMetricsError(null);

      const viewName =
        timePeriod.format === 'quarter'
          ? 'v_app_quarter_metrics'
          : timePeriod.format === 'year'
            ? 'v_app_year_metrics'
            : 'v_app_metrics_trends';

      const buildQuery = (field: 'period' | 'period_label', value: string) =>
        supabase.from(viewName).select('*').eq(field, value).order('app_name', { ascending: true });

      const queryQueue: Array<{ field: 'period' | 'period_label'; value: string }> = [];
      // Try period code first (if available), then fall back to label match.
      if (timePeriod.format === 'year') {
        queryQueue.push({ field: 'period_label', value: timePeriod.period });
        if (selectedPeriodCode) {
          queryQueue.push({ field: 'period', value: selectedPeriodCode });
        }
      } else {
        if (selectedPeriodCode) {
          queryQueue.push({ field: 'period', value: selectedPeriodCode });
        }
        queryQueue.push({ field: 'period_label', value: timePeriod.period });
      }

      let data: AppMetricsRow[] | null = null;
      let error: { message: string } | null = null;

      for (const query of queryQueue) {
        const result = await buildQuery(query.field, query.value);
        if (result.error) {
          error = error ?? result.error;
          continue;
        }
        if (result.data && result.data.length > 0) {
          data = result.data as AppMetricsRow[];
          error = null;
          break;
        }
        data = result.data as AppMetricsRow[];
      }

      if (!isMounted) return;

      if (error) {
        setMetricsError(error.message);
        setAppMetrics(null);
        setMetricsPeriodLabel(null);
        setLastUpdatedAt(null);
        setIsMetricsLoading(false);
        return;
      }

      const rows = (data ?? []) as AppMetricsRow[];
      // Use the most recent created_at in the period as the "Last updated" timestamp.
      const latestCreatedAt = rows.reduce<string | null>((latest, row) => {
        if (!row.created_at) return latest;
        if (!latest) return row.created_at;
        return new Date(row.created_at) > new Date(latest) ? row.created_at : latest;
      }, null);

      const mappedApps: AppData[] = rows.map((row) => {
        const changeValue = Number(
          (timePeriod.format === 'quarter'
            ? row.qoq_pct_change
            : timePeriod.format === 'year'
              ? row.yoy_pct_change
              : row.mom_pct_change) ?? 0
        );
        const trend: AppData['trend'] = changeValue > 0 ? 'up' : changeValue < 0 ? 'down' : 'stable';

        return {
          id: row.app_id,
          name: row.app_name ?? row.app_id ?? 'Unknown',
          overallScore: row.overall_score ?? 0,
          scoreMoM: changeValue,
          easeOfUse: Number(row.ease_of_use_avg ?? 0),
          usefulness: Number(row.usefulness_avg ?? 0),
          responses: row.response_count ?? 0,
          trend,
          metricsSystem: normalizeMetricsSystem(row.resolved_metrics_system ?? null),
        };
      });

      setAppMetrics(mappedApps.length ? mappedApps : null);
      setMetricsPeriodLabel(rows[0]?.period_label ?? timePeriod.period);
      setLastUpdatedAt(latestCreatedAt);
      setIsMetricsLoading(false);
    };

    loadAppMetrics();

    return () => {
      isMounted = false;
    };
  }, [periodLabelToCode, timePeriod.format, timePeriod.period]);

  // Get formatted period label for display

  // All summary cards and charts on this page use live data only.
  const periodApps = appMetrics ?? [];
  const hasApps = periodApps.length > 0;
  const portfolioScore = hasApps
    ? Math.round(periodApps.reduce((sum, app) => sum + app.overallScore, 0) / periodApps.length)
    : 0;
  
  const totalApps = periodApps.length;
  const goodApps = hasApps ? periodApps.filter((app) => app.overallScore >= 65).length : 0;
  const needsImprovementApps = hasApps ? periodApps.filter((app) => app.overallScore < 50).length : 0;
  const fairApps = hasApps ? periodApps.filter((app) => app.overallScore >= 50 && app.overallScore < 65).length : 0;
  const trendingUpApps = hasApps ? periodApps.filter((app) => app.trend === 'up').length : 0;
  const avgEaseOfUseValue = hasApps
    ? periodApps.reduce((sum, app) => sum + app.easeOfUse, 0) / periodApps.length
    : null;
  const avgUsefulnessValue = hasApps
    ? periodApps.reduce((sum, app) => sum + app.usefulness, 0) / periodApps.length
    : null;
  const mostImprovedDriver =
    avgEaseOfUseValue !== null && avgUsefulnessValue !== null
      ? avgEaseOfUseValue >= avgUsefulnessValue
        ? 'Ease of Use'
        : 'Usefulness'
      : null;
  const driverDelta =
    avgEaseOfUseValue !== null && avgUsefulnessValue !== null
      ? Math.abs(avgEaseOfUseValue - avgUsefulnessValue)
      : null;

  const getPercentage = (count: number) =>
    totalApps > 0 ? Math.round((count / totalApps) * 100) : 0;

  const topGainer = hasApps
    ? periodApps.reduce((max, app) => (app.scoreMoM > max.scoreMoM ? app : max))
    : null;
  const topLoser = hasApps
    ? periodApps.reduce((min, app) => (app.scoreMoM < min.scoreMoM ? app : min))
    : null;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const tableApps = appMetrics ?? [];
  const filteredApps = tableApps.filter((app) => {
    if (filter === 'good') return app.overallScore >= 65;
    if (filter === 'fair') return app.overallScore >= 50 && app.overallScore < 65;
    if (filter === 'needs-improvement') return app.overallScore < 50;
    if (filter === 'pendo') return app.metricsSystem === 'pendo';
    if (filter === 'medallia') return app.metricsSystem === 'medallia';
    return true;
  });

  const sortedApps = [...filteredApps].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    if (sortField === 'name') return multiplier * a.name.localeCompare(b.name);
    return multiplier * (a[sortField] - b[sortField]);
  });

  const hasTableApps = tableApps.length > 0;
  const tablePortfolioScore = hasTableApps
    ? Math.round(tableApps.reduce((sum, app) => sum + app.overallScore, 0) / tableApps.length)
    : 0;
  const avgEaseOfUse = hasTableApps
    ? (tableApps.reduce((sum, app) => sum + app.easeOfUse, 0) / tableApps.length).toFixed(1)
    : '--';
  const avgUsefulness = hasTableApps
    ? (tableApps.reduce((sum, app) => sum + app.usefulness, 0) / tableApps.length).toFixed(1)
    : '--';
  const totalResponses = hasTableApps ? tableApps.reduce((sum, app) => sum + app.responses, 0) : 0;
  const dataPeriodLabel = metricsPeriodLabel ?? timePeriod.period;
  const metricsStatus = isMetricsLoading
    ? 'Loading metrics from Supabase...'
    : metricsError
      ? `Supabase error: ${metricsError}`
      : periodsError
        ? `Supabase error: ${periodsError}`
      : appMetrics
        ? `Live data: ${metricsPeriodLabel ?? 'selected period'}`
        : metricsPeriodLabel
          ? `No data found for ${metricsPeriodLabel}.`
          : 'No periods available in Supabase for this view.';

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <NavigationHeader
        currentView="home"
        onNavigateHome={() => {}}
        onNavigateAllApps={() => onNavigateToView('all-apps')}
        onNavigateKeyJourneys={() => onNavigateToView('all-journeys')}
        onNavigateTopPains={() => onNavigateToView('top-pains')}
        onNavigateAdmin={onNavigateAdmin}
        onNavigateExport={onNavigateExport}
        title="Store Ops Portfolio Experience Metrics"
        subtitle="Performance dashboard for all applications and journeys"
        lastUpdated={formatLastUpdated(lastUpdatedAt)}
      />

      {/* Time Period Selection */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <TimeSelector 
            value={timePeriod} 
            onChange={onTimePeriodChange}
            variant="light"
            availablePeriods={availablePeriods}
          />
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Portfolio Health Summary */}
        <section className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Key Metrics with Distribution Bar */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-slate-700 font-medium">Key Metrics</h2>
              
              {/* Key Metrics Callouts - Compact */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <div className="text-green-900 text-lg font-semibold mb-0.5">{goodApps}/{totalApps}</div>
                  <div className="text-green-700 text-xs font-medium">Apps rated "Good"</div>
                  <div className="text-green-600 text-xs">≥65 points</div>
                </div>
                <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                  <div className="text-orange-900 text-lg font-semibold mb-0.5">{needsImprovementApps}/{totalApps}</div>
                  <div className="text-orange-700 text-xs font-medium">Apps "Needs Improvement"</div>
                  <div className="text-orange-600 text-xs">&lt;50 points</div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-blue-900 text-lg font-semibold mb-0.5">{trendingUpApps}/{totalApps}</div>
                  <div className="text-blue-700 text-xs font-medium">Trending Up</div>
                  <div className="text-blue-600 text-xs">Last 3 months</div>
                </div>
              </div>

              {/* Score distribution bar */}
              <div>
                <h3 className="text-slate-700 text-sm font-medium mb-2">Portfolio Score Distribution</h3>
                <div className="flex h-12 rounded overflow-hidden">
                  <div
                    className="bg-green-500 flex items-center justify-center"
                    style={{ width: `${getPercentage(goodApps)}%` }}
                  >
                    <span className="text-white font-semibold">{getPercentage(goodApps)}%</span>
                  </div>
                  <div
                    className="bg-yellow-500 flex items-center justify-center"
                    style={{ width: `${getPercentage(fairApps)}%` }}
                  >
                    <span className="text-white font-semibold">{getPercentage(fairApps)}%</span>
                  </div>
                  <div
                    className="bg-orange-500 flex items-center justify-center"
                    style={{ width: `${getPercentage(needsImprovementApps)}%` }}
                  >
                    <span className="text-white font-semibold">{getPercentage(needsImprovementApps)}%</span>
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-xs">
                  <span className="text-green-700">Good (≥65)</span>
                  <span className="text-yellow-700">Fair (50-64)</span>
                  <span className="text-orange-700">Needs Improvement (&lt;50)</span>
                </div>
              </div>
            </div>

            {/* Top Movers - Compact */}
            <div className="space-y-2">
              <h2 className="text-slate-700 font-medium mb-2">Top Movers</h2>
              
              <Card
                className="p-3 border-green-200 bg-green-50 hover:border-green-300 transition-colors"
                onClick={() => topGainer && onNavigateToApp(topGainer.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="size-4 text-green-600" />
                    <span className="text-green-900 text-xs font-medium">Biggest Gain</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-900 text-sm">{topGainer?.name ?? '--'}</div>
                    <div className="text-green-700 text-sm font-semibold">
                      {topGainer ? formatScoreChange(topGainer.scoreMoM) : '--'}
                    </div>
                  </div>
                </div>
              </Card>

              <Card
                className="p-3 border-red-200 bg-red-50 hover:border-red-300 transition-colors"
                onClick={() => topLoser && onNavigateToApp(topLoser.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <TrendingDown className="size-4 text-red-600" />
                    <span className="text-red-900 text-xs font-medium">Biggest Drop</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-900 text-sm">{topLoser?.name ?? '--'}</div>
                    <div className="text-red-700 text-sm font-semibold">
                      {topLoser ? formatScoreChange(topLoser.scoreMoM) : '--'}
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-3 border-blue-200 bg-blue-50">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="size-4 text-blue-600" />
                    <span className="text-blue-900 text-xs font-medium">Most Improved Driver</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-900 text-sm">{mostImprovedDriver ?? '--'}</div>
                    <div className="text-blue-700 text-sm font-semibold">
                      {driverDelta !== null ? `+${driverDelta.toFixed(1)}` : '--'}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Portfolio Score Table */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-900">Portfolio Score Table — {dataPeriodLabel}</h2>
            <Select value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>By Score</SelectLabel>
                <SelectItem value="all">All Apps</SelectItem>
                <SelectItem value="good">Good (≥65)</SelectItem>
                <SelectItem value="fair">Fair (50-64)</SelectItem>
                <SelectItem value="needs-improvement">Needs Improvement (&lt;50)</SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Feedback via</SelectLabel>
                  <SelectItem value="pendo">Pendo</SelectItem>
                  <SelectItem value="medallia">Medallia</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-slate-500 mb-2">{metricsStatus}</div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th
                      className="px-6 py-3 text-left cursor-pointer hover:bg-slate-200"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2 text-slate-700">
                        Application
                        {sortField === 'name' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-center cursor-pointer hover:bg-slate-200"
                      onClick={() => handleSort('overallScore')}
                    >
                      <div className="flex items-center justify-center gap-2 text-slate-700">
                        Overall Score
                        {sortField === 'overallScore' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-center cursor-pointer hover:bg-slate-200"
                      onClick={() => handleSort('scoreMoM')}
                    >
                      <div className="flex items-center justify-center gap-2 text-slate-700">
                        Score {timePeriod.format === 'month' ? 'MoM' : timePeriod.format === 'quarter' ? 'QoQ' : 'YoY'}
                        {sortField === 'scoreMoM' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-center cursor-pointer hover:bg-slate-200"
                      onClick={() => handleSort('easeOfUse')}
                    >
                      <div className="flex items-center justify-center gap-2 text-slate-700">
                        Ease of Use
                        {sortField === 'easeOfUse' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-center cursor-pointer hover:bg-slate-200"
                      onClick={() => handleSort('usefulness')}
                    >
                      <div className="flex items-center justify-center gap-2 text-slate-700">
                        Usefulness
                        {sortField === 'usefulness' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-center cursor-pointer hover:bg-slate-200"
                      onClick={() => handleSort('responses')}
                    >
                      <div className="flex items-center justify-center gap-2 text-slate-700">
                        Responses
                        {sortField === 'responses' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedApps.length === 0 && (
                    <tr>
                      <td className="px-6 py-6 text-center text-slate-500" colSpan={6}>
                        No portfolio data available for this period.
                      </td>
                    </tr>
                  )}
                  {sortedApps.map((app) => (
                    <tr
                      key={app.id}
                      className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer"
                      onClick={() => onNavigateToApp(app.id)}
                    >
                      <td className="px-6 py-4 text-slate-900">{app.name}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded ${getScoreBgColor(app.overallScore)} ${getScoreColor(app.overallScore)} font-semibold`}>
                          {app.overallScore}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-center ${getTrendColor(app.trend)}`}>
                        {formatScoreChange(app.scoreMoM)} {getTrendIcon(app.trend)}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-700">{app.easeOfUse.toFixed(1)}</td>
                      <td className="px-6 py-4 text-center text-slate-700">{app.usefulness.toFixed(1)}</td>
                      <td className="px-6 py-4 text-center text-slate-700">{app.responses}</td>
                    </tr>
                  ))}
                  {hasTableApps && (
                    <tr className="bg-slate-100 font-semibold">
                      <td className="px-6 py-4 text-slate-900">Portfolio Average</td>
                      <td className="px-6 py-4 text-center text-slate-900">{tablePortfolioScore}</td>
                      <td className="px-6 py-4 text-center text-slate-900">--</td>
                      <td className="px-6 py-4 text-center text-slate-900">{avgEaseOfUse}</td>
                      <td className="px-6 py-4 text-center text-slate-900">{avgUsefulness}</td>
                      <td className="px-6 py-4 text-center text-slate-900">{totalResponses.toLocaleString()}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Entry Point Navigation Cards */}
        <section className="mb-8">
          <h2 className="text-slate-900 mb-4">Explore By</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 border-slate-200 hover:border-orange-500 hover:shadow-md cursor-pointer transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-100 rounded">
                  <LayoutGrid className="size-5 text-orange-600" />
                </div>
                <h3 className="text-slate-900">Apps</h3>
              </div>
              <p className="text-slate-600 mb-4">View year-to-date scorecard with quarterly and monthly metrics for all applications</p>
              <Button className="w-full bg-orange-600 hover:bg-orange-700" onClick={() => onNavigateToView('all-apps')}>
                View All Apps Over Time
              </Button>
            </Card>

            <Card className="p-6 border-slate-200 hover:border-orange-500 hover:shadow-md cursor-pointer transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-100 rounded">
                  <Route className="size-5 text-orange-600" />
                </div>
                <h3 className="text-slate-900">Journeys</h3>
              </div>
              <p className="text-slate-600 mb-4">Analyze end-to-end journeys across touchpoints and applications</p>
              <Button className="w-full bg-orange-600 hover:bg-orange-700" onClick={() => onNavigateToView('all-journeys')}>
                View All Journeys
              </Button>
            </Card>

            <Card className="p-6 border-slate-200 hover:border-orange-500 hover:shadow-md cursor-pointer transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-100 rounded">
                  <TrendingDown className="size-5 text-orange-600" />
                </div>
                <h3 className="text-slate-900">Top Pains</h3>
              </div>
              <p className="text-slate-600 mb-4">Track recurring pain points by app, across apps, and over time</p>
              <Button className="w-full bg-orange-600 hover:bg-orange-700" onClick={() => onNavigateToView('top-pains')}>
                View Top Pains
              </Button>
            </Card>
          </div>
        </section>

        
      </div>
    </div>
  );
}