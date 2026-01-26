import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Clock,
  Info,
  Link2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { NavigationHeader } from './NavigationHeader';
import { supabase } from '../lib/supabaseClient';

interface TopPainDetailProps {
  painId: string;
  scopeLabel?: string;
  defaultAppName?: string;
  onNavigateBack: () => void;
  onNavigateHome?: () => void;
  onNavigateAllApps?: () => void;
  onNavigateKeyJourneys?: () => void;
  onNavigateTopPains?: () => void;
  onNavigateAdmin?: () => void;
  onNavigateExport?: () => void;
  showAdminButton?: boolean;
}

interface PainPoint {
  id: string;
  title: string;
  percentage: number;
  affectedApps: string[];
  monthsActive: number;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  trendPercentage?: number;
  totalMentions: number;
  estimatedMentionsCount: number;
  impactScore: number;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

type NormalizedThemeRow = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  is_active: boolean | null;
};

type ThemeMappingRow = {
  theme_id: string;
  normalized_theme_id: string;
  confidence: number | null;
};

type ObservationRow = {
  period: string | null;
  period_label: string | null;
  sort_order: number | null;
  theme_id: string | null;
  theme_title: string | null;
  theme_type: string | null;
  app_id: string | null;
  app_name: string | null;
  severity: string | null;
  status: string | null;
  months_active: number | null;
  mentions_count: number | null;
  mentions_estimated?: boolean | null;
  percent_of_feedback: number | null;
  trend_direction: string | null;
  trend_percentage: number | null;
  narrative: string | null;
  bullets: string[] | null;
};

type AppMetricRow = {
  app_id: string | null;
  app_name: string | null;
  period: string | null;
  period_label: string | null;
  overall_score: number | null;
};

type ThemeBreakdown = {
  id: string;
  name: string;
  monthsActive: number;
  affectedApps: string[];
  percentage: number;
  monthBreakdown: ThemeMonth[];
};

type ThemeMonth = {
  period: string;
  periodLabel: string;
  periodSort: number;
  appName: string;
  percentage: number;
  mentions: number;
  status: string;
  summaryPoints: string[];
};

const getSeverityLabel = (severity: PainPoint['severity']) => {
  if (severity === 'high') return 'High Severity';
  if (severity === 'medium') return 'Medium Severity';
  return 'Low Severity';
};

const getSeverityIcon = (severity: PainPoint['severity']) => {
  if (severity === 'high') return AlertTriangle;
  if (severity === 'medium') return AlertCircle;
  return Info;
};

const getStatusMultiplier = (status?: string) => {
  switch (status) {
    case 'resolved':
      return 0.3;
    case 'stabilized':
      return 0.6;
    case 'improving':
      return 0.85;
    case 'unresolved':
    default:
      return 1;
  }
};

