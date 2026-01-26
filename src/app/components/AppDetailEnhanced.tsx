import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileDown, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, AlertCircle } from 'lucide-react';
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
  showAdminButton?: boolean;
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

type ThemeObservationRow = {
  id: number;
  period?: string | null;
  theme_id: string | null;
  theme_type: 'positive' | 'negative' | 'neutral' | null;
  status: string | null;
  months_active: number | null;
  percent_of_feedback: number | null;
  is_new?: boolean | null;
  cross_app_count?: number | null;
  narrative: string | null;
  bullets: string[] | null;
};

type ThemeStatus = 'unresolved' | 'improving' | 'stabilized' | 'resolved-monitoring';

const normalizeStatus = (value?: string | null): ThemeStatus | undefined => {
  if (!value) return undefined;
  if (value === 'resolved_monitoring') return 'resolved-monitoring';
  if (value === 'resolved-monitoring') return 'resolved-monitoring';
  if (value === 'unresolved' || value === 'improving' || value === 'stabilized') {
    return value;
  }
  return undefined;
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
  showAdminButton,
}: AppDetailEnhancedProps) {
  // Live series for one app across time; drives header, summary, and charts.
  const [appSeries, setAppSeries] = useState<AppMetricsRow[]>([]);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [appName, setAppName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [themeRows, setThemeRows] = useState<ThemeObservationRow[]>([]);
  const [themesLoading, setThemesLoading] = useState(false);
  const [themesError, setThemesError] = useState<string | null>(null);
  const [themeCatalog, setThemeCatalog] = useState<Record<string, { title: string; defaultType?: 'positive' | 'negative' | 'neutral' }>>({});
  const [themesAppId, setThemesAppId] = useState<string | null>(null);
  const [fiscalPeriods, setFiscalPeriods] = useState<Array<{ period: string; label: string; sort_order: number }>>([]);
  const [expandedThemeGroups, setExpandedThemeGroups] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    let isMounted = true;

    const loadFiscalPeriods = async () => {
      const { data, error } = await supabase
        .from('fiscal_periods')
        .select('period,label,sort_order')
        .order('sort_order', { ascending: true });

      if (!isMounted) return;

      if (error) {
        setFiscalPeriods([]);
        return;
      }

      setFiscalPeriods((data ?? []) as Array<{ period: string; label: string; sort_order: number }>);
    };

    void loadFiscalPeriods();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const resolveThemesAppId = async () => {
      if (!appName) {
        setThemesAppId(null);
        return;
      }

      const { data, error } = await supabase
        .from('apps')
        .select('id')
        .ilike('name', appName)
        .limit(1)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        setThemesAppId(null);
        return;
      }

      setThemesAppId(data?.id ?? null);
    };

    void resolveThemesAppId();

    return () => {
      isMounted = false;
    };
  }, [appName]);

  const currentPeriodData = useMemo(() => {
    // Pick the selected period's row (fallback to latest if not found).
    if (appSeries.length === 0) return null;
    return appSeries.find((row) => getLabel(row) === timePeriod.period) ?? appSeries[appSeries.length - 1];
  }, [appSeries, timePeriod.period]);

  const periodCodeToQuery = useMemo(() => {
    const label = timePeriod.period;
    const periodFromRow = currentPeriodData?.period;

    if (periodFromRow && periodFromRow.startsWith('FY')) {
      return periodFromRow;
    }

    const match = fiscalPeriods.find((period) =>
      period.label === label || period.label === currentPeriodData?.period_label
    );

    return match?.period ?? periodFromRow ?? label ?? null;
  }, [currentPeriodData?.period, currentPeriodData?.period_label, fiscalPeriods, timePeriod.period]);

  const parseFiscalPeriodCode = (value?: string | null) => {
    if (!value) return null;
    const match = value.match(/^FY(\d{2,4})[-_]?(\d{2})$/i);
    if (!match) return null;
    const yearToken = match[1];
    const fiscalYear = yearToken.length === 2 ? Number(`20${yearToken}`) : Number(yearToken);
    const fiscalMonth = Number(match[2]);
    if (Number.isNaN(fiscalYear) || Number.isNaN(fiscalMonth)) return null;
    return { fiscalYear, fiscalMonth };
  };

  const getFiscalQuarterLabel = (periodCode?: string | null) => {
    const parsed = parseFiscalPeriodCode(periodCode);
    if (!parsed) return null;
    const quarter = Math.ceil(parsed.fiscalMonth / 3);
    const labelYear = parsed.fiscalYear - 1;
    return `Q${quarter} ${labelYear}`;
  };

  const getSelectedFiscalYear = (value: string) => {
    const trimmed = value.trim();
    const cleanValue = trimmed.startsWith("'") ? trimmed.slice(1) : trimmed;
    const fyMatch = trimmed.match(/^FY(\d{2,4})$/i);
    if (fyMatch) {
      const token = fyMatch[1];
      const year = token.length === 2 ? Number(`20${token}`) : Number(token);
      return Number.isNaN(year) ? null : year;
    }

    const yearMatch = cleanValue.match(/^\d{2,4}$/);
    if (yearMatch) {
      const year = cleanValue.length === 2 ? Number(`20${cleanValue}`) : Number(cleanValue);
      if (Number.isNaN(year)) return null;
      return year + 1;
    }

    return null;
  };

  const getQuarterWindow = (periodLabel: string) => {
    const quarterMatch = periodLabel.match(/^Q([1-4])\s+('?)(\d{2,4})$/i);
    if (!quarterMatch) return null;
    const quarter = Number(quarterMatch[1]);
    const yearToken = quarterMatch[3];
    const year = yearToken.length === 2 ? Number(`20${yearToken}`) : Number(yearToken);
    if (Number.isNaN(quarter) || Number.isNaN(year)) return null;
    return { quarter, year };
  };

  const periodCodesForThemes = useMemo(() => {
    if (timePeriod.format === 'month') {
      return periodCodeToQuery ? [periodCodeToQuery] : [];
    }

    if (timePeriod.format === 'year') {
      const fiscalYear = getSelectedFiscalYear(timePeriod.period);
      if (!fiscalYear) return [];
      return fiscalPeriods
        .filter((period) => parseFiscalPeriodCode(period.period)?.fiscalYear === fiscalYear)
        .map((period) => period.period);
    }

    const quarterWindow = getQuarterWindow(timePeriod.period);
    if (!quarterWindow) return [];

    return fiscalPeriods
      .filter((period) => {
        const label = getFiscalQuarterLabel(period.period);
        return label === `Q${quarterWindow.quarter} ${quarterWindow.year}`;
      })
      .map((period) => period.period);
  }, [fiscalPeriods, periodCodeToQuery, timePeriod.format, timePeriod.period]);

  const periodSortOrderMap = useMemo(() => {
    return fiscalPeriods.reduce((acc, period) => {
      acc[period.period] = period.sort_order ?? 0;
      return acc;
    }, {} as Record<string, number>);
  }, [fiscalPeriods]);

  const periodLabelByCode = useMemo(() => {
    return fiscalPeriods.reduce((acc, period) => {
      acc[period.period] = period.label ?? period.period;
      return acc;
    }, {} as Record<string, string>);
  }, [fiscalPeriods]);

  const getPeriodOrder = (period?: string | null) => {
    if (!period) return 0;
    if (periodSortOrderMap[period] !== undefined) {
      return periodSortOrderMap[period];
    }
    const parsed = parseFiscalPeriodCode(period);
    if (!parsed) return 0;
    return parsed.fiscalYear * 12 + parsed.fiscalMonth;
  };

  const toggleThemeGroup = (key: string) => {
    setExpandedThemeGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
    } else {
        next.add(key);
      }
      return next;
    });
  };

  useEffect(() => {
    let isMounted = true;

    const loadThemes = async () => {
      const appIdToQuery = themesAppId ?? appId;

      if (!appIdToQuery) {
        setThemeRows([]);
        return;
      }

      setThemesLoading(true);
      setThemesError(null);

      const shouldFetchAllPeriods = timePeriod.format !== 'month';

      if (timePeriod.format === 'month' && periodCodesForThemes.length === 0) {
        setThemeRows([]);
        setThemesLoading(false);
        return;
      }

      const query = supabase
        .from('v_pain_observations_enriched')
        .select(
          [
            'observation_id',
            'period',
            'theme_id',
            'theme_type',
            'status',
            'months_active',
            'percent_of_feedback',
            'is_new',
            'cross_app_count',
            'narrative',
            'bullets',
          ].join(',')
        )
        .eq('app_id', appIdToQuery);

      const { data, error } = shouldFetchAllPeriods
        ? await query.limit(2000)
        : await query.in('period', periodCodesForThemes).limit(500);

      if (!isMounted) return;

      if (error) {
        setThemesError(error.message);
        setThemeRows([]);
        setThemesLoading(false);
        return;
      }

      let rows = Array.isArray(data)
        ? (data as unknown as ThemeObservationRow[]).map((row: any) => ({
            ...row,
            id: row.id ?? row.observation_id,
          }))
        : [];

      if (shouldFetchAllPeriods) {
        if (timePeriod.format === 'year') {
          const year = getSelectedFiscalYear(timePeriod.period);
          rows = rows.filter((row) => {
            const parsed = parseFiscalPeriodCode(row.period);
            return year ? parsed?.fiscalYear === year : false;
          });
    } else if (timePeriod.format === 'quarter') {
          const quarterWindow = getQuarterWindow(timePeriod.period);
          rows = rows.filter((row) => {
            if (!quarterWindow) return false;
            const label = getFiscalQuarterLabel(row.period);
            return label === `Q${quarterWindow.quarter} ${quarterWindow.year}`;
          });
        }
      }
      setThemeRows(rows);
      const themeIds = rows
        .map((row) => row.theme_id)
        .filter((themeId): themeId is string => Boolean(themeId));

      if (themeIds.length > 0) {
        const { data: themeData, error: themeError } = await supabase
          .from('themes')
          .select('id,title,default_type')
          .in('id', themeIds);

        if (!themeError && Array.isArray(themeData)) {
          const catalog = themeData.reduce((acc, theme) => {
            if (theme?.id) {
              acc[theme.id] = {
                title: theme.title ?? 'Untitled Theme',
                defaultType: theme.default_type ?? undefined,
              };
            }
            return acc;
          }, {} as Record<string, { title: string; defaultType?: 'positive' | 'negative' | 'neutral' }>);
          setThemeCatalog(catalog);
        }
    } else {
        setThemeCatalog({});
      }
      setThemesLoading(false);
    };

    void loadThemes();

    return () => {
      isMounted = false;
    };
  }, [appId, periodCodesForThemes, themesAppId, timePeriod.format, timePeriod.period]);

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

  const headerSubtitle = timePeriod.period || 'Period';
  const headerSubtitleUpper = headerSubtitle.toUpperCase();

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

  const feedbackThemes = useMemo<ThemeCategory[]>(() => {
    if (themeRows.length === 0) return [];

    const latestByTheme = new Map<string, ThemeObservationRow>();
    themeRows.forEach((row) => {
      const key = row.theme_id ?? `theme-${row.id}`;
      const existing = latestByTheme.get(key);
      if (!existing) {
        latestByTheme.set(key, row);
        return;
      }
      const periodA = getPeriodOrder(row.period);
      const periodB = getPeriodOrder(existing.period);
      if (periodA > periodB) {
        latestByTheme.set(key, row);
      }
    });

    const groupedRows = Array.from(latestByTheme.values());

    const sortedRows = groupedRows.sort((a, b) => {
      const periodA = getPeriodOrder(a.period);
      const periodB = getPeriodOrder(b.period);
      if (periodA !== periodB) return periodB - periodA;

      const percentA = a.percent_of_feedback ?? -1;
      const percentB = b.percent_of_feedback ?? -1;
      if (percentA !== percentB) return percentB - percentA;

      const titleA = (a.theme_id ? themeCatalog[a.theme_id]?.title : a.theme_id) ?? '';
      const titleB = (b.theme_id ? themeCatalog[b.theme_id]?.title : b.theme_id) ?? '';
      return titleA.localeCompare(titleB);
    });

    return sortedRows.map((row) => {
      const themeInfo = row.theme_id ? themeCatalog[row.theme_id] : undefined;
      const bullets = Array.isArray(row.bullets) ? row.bullets.filter(Boolean) : [];
      const narratives = bullets.length > 0
        ? bullets
        : row.narrative
          ? [row.narrative]
          : [];

      return {
        title: themeInfo?.title ?? 'Untitled Theme',
        percentage: row.percent_of_feedback ?? null,
        type: row.theme_type ?? themeInfo?.defaultType ?? 'negative',
        narratives,
      metadata: {
          monthsActive: row.months_active ?? undefined,
          status: normalizeStatus(row.status),
          crossAppCount: row.cross_app_count ?? undefined,
          isNew: row.is_new ?? undefined,
        },
      };
    });
  }, [getPeriodOrder, themeCatalog, themeRows]);

  const getStatusBadge = (status?: ThemeStatus, type?: 'positive' | 'negative' | 'neutral') => {
    if (type !== 'negative' || !status) return null;
    switch (status) {
      case 'unresolved':
        return { label: 'Unresolved', color: 'text-red-800', bgColor: 'bg-red-100' };
      case 'improving':
        return { label: 'Improving', color: 'text-amber-800', bgColor: 'bg-amber-100' };
      case 'stabilized':
        return { label: 'Stabilized', color: 'text-green-800', bgColor: 'bg-green-100' };
      case 'resolved-monitoring':
        return { label: 'Resolved - Monitoring', color: 'text-blue-800', bgColor: 'bg-blue-100' };
      default:
        return null;
    }
  };

  const groupedThemeGroups = useMemo(() => {
    if (themeRows.length === 0) return [];

    const groups = new Map<
      string,
      {
        key: string;
        title: string;
        entries: Array<{
          id: number;
          periodLabel: string;
          periodOrder: number;
          percentage: number | null;
          type: 'positive' | 'negative' | 'neutral';
          status?: ThemeStatus;
          narratives: string[];
        }>;
      }
    >();

    themeRows.forEach((row) => {
      const themeInfo = row.theme_id ? themeCatalog[row.theme_id] : undefined;
      const title = themeInfo?.title ?? 'Untitled Theme';
      const key = row.theme_id ?? title;
      const bullets = Array.isArray(row.bullets) ? row.bullets.filter(Boolean) : [];
      const narratives = bullets.length > 0
        ? bullets
        : row.narrative
          ? [row.narrative]
          : [];
      const periodLabel = row.period ? (periodLabelByCode[row.period] ?? row.period) : 'Unknown period';
      const entry = {
        id: row.id,
        periodLabel,
        periodOrder: getPeriodOrder(row.period),
        percentage: row.percent_of_feedback ?? null,
        type: row.theme_type ?? themeInfo?.defaultType ?? 'negative',
        status: normalizeStatus(row.status),
        narratives,
      };

      if (!groups.has(key)) {
        groups.set(key, { key, title, entries: [entry] });
      } else {
        groups.get(key)!.entries.push(entry);
      }
    });

    const grouped = Array.from(groups.values()).map((group) => {
      group.entries.sort((a, b) => {
        if (a.periodOrder !== b.periodOrder) return b.periodOrder - a.periodOrder;
        const percentA = a.percentage ?? -1;
        const percentB = b.percentage ?? -1;
        if (percentA !== percentB) return percentB - percentA;
        return a.periodLabel.localeCompare(b.periodLabel);
      });
      const latest = group.entries[0];
      return {
        ...group,
        latestPeriodOrder: latest?.periodOrder ?? 0,
        latestPercentage: latest?.percentage ?? -1,
      };
    });

    return grouped.sort((a, b) => {
      if (a.latestPeriodOrder !== b.latestPeriodOrder) return b.latestPeriodOrder - a.latestPeriodOrder;
      if (a.latestPercentage !== b.latestPercentage) return b.latestPercentage - a.latestPercentage;
      return a.title.localeCompare(b.title);
    });
  }, [getPeriodOrder, periodLabelByCode, themeCatalog, themeRows]);

  const isGroupedView = timePeriod.format !== 'month';
  const hasFeedbackThemes = isGroupedView ? groupedThemeGroups.length > 0 : feedbackThemes.length > 0;

  const priorityIndicators = useMemo(() => {
    const isUnresolved = (theme: ThemeCategory) =>
      theme.type === 'negative' && (!theme.metadata?.status || theme.metadata.status === 'unresolved');

    const chronicCount = feedbackThemes.filter(
      (theme) => theme.type === 'negative' && (theme.metadata?.monthsActive ?? 0) >= 6
    ).length;
    const unresolvedCount = feedbackThemes.filter(isUnresolved).length;
    const persistentFeedbackPercent = feedbackThemes
      .filter((theme) => theme.type === 'negative' && (theme.metadata?.monthsActive ?? 0) >= 3)
      .reduce((sum, theme) => sum + (theme.percentage ?? 0), 0);
    const improvingCount = feedbackThemes.filter((theme) => theme.metadata?.status === 'improving').length;
    const newPatternCount = feedbackThemes.filter((theme) => theme.metadata?.isNew).length;
    const unresolvedCrossAppCount = feedbackThemes.filter(
      (theme) => isUnresolved(theme) && (theme.metadata?.crossAppCount ?? 0) > 1
    ).length;

    return {
      chronicCount,
      unresolvedCount,
      unresolvedCrossAppCount,
      persistentFeedbackPercent,
      improvingCount,
      newPatternCount,
    };
  }, [feedbackThemes]);

  const narrativeSummary = useMemo(() => {
    const chronicIssues = feedbackThemes.filter(
      (theme) => theme.type === 'negative' && (theme.metadata?.monthsActive ?? 0) >= 6
    );
    const unresolvedIssues = feedbackThemes.filter(
      (theme) => theme.type === 'negative' && (!theme.metadata?.status || theme.metadata.status === 'unresolved')
    );

    if (chronicIssues.length > 0) {
      const topChronic = chronicIssues[0];
      const persistenceMonths = topChronic.metadata?.monthsActive || 0;
      const chronicPercent = topChronic.percentage ?? 0;
      return `${chronicIssues.length} chronic issue${chronicIssues.length > 1 ? 's' : ''} remain${
        chronicIssues.length === 1 ? 's' : ''
      } unresolved this period, with "${topChronic.title}" persisting for ${persistenceMonths} consecutive months and representing ${chronicPercent}% of feedback. These long-standing pain points require immediate prioritization.`;
    }

    if (unresolvedIssues.length > 0) {
      const totalUnresolvedPercentage = unresolvedIssues.reduce((sum, theme) => sum + (theme.percentage ?? 0), 0);
      return `${unresolvedIssues.length} unresolved issue${unresolvedIssues.length > 1 ? 's' : ''} dominate this period's feedback (${totalUnresolvedPercentage}% combined), indicating persistent pain points that need attention to prevent them from becoming chronic concerns.`;
    }

    return `Feedback this period shows a balanced mix of themes with no dominant chronic issues, though continued monitoring is recommended to catch emerging patterns early.`;
  }, [feedbackThemes]);

  if (isLoading) {
    return <div className="p-6 text-slate-600">Loading app details...</div>;
  }

  if (!isLoading && metricsError) {
    return <div className="p-6 text-slate-600">Supabase error: {metricsError}</div>;
  }

  if (!isLoading && !currentPeriodData) {
    return <div className="p-6 text-slate-600">No data found for this app.</div>;
  }

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
        showAdminButton={showAdminButton}
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
          {themesError && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Failed to load themes for this period: {themesError}
            </div>
          )}
          {themesLoading && (
            <div className="mb-4 text-sm text-slate-600">Loading feedback themes...</div>
          )}
          {!isGroupedView && (
          <ScoreDriversThemes 
            themes={feedbackThemes} 
            density="standard"
              title={`${headerSubtitleUpper} FEEDBACK THEMES`}
            subtitle="AI Supported Summary"
          />
          )}
          {isGroupedView && (
            <div>
              <div className="mb-5">
                <h3 className="text-slate-900 text-sm font-semibold tracking-wide uppercase mb-1">
                  {headerSubtitleUpper.replace('FEEDBACK THEMES', 'TOP FEEDBACK THEMES')}
                </h3>
                <p className="text-slate-600 text-sm">AI Supported Summary</p>
              </div>

              <div className="mb-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-md shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertCircle className="size-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <p className="text-slate-900 leading-relaxed text-[14px]">{narrativeSummary}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupedThemeGroups.map((group) => {
                      const isExpanded = expandedThemeGroups.has(group.key);
                      const latest = group.entries[0];
                      const statusBadge = latest ? getStatusBadge(latest.status, latest.type) : null;
                      const totalPercentage = group.entries.reduce((sum, entry) => sum + (entry.percentage ?? 0), 0);
                      const summaryPoints = latest?.narratives ?? [];
                      const isMultiMonth = group.entries.length > 1;

                      if (isMultiMonth && !isExpanded && latest) {
                        return (
                          <div key={group.key} className="relative pb-3">
                            <div className="absolute inset-x-1 -bottom-1 h-full bg-white border border-slate-300 rounded-lg shadow-sm -z-10" />
                            <div className="absolute inset-x-2 -bottom-2 h-full bg-white border border-slate-200 rounded-lg shadow-sm -z-20" />
                            <Card
                              className="relative p-4 hover:shadow-lg transition-all cursor-pointer border-2 border-slate-400"
                              onClick={() => toggleThemeGroup(group.key)}
                            >
                              <div className="absolute top-3 right-3">
                                <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800 font-semibold border border-orange-300">
                                  {group.entries.length} month{group.entries.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="space-y-4 pr-20">
                                <div className="space-y-2">
                                  <div className="font-semibold text-base text-slate-900">{group.title}</div>
                                  <div className="flex flex-wrap gap-2">
                                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                                      latest.type === 'positive'
                                        ? 'bg-green-100 text-green-800'
                                        : latest.type === 'negative'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-slate-100 text-slate-800'
                                    }`}>
                                      {latest.type === 'positive' ? 'Positive' : latest.type === 'negative' ? 'Pain Point' : 'Neutral'}
                                    </span>
                                    {statusBadge && (
                                      <span className={`text-xs px-2 py-1 rounded font-medium ${statusBadge.bgColor} ${statusBadge.color}`}>
                                        {statusBadge.label}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                                  <div><strong>Period:</strong> {latest.periodLabel}</div>
                                  {totalPercentage > 0 && (
                                    <div><strong>Percentage:</strong> {totalPercentage}% of feedback</div>
                                  )}
                                </div>
                                {summaryPoints.length > 0 && (
                                  <div className="pt-3 border-t border-slate-100">
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Summary Points</div>
                                    <ul className="space-y-1.5 text-sm text-slate-700">
                                      {summaryPoints.map((bullet, idx) => (
                                        <li key={idx} className="flex gap-2">
                                          <span className="text-slate-400 shrink-0">•</span>
                                          <span>{bullet}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                <div className="pt-3 border-t border-slate-100 text-xs text-orange-600 font-medium flex items-center gap-1">
                                  <span>Click to expand {group.entries.length} month{group.entries.length !== 1 ? 's' : ''}</span>
                                  <ChevronDown className="size-3" />
                                </div>
                              </div>
                            </Card>
                          </div>
                        );
                      }

                      if (isMultiMonth && isExpanded) {
                        return (
                          <div key={group.key} className="col-span-full space-y-3">
                            <div className="flex items-center gap-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleThemeGroup(group.key)}
                                className="flex items-center gap-2"
                              >
                                <ChevronUp className="size-4" />
                                Collapse Stack
                              </Button>
                              <span className="text-sm text-slate-600">
                                <strong>{group.title}</strong> across {group.entries.length} months
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {group.entries.map((entry) => {
                                const entryStatus = getStatusBadge(entry.status, entry.type);
                                return (
                                  <Card key={entry.id} className="p-4 hover:shadow-md transition-shadow relative border-orange-200 border-2">
                                    <div className="space-y-4">
                                      <div className="space-y-2">
                                        <div className="font-semibold text-base text-slate-900">{group.title}</div>
                                        <div className="flex flex-wrap gap-2">
                                          <span className={`text-xs px-2 py-1 rounded font-medium ${
                                            entry.type === 'positive'
                                              ? 'bg-green-100 text-green-800'
                                              : entry.type === 'negative'
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-slate-100 text-slate-800'
                                          }`}>
                                            {entry.type === 'positive' ? 'Positive' : entry.type === 'negative' ? 'Pain Point' : 'Neutral'}
                                          </span>
                                          {entryStatus && (
                                            <span className={`text-xs px-2 py-1 rounded font-medium ${entryStatus.bgColor} ${entryStatus.color}`}>
                                              {entryStatus.label}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                                        <div><strong>Period:</strong> {entry.periodLabel}</div>
                                        {entry.percentage !== null && (
                                          <div><strong>Percentage:</strong> {entry.percentage}% of feedback</div>
                                        )}
                                      </div>
                                      {entry.narratives.length > 0 && (
                                        <div className="pt-3 border-t border-slate-100">
                                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Summary Points</div>
                                          <ul className="space-y-1.5 text-sm text-slate-700">
                                            {entry.narratives.map((bullet, idx) => (
                                              <li key={idx} className="flex gap-2">
                                                <span className="text-slate-400 shrink-0">•</span>
                                                <span>{bullet}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  </Card>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      if (latest) {
                        return (
                          <Card key={group.key} className="p-4 hover:shadow-md transition-shadow">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <div className="font-semibold text-base text-slate-900">{group.title}</div>
                                <div className="flex flex-wrap gap-2">
                                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                                    latest.type === 'positive'
                                      ? 'bg-green-100 text-green-800'
                                      : latest.type === 'negative'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-slate-100 text-slate-800'
                                  }`}>
                                    {latest.type === 'positive' ? 'Positive' : latest.type === 'negative' ? 'Pain Point' : 'Neutral'}
                                  </span>
                                  {statusBadge && (
                                    <span className={`text-xs px-2 py-1 rounded font-medium ${statusBadge.bgColor} ${statusBadge.color}`}>
                                      {statusBadge.label}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                                <div><strong>Period:</strong> {latest.periodLabel}</div>
                                {totalPercentage > 0 && (
                                  <div><strong>Percentage:</strong> {totalPercentage}% of feedback</div>
                                )}
                              </div>
                              {summaryPoints.length > 0 && (
                                <div className="pt-3 border-t border-slate-100">
                                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Summary Points</div>
                                  <ul className="space-y-1.5 text-sm text-slate-700">
                                    {summaryPoints.map((bullet, idx) => (
                                      <li key={idx} className="flex gap-2">
                                        <span className="text-slate-400 shrink-0">•</span>
                                        <span>{bullet}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      }

                      return null;
                    })}
                  </div>
                </div>
                <div className="lg:col-span-4 lg:order-2 space-y-3">
                  <div className="text-slate-700 font-semibold mb-3 text-sm">Priority Indicators</div>
                  {priorityIndicators.chronicCount > 0 && (
                    <Card className="p-4 border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="text-[32px] font-semibold text-slate-900 leading-none">
                          {priorityIndicators.chronicCount}
                        </div>
                        <div className="text-slate-700 text-sm leading-tight">
                          chronic issue{priorityIndicators.chronicCount !== 1 ? 's' : ''} requiring immediate attention
                        </div>
                      </div>
                    </Card>
                  )}
                  {priorityIndicators.unresolvedCount > 0 && (
                    <Card className="p-4 border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="text-[32px] font-semibold text-slate-900 leading-none">
                          {priorityIndicators.unresolvedCount}
                        </div>
                        <div className="text-slate-700 text-sm leading-tight">
                          unresolved pain point{priorityIndicators.unresolvedCount !== 1 ? 's' : ''} this period
                        </div>
                      </div>
                    </Card>
                  )}
                  {priorityIndicators.unresolvedCrossAppCount > 0 && (
                    <Card className="p-4 border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="text-[32px] font-semibold text-slate-900 leading-none">
                          {priorityIndicators.unresolvedCrossAppCount}
                        </div>
                        <div className="text-slate-700 text-sm leading-tight">
                          unresolved cross-app issue{priorityIndicators.unresolvedCrossAppCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </Card>
                  )}
                  {priorityIndicators.persistentFeedbackPercent > 0 && (
                    <Card className="p-4 border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="text-[32px] font-semibold text-slate-900 leading-none">
                          {priorityIndicators.persistentFeedbackPercent}%
                        </div>
                        <div className="text-slate-700 text-sm leading-tight">
                          of feedback tied to recurring or chronic issues
                        </div>
                      </div>
                    </Card>
                  )}
                  {priorityIndicators.newPatternCount > 0 && (
                    <Card className="p-4 border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="text-[32px] font-semibold text-slate-900 leading-none">
                          {priorityIndicators.newPatternCount}
                        </div>
                        <div className="text-slate-700 text-sm leading-tight">
                          emerging pattern{priorityIndicators.newPatternCount !== 1 ? 's' : ''} detected
                        </div>
                      </div>
                    </Card>
                  )}
                  {priorityIndicators.improvingCount > 0 && (
                    <Card className="p-4 border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="text-[32px] font-semibold text-slate-900 leading-none">
                          {priorityIndicators.improvingCount}
                        </div>
                        <div className="text-slate-700 text-sm leading-tight">
                          issue{priorityIndicators.improvingCount !== 1 ? 's' : ''} showing improvement
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          )}
          {!themesLoading && !themesError && !hasFeedbackThemes && (
            <div className="mt-4 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              No feedback themes found for this app and period yet.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}