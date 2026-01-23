import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import type { TimePeriodData } from './TimeSelector';
import { TimeSelector } from './TimeSelector';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ScoreDriversThemes, ThemeCategory } from './ScoreDriversThemes';
import { NavigationHeader } from './NavigationHeader';
import { supabase } from '../lib/supabaseClient';

interface AppDetailEnhancedProps {
  appId: string;
  timePeriod: TimePeriodData;
  onTimePeriodChange: (period: TimePeriodData) => void;
  onNavigateBack: () => void;
  onNavigateHome?: () => void;
  onNavigateAllApps?: () => void;
  onNavigateKeyJourneys?: () => void;
  onNavigateTopPains?: () => void;
  onNavigateAdmin?: () => void;
  onNavigateExport?: () => void;
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
  ease_of_use_topbox_pct: number | null;
  ease_of_use_bottombox_pct: number | null;
  usefulness_topbox_pct: number | null;
  usefulness_bottombox_pct: number | null;
  response_count: number | null;
};

export function AppDetailEnhanced({
  appId,
  timePeriod,
  onTimePeriodChange,
  onNavigateBack,
  onNavigateHome,
  onNavigateAllApps,
  onNavigateKeyJourneys,
  onNavigateTopPains,
  onNavigateAdmin,
  onNavigateExport,
}: AppDetailEnhancedProps) {
  // Live series for one app across time; drives header, summary, and charts.
  const [appSeries, setAppSeries] = useState<AppMetricsRow[]>([]);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [appName, setAppName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const getLabel = (row: AppMetricsRow) => row.period_label ?? row.period;

  useEffect(() => {
    let isMounted = true;

    const loadAppSeries = async () => {
      // Load all periods for this app from the selected granularity view.
      setIsLoading(true);
      setMetricsError(null);

      const viewName =
        timePeriod.format === 'quarter'
          ? 'v_app_quarter_metrics'
          : timePeriod.format === 'year'
            ? 'v_app_year_metrics'
            : 'v_app_metrics_trends';

      const { data, error } = await supabase
        .from(viewName)
        .select(
          'app_id, app_name, period, period_label, sort_order, overall_score, ease_of_use_avg, usefulness_avg, ease_of_use_topbox_pct, ease_of_use_bottombox_pct, usefulness_topbox_pct, usefulness_bottombox_pct, response_count'
        )
        .eq('app_id', appId)
        .order('sort_order', { ascending: true });

      if (!isMounted) return;

      if (error) {
        setMetricsError(error.message);
        setAppSeries([]);
        setAvailablePeriods([]);
        setAppName(null);
        setIsLoading(false);
        return;
      }

      const rows = (data ?? []) as AppMetricsRow[];
      setAppSeries(rows);
      setAppName(rows[0]?.app_name ?? null);

      // Build period options from rows (most recent first), de-duped by label.
      const sortedDesc = [...rows].sort(
        (a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0)
      );
      const periods: string[] = [];
      const seen = new Set<string>();
      sortedDesc.forEach((row) => {
        const label = getLabel(row);
        if (seen.has(label)) return;
        seen.add(label);
        periods.push(label);
      });

      setAvailablePeriods(periods);
      // Keep the selected period in sync with available data.
      if (periods.length > 0 && !periods.includes(timePeriod.period)) {
        onTimePeriodChange({ format: timePeriod.format, period: periods[0] });
      }
      setIsLoading(false);
    };

    loadAppSeries();

    return () => {
      isMounted = false;
    };
  }, [appId, onTimePeriodChange, timePeriod.format, timePeriod.period]);

  const currentPeriodData = useMemo(() => {
    // Pick the selected period's row (fallback to latest if not found).
    if (appSeries.length === 0) return null;
    return appSeries.find((row) => getLabel(row) === timePeriod.period) ?? appSeries[appSeries.length - 1];
  }, [appSeries, timePeriod.period]);

  const chartData = useMemo(() => {
    // Convert rows into chart-ready shape; top/bottom boxes are averaged across drivers.
    if (appSeries.length === 0) return [];
    return appSeries.map((row) => {
      const easeTop = row.ease_of_use_topbox_pct ?? 0;
      const usefulTop = row.usefulness_topbox_pct ?? 0;
      const easeBottom = row.ease_of_use_bottombox_pct ?? 0;
      const usefulBottom = row.usefulness_bottombox_pct ?? 0;
      const avgTop = (easeTop + usefulTop) / 2;
      const avgBottom = (easeBottom + usefulBottom) / 2;

      return {
        period: getLabel(row),
        score: row.overall_score ?? 0,
        topBox: avgTop,
        bottomBox: avgBottom,
        easeOfUseScore: row.ease_of_use_avg ?? 0,
        easeOfUseTopBox: easeTop,
        easeOfUseBottomBox: easeBottom,
        usefulnessScore: row.usefulness_avg ?? 0,
        usefulnessTopBox: usefulTop,
        usefulnessBottomBox: usefulBottom,
      };
    });
  }, [appSeries]);

  const headerSubtitle = timePeriod.period;

  if (!isLoading && metricsError) {
    return <div className="p-6 text-slate-600">Supabase error: {metricsError}</div>;
  }

  if (!isLoading && !currentPeriodData) {
    return <div className="p-6 text-slate-600">No data found for this app.</div>;
  }

  // Feed the TimeSelector only periods valid for the current format.
  const availablePeriodsByFormat: Partial<Record<TimePeriodData['format'], string[]>> = {
    [timePeriod.format]: availablePeriods,
  };
  const currentPeriodIndex = availablePeriods.findIndex(p => p === timePeriod.period);

  const navigateToPreviousPeriod = () => {
    if (currentPeriodIndex > 0) {
      onTimePeriodChange({
        format: timePeriod.format,
        period: availablePeriods[currentPeriodIndex - 1],
      });
    }
  };

  const navigateToNextPeriod = () => {
    if (currentPeriodIndex < availablePeriods.length - 1) {
      onTimePeriodChange({
        format: timePeriod.format,
        period: availablePeriods[currentPeriodIndex + 1],
      });
    }
  };

  const jumpToPeriod = (period: string) => {
    onTimePeriodChange({
      format: timePeriod.format,
      period,
    });
  };

  const shortPeriodLabels = availablePeriods.map((p) => {
    if (timePeriod.format === 'month') {
      const parts = p.split(' ');
      return `${parts[0].substring(0, 3)} '${parts[1]?.substring(2) ?? ''}`;
    } else if (timePeriod.format === 'quarter') {
      return p.replace(' 2025', " '25").replace(' 2024', " '24");
    }
    return p;
  });

  // Feedback themes matching the report format
  const feedbackThemes: ThemeCategory[] = [
    {
      title: 'Receipt Lookup & Card Swipe Errors',
      percentage: 21,
      type: 'negative',
      narratives: [
        'ApplePay and credit card lookups often return errors, forcing fallback to manual search.',
        'Card swipe and tap-to-pay receipt lookup frequently fails or times out across registers.',
      ],
      metadata: {
        monthsActive: 9,
        trendDirection: 'stable',
        crossAppCount: 3,
        status: 'unresolved',
      },
      exampleComments: [
        { text: 'The card reader never works on the first try, always have to manually type everything', date: 'Nov 12, 2025', userRole: 'Store Associate', rating: 2 },
        { text: 'ApplePay lookups fail about 50% of the time, very frustrating for customers', date: 'Nov 8, 2025', userRole: 'Cashier', rating: 1 },
        { text: 'Receipt lookup by card swipe times out constantly during busy hours', date: 'Nov 5, 2025', userRole: 'Customer Service', rating: 2 },
      ],
    },
    {
      title: 'System Errors & Performance',
      percentage: 11,
      type: 'negative',
      narratives: [
        'Recurring "Something went wrong" and "Whoops" messages block item scanning and return completion.',
        'Performance degrades during large returns; system slows significantly and may freeze.',
      ],
      metadata: {
        monthsActive: 6,
        trendDirection: 'increasing',
        trendPercentage: 15,
        status: 'unresolved',
      },
      exampleComments: [
        { text: 'Getting "Whoops" errors multiple times per shift now, never used to happen', date: 'Nov 14, 2025', userRole: 'Returns Desk', rating: 1 },
        { text: 'System froze completely during a big return yesterday, had to restart', date: 'Nov 10, 2025', userRole: 'Store Associate', rating: 1 },
      ],
    },
    {
      title: 'Even Exchange & RTV Issues',
      percentage: 7,
      type: 'negative',
      narratives: [
        'Even exchanges with protection plans cannot be processed in OneReturns; associates revert to standalone returns.',
        'Damaged barcodes prevent RTV processing; system does not allow manual SKU entry.',
      ],
      metadata: {
        monthsActive: 3,
        trendDirection: 'stable',
        status: 'improving',
      },
      exampleComments: [
        { text: 'Cannot process even exchanges with protection plans, have to do it the old way', date: 'Nov 9, 2025', userRole: 'Customer Service', rating: 2 },
      ],
    },
    {
      title: 'Improved Speed & Reliability',
      percentage: 18,
      type: 'positive',
      narratives: [
        'Recent updates have significantly improved load times and system responsiveness.',
        'Fewer crashes and errors compared to earlier quarters.',
      ],
      metadata: {
        isNew: true,
        trendDirection: 'increasing',
        trendPercentage: 25,
        status: 'stabilized',
      },
      exampleComments: [
        { text: 'System is much faster now, really notice the difference from last month', date: 'Nov 15, 2025', userRole: 'Store Manager', rating: 5 },
        { text: 'Love the speed improvements, makes returns go so much quicker', date: 'Nov 13, 2025', userRole: 'Cashier', rating: 5 },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <NavigationHeader
        currentView="other"
        onNavigateHome={onNavigateHome || onNavigateBack}
        onNavigateAllApps={onNavigateAllApps || onNavigateBack}
        onNavigateKeyJourneys={onNavigateKeyJourneys || onNavigateBack}
        onNavigateTopPains={onNavigateTopPains || onNavigateBack}
        onNavigateAdmin={onNavigateAdmin}
        onNavigateExport={onNavigateExport}
        title={appName ?? appId}
        subtitle={headerSubtitle}
        showExportButton={true}
      />

      {/* Period Navigation */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateBack}
              className="text-slate-600 hover:bg-slate-200 hover:text-slate-900 flex-shrink-0"
            >
              <ArrowLeft className="size-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <TimeSelector
                value={timePeriod}
                onChange={onTimePeriodChange}
                variant="light"
                availablePeriods={availablePeriodsByFormat}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Current Score Summary */}
        <section className="mb-8">
          <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-lg">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h2 className="text-slate-300">Overall Score — {headerSubtitle}</h2>
              <span className="rounded-full bg-slate-800/80 px-3 py-1 text-xs font-semibold text-orange-100">
                {appName ?? appId}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl sm:text-[72px] font-semibold text-orange-500">{currentPeriodData?.overall_score ?? 0}</span>
              <span className="text-slate-400">/100</span>
            </div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              <div>
                <div className="text-4xl sm:text-[48px] font-semibold text-orange-500">{currentPeriodData?.ease_of_use_topbox_pct ?? 0}%</div>
                <div className="text-slate-300">find this product</div>
                <div className="text-orange-500">easy to use</div>
                <div className="text-white mt-2">{currentPeriodData?.ease_of_use_avg ?? 0}/5</div>
              </div>
              <div>
                <div className="text-4xl sm:text-[48px] font-semibold text-orange-500">{currentPeriodData?.usefulness_topbox_pct ?? 0}%</div>
                <div className="text-slate-300">find this product</div>
                <div className="text-orange-500">useful</div>
                <div className="text-white mt-2">{currentPeriodData?.usefulness_avg ?? 0}/5</div>
              </div>
              <div>
                <div className="text-white mt-4">
                  {(currentPeriodData?.response_count ?? 0).toLocaleString()} Responses
                </div>
                <div className="text-slate-400 mt-2 text-sm">*Based on UX-Lite Metric Calculation</div>
              </div>
            </div>
          </div>
        </section>

        {/* Score Trend Chart */}
        <section className="mb-8">
          <Card className="p-6 border-slate-200">
            <h2 className="text-slate-900 mb-4 text-center">
              <div>UX Lite Score</div>
              <div className="text-sm font-normal text-slate-600">(Score, Top & Bottom Box)</div>
            </h2>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis yAxisId="left" domain={[0, 100]} stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#64748b" style={{ fontSize: '12px' }} tickFormatter={(value) => `${value}%`} />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'score') return [value, 'UX-Lite Score'];
                    if (name === 'topBox') return [`${value}%`, 'Top Box %'];
                    if (name === 'bottomBox') return [`${value}%`, 'Bottom Box %'];
                    return [value, name];
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  payload={[
                    { value: 'Top Box %', type: 'rect', color: '#84cc16' },
                    { value: 'Bottom Box %', type: 'rect', color: '#ef4444' },
                    { value: 'UX-Lite Score', type: 'line', color: '#3b82f6' },
                  ]}
                />
                <Bar yAxisId="right" dataKey="topBox" fill="#84cc16" name="Top Box %" />
                <Bar yAxisId="right" dataKey="bottomBox" fill="#ef4444" name="Bottom Box %" />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="score" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  dot={{ fill: '#3b82f6', r: 4 }} 
                  name="UX-Lite Score"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </section>

        {/* Driver Charts Side-by-Side */}
        <section className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ease of Use */}
            <Card className="p-6 border-slate-200">
              <h2 className="text-slate-900 mb-4 text-center">
                <div>Easy to Use</div>
                <div className="text-sm font-normal text-slate-600">(Score, Top & Bottom Box)</div>
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" stroke="#64748b" style={{ fontSize: '11px' }} />
                  <YAxis yAxisId="left" domain={[0, 5]} stroke="#64748b" style={{ fontSize: '11px' }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#64748b" style={{ fontSize: '11px' }} tickFormatter={(value) => `${value}%`} />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name === 'easeOfUseScore') return [value, 'Ease of Use Score'];
                      if (name === 'easeOfUseTopBox') return [`${value}%`, 'Top Box %'];
                      if (name === 'easeOfUseBottomBox') return [`${value}%`, 'Bottom Box %'];
                      return [value, name];
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }}
                    payload={[
                      { value: 'Top Box %', type: 'rect', color: '#84cc16' },
                      { value: 'Bottom Box %', type: 'rect', color: '#ef4444' },
                      { value: 'Score', type: 'line', color: '#3b82f6' },
                    ]}
                  />
                  <Bar yAxisId="right" dataKey="easeOfUseTopBox" fill="#84cc16" name="Top Box %" />
                  <Bar yAxisId="right" dataKey="easeOfUseBottomBox" fill="#ef4444" name="Bottom Box %" />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="easeOfUseScore" 
                    stroke="#3b82f6" 
                    strokeWidth={2} 
                    dot={{ fill: '#3b82f6', r: 4 }} 
                    name="Score"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>

            {/* Usefulness */}
            <Card className="p-6 border-slate-200">
              <h2 className="text-slate-900 mb-4 text-center">
                <div>Usefulness</div>
                <div className="text-sm font-normal text-slate-600">(Score, Top & Bottom Box)</div>
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" stroke="#64748b" style={{ fontSize: '11px' }} />
                  <YAxis yAxisId="left" domain={[0, 5]} stroke="#64748b" style={{ fontSize: '11px' }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#64748b" style={{ fontSize: '11px' }} tickFormatter={(value) => `${value}%`} />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name === 'usefulnessScore') return [value, 'Usefulness Score'];
                      if (name === 'usefulnessTopBox') return [`${value}%`, 'Top Box %'];
                      if (name === 'usefulnessBottomBox') return [`${value}%`, 'Bottom Box %'];
                      return [value, name];
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }}
                    payload={[
                      { value: 'Top Box %', type: 'rect', color: '#84cc16' },
                      { value: 'Bottom Box %', type: 'rect', color: '#ef4444' },
                      { value: 'Score', type: 'line', color: '#3b82f6' },
                    ]}
                  />
                  <Bar yAxisId="right" dataKey="usefulnessTopBox" fill="#84cc16" name="Top Box %" />
                  <Bar yAxisId="right" dataKey="usefulnessBottomBox" fill="#ef4444" name="Bottom Box %" />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="usefulnessScore" 
                    stroke="#3b82f6" 
                    strokeWidth={2} 
                    dot={{ fill: '#3b82f6', r: 4 }} 
                    name="Score"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </section>

        {/* Feedback Themes using reusable component */}
        <section className="mb-8">
          <ScoreDriversThemes 
            themes={feedbackThemes} 
            density="standard"
            title={`${headerSubtitle.toUpperCase()} FEEDBACK THEMES`}
            subtitle="AI Supported Summary"
          />
        </section>
      </div>
    </div>
  );
}