const buildPainPoints = (
  observations: ObservationRow[],
  normalizedThemes: NormalizedThemeRow[],
  mappings: ThemeMappingRow[],
): PainPoint[] => {
  const normalizedById = new Map(normalizedThemes.map((theme) => [theme.id, theme]));
  const mappingByThemeId = new Map(mappings.map((mapping) => [mapping.theme_id, mapping]));
  const grouped = new Map<
    string,
    PainPoint & {
      severityCounts: Record<string, number>;
      trendCounts: Record<string, number>;
      monthsTotals: number;
      periodSet: Set<string>;
      latestPeriodSort: number | null;
      latestStatusCounts: Record<string, number>;
      percentageTotal: number;
      statusWeightedMentions: number;
      hasMentionsData: boolean;
      estimatedMentionsCount: number;
    }
  >();

  observations.forEach((row) => {
    if (!row.theme_id) return;
    const mapping = mappingByThemeId.get(row.theme_id);
    if (!mapping) return;
    const normalized = normalizedById.get(mapping.normalized_theme_id);
    if (!normalized || normalized.is_active === false) return;

    if (!grouped.has(normalized.key)) {
      grouped.set(normalized.key, {
        id: normalized.key,
        title: normalized.title,
        percentage: 0,
        affectedApps: [],
        monthsActive: 0,
        trendDirection: 'stable',
        totalMentions: 0,
        estimatedMentionsCount: 0,
        impactScore: 0,
        description: normalized.description ?? '',
        severity: 'low',
        severityCounts: { high: 0, medium: 0, low: 0 },
        trendCounts: { increasing: 0, decreasing: 0, stable: 0 },
        monthsTotals: 0,
        periodSet: new Set<string>(),
        latestPeriodSort: null,
        latestStatusCounts: { unresolved: 0, improving: 0, stabilized: 0, resolved: 0 },
        percentageTotal: 0,
        statusWeightedMentions: 0,
        hasMentionsData: false,
      });
    }

    const group = grouped.get(normalized.key)!;
    const severity = (row.severity ?? 'low') as 'high' | 'medium' | 'low';
    const rowStatus = row.status ?? undefined;
    const rowSort = row.sort_order ?? null;
    if (row.mentions_count !== null && row.mentions_count !== undefined) {
      group.hasMentionsData = true;
      group.totalMentions += row.mentions_count;
    }
    const baseMentions = row.mentions_count ?? row.percent_of_feedback ?? 0;
    group.statusWeightedMentions += baseMentions * getStatusMultiplier(row.status ?? undefined);
    group.percentageTotal += row.percent_of_feedback ?? 0;
    if (row.mentions_estimated) {
      group.estimatedMentionsCount += row.mentions_count ?? 0;
    }
    group.affectedApps.push(row.app_name ?? row.app_id ?? 'Unknown');
    group.monthsTotals += row.months_active ?? 0;
    if (row.period) {
      group.periodSet.add(row.period);
    }
    group.severityCounts[severity] += 1;
    const trend = row.trend_direction ?? 'stable';
    if (trend === 'increasing' || trend === 'decreasing' || trend === 'stable') {
      group.trendCounts[trend] += 1;
    }

    if (rowSort !== null) {
      if (group.latestPeriodSort === null || rowSort > group.latestPeriodSort) {
        group.latestPeriodSort = rowSort;
        group.latestStatusCounts = { unresolved: 0, improving: 0, stabilized: 0, resolved: 0 };
      }
      if (rowSort === group.latestPeriodSort) {
        if (rowStatus === 'unresolved') group.latestStatusCounts.unresolved += 1;
        if (rowStatus === 'improving') group.latestStatusCounts.improving += 1;
        if (rowStatus === 'stabilized') group.latestStatusCounts.stabilized += 1;
        if (rowStatus === 'resolved' || rowStatus === 'resolved_monitoring') {
          group.latestStatusCounts.resolved += 1;
        }
      }
    }
  });

  const pains: PainPoint[] = [];
  grouped.forEach((group) => {
    const uniqueApps = Array.from(new Set(group.affectedApps));
    const totalMappings = group.severityCounts.high + group.severityCounts.medium + group.severityCounts.low;
    group.percentage = totalMappings > 0 ? group.percentageTotal / totalMappings : 0;
    if (group.periodSet.size > 0) {
      group.monthsActive = group.periodSet.size;
    } else {
      group.monthsActive =
        totalMappings > 0 ? Math.max(1, Math.round(group.monthsTotals / totalMappings)) : 0;
    }
    if (!group.hasMentionsData) {
      group.totalMentions = group.percentageTotal;
    }

    if (group.severityCounts.high >= group.severityCounts.medium && group.severityCounts.high >= group.severityCounts.low) {
      group.severity = 'high';
    } else if (group.severityCounts.medium >= group.severityCounts.low) {
      group.severity = 'medium';
    } else {
      group.severity = 'low';
    }

    if (group.trendCounts.increasing > group.trendCounts.decreasing && group.trendCounts.increasing > totalMappings / 3) {
      group.trendDirection = 'increasing';
    } else if (group.trendCounts.decreasing > group.trendCounts.increasing && group.trendCounts.decreasing > totalMappings / 3) {
      group.trendDirection = 'decreasing';
    } else {
      group.trendDirection = 'stable';
    }

    const severityMultiplier = group.severity === 'high' ? 3 : group.severity === 'medium' ? 2 : 1;
    const trendMultiplier =
      group.trendDirection === 'increasing' ? 1.2 : group.trendDirection === 'decreasing' ? 0.8 : 1;
    let latestStatusMultiplier = 1;
    if (group.latestStatusCounts.unresolved > 0) {
      latestStatusMultiplier = 1;
    } else if (group.latestStatusCounts.improving > 0) {
      latestStatusMultiplier = 0.85;
    } else if (group.latestStatusCounts.stabilized > 0) {
      latestStatusMultiplier = 0.6;
    } else if (group.latestStatusCounts.resolved > 0) {
      latestStatusMultiplier = 0.3;
    }
    group.impactScore =
      group.statusWeightedMentions
      * severityMultiplier
      * trendMultiplier
      * Math.max(uniqueApps.length, 1)
      * latestStatusMultiplier;

    pains.push({
      ...group,
      affectedApps: uniqueApps,
    });
  });

  pains.sort((a, b) => b.impactScore - a.impactScore);
  return pains;
};

export function TopPainDetail({
  painId,
  scopeLabel = 'All Categories',
  defaultAppName,
  onNavigateBack,
  onNavigateHome,
  onNavigateAllApps,
  onNavigateKeyJourneys,
  onNavigateTopPains,
  onNavigateAdmin,
  onNavigateExport,
  showAdminButton,
}: TopPainDetailProps) {
  const [observations, setObservations] = useState<ObservationRow[]>([]);
  const [normalizedThemes, setNormalizedThemes] = useState<NormalizedThemeRow[]>([]);
  const [themeMappings, setThemeMappings] = useState<ThemeMappingRow[]>([]);
  const [appScoresByPeriod, setAppScoresByPeriod] = useState<Record<string, Record<string, number>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set());
  const [themeAppFilter, setThemeAppFilter] = useState<string>('all');
  const [visibleApps, setVisibleApps] = useState<Set<string>>(new Set());
  const [hasAppliedDefaults, setHasAppliedDefaults] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setIsLoading(true);
      setLoadError(null);
      // Load live pain observations + theme metadata; no mock fallback.
      const [
        { data: observationRows, error: observationError },
        { data: normalizedRows },
        { data: mappingRows },
      ] = await Promise.all([
        supabase
          .from('v_pain_observations_enriched')
          .select(
            'period,period_label,sort_order,theme_id,theme_title,theme_type,app_id,app_name,severity,status,months_active,mentions_count,mentions_estimated,percent_of_feedback,trend_direction,trend_percentage,narrative,bullets',
          )
          .eq('theme_type', 'negative'),
        supabase.from('normalized_themes').select('id,key,title,description,is_active'),
        supabase.from('theme_mappings').select('theme_id,normalized_theme_id,confidence'),
      ]);

      if (!isMounted) return;
      if (observationError) {
        setLoadError('Unable to load pain details.');
        setIsLoading(false);
        return;
      }

      setObservations((observationRows as ObservationRow[]) ?? []);
      setNormalizedThemes((normalizedRows as NormalizedThemeRow[]) ?? []);
      setThemeMappings((mappingRows as ThemeMappingRow[]) ?? []);
      setIsLoading(false);
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const painPoints = useMemo(() => {
    if (!observations.length || !normalizedThemes.length || !themeMappings.length) return [];
    // Reuse the same grouping logic as TopPains for consistent ranking.
    return buildPainPoints(observations, normalizedThemes, themeMappings);
  }, [observations, normalizedThemes, themeMappings]);

  const selectedPain = useMemo(() => painPoints.find((pain) => pain.id === painId), [painPoints, painId]);
  const selectedRank = useMemo(() => {
    const idx = painPoints.findIndex((pain) => pain.id === painId);
    return idx >= 0 ? idx + 1 : null;
  }, [painPoints, painId]);

  const normalizedThemeId = useMemo(() => {
    const normalized = normalizedThemes.find((theme) => theme.key === painId);
    return normalized?.id ?? null;
  }, [normalizedThemes, painId]);

  const themeIdsForPain = useMemo(() => {
    if (!normalizedThemeId) return [];
    return themeMappings
      .filter((mapping) => mapping.normalized_theme_id === normalizedThemeId)
      .map((mapping) => mapping.theme_id);
  }, [themeMappings, normalizedThemeId]);

  const painObservations = useMemo(() => {
    if (!themeIdsForPain.length) return [];
    return observations.filter((row) => row.theme_id && themeIdsForPain.includes(row.theme_id));
  }, [observations, themeIdsForPain]);

  const affectedApps = useMemo(() => {
    const appMap = new Map<string, string>();
    painObservations.forEach((row) => {
      if (!row.app_id && !row.app_name) return;
      const id = row.app_id ?? row.app_name ?? 'unknown';
      const name = row.app_name ?? row.app_id ?? 'Unknown';
      appMap.set(id, name);
    });
    return Array.from(appMap.entries()).map(([id, name]) => ({ id, name }));
  }, [painObservations]);

  useEffect(() => {
    if (affectedApps.length === 0) return;
    if (!hasAppliedDefaults && defaultAppName) {
      const match =
        affectedApps.find((app) => app.name === defaultAppName)
        ?? affectedApps.find((app) => app.id === defaultAppName);
      if (match) {
        setVisibleApps(new Set([match.id]));
        setThemeAppFilter(match.name);
        setHasAppliedDefaults(true);
        return;
      }
    }
    setVisibleApps(new Set(affectedApps.map((app) => app.id)));
    setHasAppliedDefaults(true);
  }, [affectedApps, defaultAppName, hasAppliedDefaults]);

  const painSeries = useMemo(() => {
    const periodMap = new Map<
      string,
      {
        period: string;
        label: string;
        sortOrder: number;
        totalPercent: number;
        count: number;
        totalMentions: number;
      }
    >();

    painObservations.forEach((row) => {
      if (!row.period) return;
      const label = row.period_label ?? row.period;
      const sortOrder = row.sort_order ?? 0;
      if (!periodMap.has(row.period)) {
        periodMap.set(row.period, {
          period: row.period,
          label,
          sortOrder,
          totalPercent: 0,
          count: 0,
          totalMentions: 0,
        });
      }
      const entry = periodMap.get(row.period)!;
      entry.totalPercent += row.percent_of_feedback ?? 0;
      entry.count += 1;
      entry.totalMentions += row.mentions_count ?? row.percent_of_feedback ?? 0;
    });

    return Array.from(periodMap.values())
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((entry) => ({
        period: entry.period,
        label: entry.label,
        painPercent: entry.count > 0 ? Number((entry.totalPercent / entry.count).toFixed(1)) : 0,
        totalMentions: entry.totalMentions,
      }));
  }, [painObservations]);

  useEffect(() => {
    let isMounted = true;
    const loadAppScores = async () => {
      const appIds = affectedApps.map((app) => app.id).filter((id) => id && id !== 'unknown');
      const periods = painSeries.map((segment) => segment.period).filter(Boolean);
      if (appIds.length === 0 || periods.length === 0) {
        setAppScoresByPeriod({});
        return;
      }

      // Pull UX-Lite scores for affected apps over the pain timeline.
      const { data, error } = await supabase
        .from('v_app_metrics_trends')
        .select('app_id,app_name,period,period_label,overall_score')
        .in('app_id', appIds)
        .in('period', periods);

      if (!isMounted) return;
      if (error) {
        console.warn('Unable to load app scores:', error.message);
        setAppScoresByPeriod({});
        return;
      }

      const nextScores: Record<string, Record<string, number>> = {};
      (data as AppMetricRow[] | null ?? []).forEach((row) => {
        if (!row.period || !row.app_id || row.overall_score === null || row.overall_score === undefined) return;
        if (!nextScores[row.period]) nextScores[row.period] = {};
        nextScores[row.period][row.app_id] = row.overall_score;
      });
      setAppScoresByPeriod(nextScores);
    };

    loadAppScores();
    return () => {
      isMounted = false;
    };
  }, [affectedApps, painSeries]);

  const chartData = useMemo(() => {
    return painSeries.map((segment) => {
      const dataPoint: Record<string, string | number> = {
        label: segment.label,
        painPercent: segment.painPercent,
      };
      affectedApps.forEach((app) => {
        const score = appScoresByPeriod[segment.period]?.[app.id];
        if (score !== undefined) {
          dataPoint[`score_${app.id}`] = score;
        }
      });
      return dataPoint;
    });
  }, [painSeries, affectedApps, appScoresByPeriod]);

  const hasAppScores = useMemo(() => {
    return affectedApps.some((app) =>
      chartData.some((row) => row[`score_${app.id}`] !== undefined),
    );
  }, [affectedApps, chartData]);

  const appBreakdownData = useMemo(() => {
    if (!selectedPain) return [];
    const totals = new Map<string, number>();
    painObservations.forEach((row) => {
      const name = row.app_name ?? row.app_id ?? 'Unknown';
      const base = row.mentions_count ?? row.percent_of_feedback ?? 0;
      totals.set(name, (totals.get(name) ?? 0) + base);
    });
    const totalMentions = selectedPain.totalMentions || 0;
    return Array.from(totals.entries()).map(([app, mentions]) => {
      const percentage = totalMentions > 0 ? (mentions / totalMentions) * 100 : 0;
      return {
        app,
        mentions,
        percentage: Number(percentage.toFixed(1)),
      };
    });
  }, [painObservations, selectedPain]);

  const themeBreakdown = useMemo<ThemeBreakdown[]>(() => {
    // Build per-theme stacks from the pain's mapped observations.
    const themeMap = new Map<string, ThemeBreakdown>();
    painObservations.forEach((row) => {
      if (!row.theme_id) return;
      const themeId = row.theme_id;
      const themeTitle = row.theme_title ?? 'Untitled';
      if (!themeMap.has(themeId)) {
        themeMap.set(themeId, {
          id: themeId,
          name: themeTitle,
          monthsActive: 0,
          affectedApps: [],
          percentage: 0,
          monthBreakdown: [],
        });
      }
      const theme = themeMap.get(themeId)!;
      const appName = row.app_name ?? row.app_id ?? 'Unknown';
      theme.affectedApps.push(appName);
      theme.percentage += row.percent_of_feedback ?? 0;
      const summaryPoints = (row.bullets ?? []).filter(Boolean);
      if (summaryPoints.length === 0 && row.narrative) {
        summaryPoints.push(row.narrative);
      }
      theme.monthBreakdown.push({
        period: row.period ?? 'unknown',
        periodLabel: row.period_label ?? row.period ?? 'Unknown period',
        periodSort: row.sort_order ?? 0,
        appName,
        percentage: row.percent_of_feedback ?? 0,
        mentions: row.mentions_count ?? 0,
        status: row.status ?? 'unresolved',
        summaryPoints,
      });
    });

    return Array.from(themeMap.values())
      .map((theme) => {
        const uniquePeriods = new Set(theme.monthBreakdown.map((entry) => entry.period));
        theme.monthsActive = uniquePeriods.size;
        theme.affectedApps = Array.from(new Set(theme.affectedApps));
        if (theme.monthBreakdown.length > 0) {
          theme.percentage = theme.percentage / theme.monthBreakdown.length;
        }
        theme.monthBreakdown.sort((a, b) => b.periodSort - a.periodSort);
        return theme;
      })
      .sort((a, b) => b.percentage - a.percentage);
  }, [painObservations]);

  const filteredThemes = useMemo(() => {
    if (themeAppFilter === 'all') return themeBreakdown;
    return themeBreakdown
      .map((theme) => ({
        ...theme,
        monthBreakdown: theme.monthBreakdown.filter((entry) => entry.appName === themeAppFilter),
      }))
      .filter((theme) => theme.monthBreakdown.length > 0);
  }, [themeBreakdown, themeAppFilter]);

  const toggleTheme = (themeId: string) => {
    setExpandedThemes((prev) => {
      const next = new Set(prev);
      if (next.has(themeId)) {
        next.delete(themeId);
      } else {
        next.add(themeId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <NavigationHeader
          currentView="top-pains"
          onNavigateHome={onNavigateHome || onNavigateBack}
          onNavigateAllApps={onNavigateAllApps || onNavigateBack}
          onNavigateKeyJourneys={onNavigateKeyJourneys || onNavigateBack}
          onNavigateTopPains={onNavigateTopPains || (() => {})}
          onNavigateAdmin={onNavigateAdmin}
          onNavigateExport={onNavigateExport}
          showAdminButton={showAdminButton}
          title="Top Pain Detail"
        />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
          <Card className="border-slate-200 bg-white p-6 text-sm text-slate-600">Loading pain details…</Card>
        </div>
      </div>
    );
  }

  if (loadError || !selectedPain) {
    return (
      <div className="min-h-screen bg-white">
        <NavigationHeader
          currentView="top-pains"
          onNavigateHome={onNavigateHome || onNavigateBack}
          onNavigateAllApps={onNavigateAllApps || onNavigateBack}
          onNavigateKeyJourneys={onNavigateKeyJourneys || onNavigateBack}
          onNavigateTopPains={onNavigateTopPains || (() => {})}
          onNavigateAdmin={onNavigateAdmin}
          onNavigateExport={onNavigateExport}
          showAdminButton={showAdminButton}
          title="Top Pain Detail"
        />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 space-y-4">
          <Card className="border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {loadError ?? 'Unable to locate this pain point.'}
          </Card>
          <Button onClick={onNavigateBack} variant="outline">
            Back to Top Pains
          </Button>
        </div>
      </div>
    );
  }

  const SeverityIcon = getSeverityIcon(selectedPain.severity);
  const severityLabel = getSeverityLabel(selectedPain.severity);
  const appColors = ['#93c5fd', '#c4b5fd', '#6ee7b7', '#fca5a5', '#fdba74', '#fde047'];

  return (
    <div className="min-h-screen bg-white">
      <NavigationHeader
        currentView="top-pains"
        onNavigateHome={onNavigateHome || onNavigateBack}
        onNavigateAllApps={onNavigateAllApps || onNavigateBack}
        onNavigateKeyJourneys={onNavigateKeyJourneys || onNavigateBack}
        onNavigateTopPains={onNavigateTopPains || (() => {})}
        onNavigateAdmin={onNavigateAdmin}
        onNavigateExport={onNavigateExport}
        showAdminButton={showAdminButton}
        title={
          <div className="flex items-center gap-2">
            <SeverityIcon className="size-5" />
            {selectedRank !== null && (
              <span className="px-2 py-0.5 rounded text-sm font-bold border border-slate-600 bg-slate-800 text-slate-200">
                #{selectedRank}
              </span>
            )}
            <span>{selectedPain.title}</span>
          </div>
        }
        badges={
          <>
            <span className="px-3 py-1 rounded bg-slate-800 text-white font-bold text-sm border border-slate-700">
              {Math.round(selectedPain.percentage)}% of feedback
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold">
              <Clock className="size-3.5" />
              {selectedPain.monthsActive}mo
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold">
              <SeverityIcon className="size-3.5" />
              {severityLabel}
            </span>
            {selectedPain.affectedApps.length > 1 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold">
                <Link2 className="size-3.5" />
                {selectedPain.affectedApps.length} apps
              </span>
            )}
            {selectedPain.trendDirection === 'increasing' && selectedPain.trendPercentage && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold">
                <TrendingUp className="size-3.5" />
                {selectedPain.trendPercentage}%
              </span>
            )}
            {selectedPain.trendDirection === 'decreasing' && selectedPain.trendPercentage && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold">
                <TrendingDown className="size-3.5" />
                {selectedPain.trendPercentage}%
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-slate-300">
              <span className="font-semibold">Mentions:</span>
              <span className="font-bold text-white">{selectedPain.totalMentions}</span>
            </span>
          </>
        }
        description={selectedPain.description}
      />

      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={onNavigateBack}
            className="text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1"
          >
            <ArrowLeft size={16} />
            Top Pains
          </button>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600">{scopeLabel}</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-semibold">{selectedPain.title}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 bg-gray-50">
        <Card className="p-6 border-slate-200">
          <div className="mb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Pain Trend vs UX-Lite Scores</h2>
                <p className="text-sm text-slate-600 mt-1">Correlation between pain mentions and individual app UX-Lite scores</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs font-semibold text-slate-700 mr-2">Show:</span>
              <button
                onClick={() => setVisibleApps(new Set(affectedApps.map((app) => app.id)))}
                className="text-xs px-2 py-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                All Apps
              </button>
              <button
                onClick={() => setVisibleApps(new Set())}
                className="text-xs px-2 py-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                None
              </button>
              <span className="text-slate-300 mx-1">|</span>
              {affectedApps.map((app, idx) => {
                const isVisible = visibleApps.has(app.id);
                return (
                  <button
                    key={app.id}
                    onClick={() => {
                      setVisibleApps((prev) => {
                        const next = new Set(prev);
                        if (next.has(app.id)) {
                          next.delete(app.id);
                        } else {
                          next.add(app.id);
                        }
                        return next;
                      });
                    }}
                    className={`flex items-center gap-2 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      isVisible
                        ? 'bg-white border-2 text-slate-900 shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600'
                    }`}
                    style={{ borderColor: isVisible ? appColors[idx % appColors.length] : undefined }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: isVisible ? appColors[idx % appColors.length] : '#cbd5e1' }}
                    ></div>
                    <span>{app.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis
                  yAxisId="left"
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                  label={{ value: '% of Feedback', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: '#64748b' } }}
                  domain={[0, 50]}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'UX-Lite Score', angle: 90, position: 'insideRight', style: { fontSize: '12px', fill: '#64748b' } }}
                  domain={[50, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'painPercent') return [`${value}%`, 'Pain Percentage'];
                    if (name.startsWith('score_')) {
                      const appId = name.replace('score_', '');
                      const appName = affectedApps.find((app) => app.id === appId)?.name ?? appId;
                      return [value, appName];
                    }
                    return [value, name];
                  }}
                />
                {affectedApps.map((app, idx) => {
                  if (!visibleApps.has(app.id)) return null;
                  const hasData = chartData.some((row) => row[`score_${app.id}`] !== undefined);
                  if (!hasData) return null;
                  return (
                    <Bar
                      key={app.id}
                      yAxisId="right"
                      dataKey={`score_${app.id}`}
                      fill={appColors[idx % appColors.length]}
                      fillOpacity={0.5}
                      name={`score_${app.id}`}
                      maxBarSize={40}
                    />
                  );
                })}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="painPercent"
                  stroke="#ea580c"
                  strokeWidth={3}
                  dot={{ fill: '#ea580c', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="painPercent"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-start gap-2">
              <Info className="size-4 text-slate-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-slate-700">
                <span className="font-semibold">Reading the chart:</span> When pain percentage increases (orange line goes up),
                UX-Lite scores typically decrease (colored bars trend down). Toggle apps on/off above to focus on specific correlations.
              </p>
            </div>
            {!hasAppScores && (
              <div className="mt-2 text-xs text-slate-500">
                UX-Lite score data is not available for the selected apps/periods yet.
              </div>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="relative">
            <Card className="p-6 border-slate-200 opacity-40 pointer-events-none">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Journey Impact</h2>
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                Journey impact analytics require live journey tracking data and are coming soon.
              </div>
            </Card>
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
              <div className="absolute top-[45%] -left-24 w-[150%] bg-slate-500 text-white text-center py-3 font-bold text-base tracking-widest transform -rotate-[35deg] shadow-lg">
                COMING SOON
              </div>
            </div>
          </div>

          <Card className="p-6 border-slate-200">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">Feedback by App</h2>
              <p className="text-sm text-slate-600 mt-1">
                Percentage of total pain mentions ({selectedPain.totalMentions}) contributed by each app
              </p>
            </div>
            <div className="space-y-3">
              {appBreakdownData.map((data, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{data.app}</div>
                    <div className="text-sm text-slate-600">{Math.round(data.mentions)} mentions</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{data.percentage}%</div>
                      <div className="text-xs text-slate-500">of total</div>
                    </div>
                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${data.percentage}%` }} />
                    </div>
                  </div>
                </div>
              ))}
              {appBreakdownData.length === 0 && (
                <div className="text-sm text-slate-500">No app breakdown data available.</div>
              )}
            </div>
          </Card>
        </div>

        <Card className="p-6 border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Theme Breakdown</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-700 font-semibold">Filter by app:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setThemeAppFilter('all')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    themeAppFilter === 'all'
                      ? 'bg-orange-50 text-orange-900 font-semibold border border-orange-300'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent'
                  }`}
                >
                  All Apps
                </button>
                {affectedApps.map((app) => (
                  <button
                    key={app.name}
                    onClick={() => setThemeAppFilter(app.name)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      themeAppFilter === app.name
                        ? 'bg-orange-50 text-orange-900 font-semibold border border-orange-300'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent'
                    }`}
                  >
                    {app.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredThemes.map((theme) => (
              <div key={theme.id}>
                {expandedThemes.has(theme.id) && (
                  <div className="mb-4">
                    <button
                      onClick={() => toggleTheme(theme.id)}
                      className="flex items-center gap-2 text-sm font-medium mb-3 text-slate-900"
                    >
                      <span>↑</span> Collapse Stack
                      <span className="text-slate-600 font-normal">
                        {theme.name} across {theme.monthsActive} months
                      </span>
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {theme.monthBreakdown.map((month, idx) => (
                        <div key={idx} className="border-2 border-orange-500 rounded-lg p-5 bg-white">
                          <h3 className="text-lg font-bold text-slate-900 mb-3">{theme.name}</h3>

                          <div className="flex gap-2 mb-4">
                            <span className="px-2.5 py-1 rounded bg-red-50 text-red-700 text-xs font-semibold">
                              Pain Point
                            </span>
                            <span className="px-2.5 py-1 rounded text-xs font-semibold bg-red-50 text-red-700">
                              {month.status.replace('_', ' ')}
                            </span>
                          </div>

                          <div className="space-y-1 mb-4">
                            <div className="text-sm">
                              <span className="font-semibold text-slate-900">App:</span>{' '}
                              <span className="text-slate-700">{month.appName}</span>
                            </div>
                            <div className="text-sm">
                              <span className="font-semibold text-slate-900">Period:</span>{' '}
                              <span className="text-slate-700">{month.periodLabel}</span>
                            </div>
                            <div className="text-sm">
                              <span className="font-semibold text-slate-900">Percentage:</span>{' '}
                              <span className="text-slate-700">{Math.round(month.percentage)}% of feedback</span>
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Summary Points</div>
                            {month.summaryPoints.length > 0 ? (
                              <ul className="space-y-1.5 text-sm text-slate-700">
                                {month.summaryPoints.map((point, pointIdx) => (
                                  <li key={pointIdx} className="flex gap-2">
                                    <span className="text-slate-400 select-none">•</span>
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="text-sm text-slate-500">No summary points available.</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredThemes
                .filter((theme) => !expandedThemes.has(theme.id))
                .map((theme) => {
                  const latestMonth = theme.monthBreakdown[0];
                  return (
                    <div key={theme.id} className="border border-slate-200 rounded-lg p-5 bg-white relative">
                      {theme.monthsActive > 1 && (
                        <span className="absolute top-4 right-4 px-2 py-1 rounded bg-orange-100 text-orange-700 border border-orange-300 text-xs font-semibold">
                          {theme.monthsActive} months
                        </span>
                      )}
                      <h3 className="text-lg font-bold text-slate-900 mb-3 pr-20">{theme.name}</h3>

                      <div className="flex gap-2 mb-4">
                        <span className="px-2.5 py-1 rounded bg-red-50 text-red-700 text-xs font-semibold">
                          Pain Point
                        </span>
                        <span className="px-2.5 py-1 rounded bg-red-50 text-red-700 text-xs font-semibold">
                          Unresolved
                        </span>
                      </div>

                      <div className="space-y-1 mb-4">
                        <div className="text-sm">
                          <span className="font-semibold text-slate-900">App:</span>{' '}
                          <span className="text-slate-700">{latestMonth?.appName ?? 'Unknown'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-semibold text-slate-900">Period:</span>{' '}
                          <span className="text-slate-700">{latestMonth?.periodLabel ?? 'Unknown'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-semibold text-slate-900">Percentage:</span>{' '}
                          <span className="text-slate-700">
                            {latestMonth ? Math.round(latestMonth.percentage) : 0}% of feedback
                          </span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Summary Points</div>
                        {latestMonth?.summaryPoints.length ? (
                          <ul className="space-y-1.5 text-sm text-slate-700">
                            {latestMonth.summaryPoints.map((point, idx) => (
                              <li key={idx} className="flex gap-2">
                                <span className="text-slate-400 select-none">•</span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-sm text-slate-500">No summary points available.</div>
                        )}
                      </div>

                      {theme.monthsActive > 1 && (
                        <button
                          onClick={() => toggleTheme(theme.id)}
                          className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                        >
                          Click to expand {theme.monthsActive} months ↓
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
