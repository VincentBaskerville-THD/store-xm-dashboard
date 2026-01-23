import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Search, Filter, Edit2, Save, X, AlertCircle, Plus, Lock, Unlock, Eye, ArrowDown, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, GitBranch, Trash2 } from 'lucide-react';
import { AdminTabNav } from './AdminTabNav';
import { AdminThemesPreview } from './AdminThemesPreview';
import { Switch } from './ui/switch';
import { supabase } from '../lib/supabaseClient';

interface ManageThemesProps {
  onNavigateBack: () => void;
  onNavigateHome: () => void;
  onNavigateAllApps: () => void;
  onNavigateKeyJourneys: () => void;
  onNavigateTopPains: () => void;
  onTabChange: (tab: 'manage-themes' | 'manage-journeys' | 'manage-apps' | 'feature-flags' | 'settings') => void;
}

// ThemeOccurrence: Each app+month is a separate editable record
interface ThemeOccurrence {
  id: string; // Unique per occurrence
  themeId: string; // Links related occurrences (e.g., "slow-performance")
  themeName: string; // Display name (e.g., "Slow Performance")
  appId: string;
  appName: string;
  journeyId?: string;
  journeyName?: string;
  timePeriod: string;
  periodSortOrder?: number;
  periodCode?: string;
  persistenceTag?: string;
  percentage: number | null;
  type: 'positive' | 'negative' | 'neutral';
  status?: 'unresolved' | 'improving' | 'stabilized' | 'resolved-monitoring';
  descriptionBullets: string[];
  exampleComments: string[];
  monthsActive?: number;
  trendDirection?: 'increasing' | 'decreasing' | 'stable';
  trendPercentage?: number;
  isNew?: boolean;
  createdAt: string;
  updatedAt: string;
  manualOverrides?: {
    monthsActive?: boolean;
    trendDirection?: boolean;
    trendPercentage?: boolean;
    status?: boolean;
  };
}

// Grouped view for display
interface GroupedTheme {
  themeId: string;
  themeName: string;
  type: 'positive' | 'negative' | 'neutral';
  occurrences: ThemeOccurrence[];
  totalApps: number;
  totalMonths: number;
  expanded?: boolean;
}

interface ExistingTheme {
  id?: string;
  title: string;
  appId: string;
  appName: string;
  percentage: number | null;
  type: 'positive' | 'negative' | 'neutral';
  monthsActive: number;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
  crossAppCount: number;
  isNew: boolean;
}

const emptyOccurrence: Partial<ThemeOccurrence> = {
  themeName: '',
  appId: undefined,
  appName: undefined,
  percentage: null,
  type: 'negative',
  status: 'unresolved',
  descriptionBullets: [''],
  exampleComments: [],
  timePeriod: '',
  periodCode: undefined,
  monthsActive: undefined,
  trendDirection: undefined,
  trendPercentage: undefined,
  isNew: false,
  manualOverrides: {},
};

const normalizeStatus = (value?: string): ThemeOccurrence['status'] => {
  if (!value) return undefined;
  if (value === 'resolved_monitoring') return 'resolved-monitoring';
  if (value === 'resolved-monitoring') return 'resolved-monitoring';
  if (value === 'unresolved' || value === 'improving' || value === 'stabilized') {
    return value;
  }
  return undefined;
};

const normalizeStatusForDb = (status?: ThemeOccurrence['status']) => {
  if (!status) return undefined;
  if (status === 'resolved-monitoring') return 'resolved_monitoring';
  return status;
};

const toThemeId = (title: string) =>
  title
    .trim()
    .toLowerCase()
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '');

const mapObservationRow = (row: any): ThemeOccurrence => {
  const themeName = row.theme_title ?? row.theme_name ?? row.themes?.title ?? row.title ?? 'Untitled Theme';
  const themeId = row.theme_id ?? row.themeId ?? row.themeid ?? themeName;
  const periodLabel = row.period_label ?? row.periodLabel ?? row.fiscal_periods?.label ?? row.period ?? row.time_period ?? 'Unknown';
  const bullets = Array.isArray(row.bullets) ? row.bullets : [];
  const exampleComments = Array.isArray(row.example_comments)
    ? row.example_comments
    : Array.isArray(row.exampleComments)
      ? row.exampleComments
      : [];

  return {
    id: String(row.observation_id ?? row.id ?? row.observationId ?? `${themeId}-${row.app_id ?? row.appId ?? 'portfolio'}-${periodLabel}`),
    themeId,
    themeName,
    appId: row.app_id ?? row.appId ?? 'portfolio',
    appName: row.app_name ?? row.appName ?? row.apps?.name ?? 'Portfolio',
    journeyId: row.journey_id ?? row.journeyId,
    journeyName: row.journey_name ?? row.journeyName ?? row.journeys?.name,
    timePeriod: periodLabel,
    periodSortOrder: typeof row.sort_order === 'number' ? row.sort_order : row.fiscal_periods?.sort_order ?? row.period_sort_order,
    periodCode: row.period ?? row.period_code ?? row.periodCode,
    percentage: row.percent_of_feedback ?? row.percentage ?? null,
    type: row.theme_type ?? row.type ?? row.default_type ?? 'negative',
    status: normalizeStatus(row.status),
    descriptionBullets: bullets.length > 0 ? bullets : (row.narrative ? [row.narrative] : []),
    exampleComments,
    monthsActive: row.months_active ?? row.monthsActive,
    persistenceTag: row.persistence_tag ?? row.persistenceTag,
    trendDirection: row.trend_direction ?? row.trendDirection,
    trendPercentage: row.trend_percentage ?? row.trendPercentage,
    isNew: row.is_new ?? row.isNew,
    createdAt: row.created_at ?? row.createdAt ?? '',
    updatedAt: row.updated_at ?? row.updatedAt ?? row.created_at ?? row.createdAt ?? '',
    manualOverrides: {},
  };
};

// Helper function to group occurrences by theme
function groupOccurrencesByTheme(occurrences: ThemeOccurrence[]): GroupedTheme[] {
  const grouped = new Map<string, GroupedTheme>();
  
  occurrences.forEach(occ => {
    if (!grouped.has(occ.themeId)) {
      grouped.set(occ.themeId, {
        themeId: occ.themeId,
        themeName: occ.themeName,
        type: occ.type,
        occurrences: [],
        totalApps: 0,
        totalMonths: 0,
        expanded: false,
      });
    }
    grouped.get(occ.themeId)!.occurrences.push(occ);
  });
  
  // Calculate totals
  grouped.forEach(group => {
    const uniqueApps = new Set(group.occurrences.map(o => o.appId));
    const uniqueMonths = new Set(group.occurrences.map(o => o.timePeriod));
    group.totalApps = uniqueApps.size;
    group.totalMonths = uniqueMonths.size;
  });
  
  return Array.from(grouped.values());
}

export function ManageThemes({
  onNavigateBack,
  onNavigateHome,
  onNavigateAllApps,
  onNavigateKeyJourneys,
  onNavigateTopPains,
  onTabChange,
}: ManageThemesProps) {
  const [occurrences, setOccurrences] = useState<ThemeOccurrence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fiscalPeriods, setFiscalPeriods] = useState<Array<{ period: string; label: string; sort_order: number }>>([]);
  const [scorePeriods, setScorePeriods] = useState<Array<{ period: string; label: string; sort_order: number }>>([]);
  const [appScorePeriodsByApp, setAppScorePeriodsByApp] = useState<Record<string, Array<{ period: string; label: string; sort_order: number }>>>({});
  const [appPeriodsLoading, setAppPeriodsLoading] = useState<Record<string, boolean>>({});
  const [appPeriodsError, setAppPeriodsError] = useState<Record<string, string>>({});
  const [appCatalog, setAppCatalog] = useState<Array<{ id: string; name: string }>>([]);
  const [journeyCatalog, setJourneyCatalog] = useState<Array<{ id: string; name: string }>>([]);
  const [themeCatalog, setThemeCatalog] = useState<Array<{ id: string; title: string; default_type: string }>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set());
  const [expandedStacks, setExpandedStacks] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<'theme+app' | 'theme' | 'app'>('theme+app');
  const [sortBy, setSortBy] = useState<'theme' | 'group-count' | 'app'>('theme');
  const [filterApp, setFilterApp] = useState<string>('all');
  const [filterJourney, setFilterJourney] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingOccurrenceId, setEditingOccurrenceId] = useState<string | null>(null);
  const [editingOccurrence, setEditingOccurrence] = useState<ThemeOccurrence | null>(null);
  const [editScope, setEditScope] = useState<'single' | 'all-app' | 'all-month' | 'all-instances'>('single');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newOccurrence, setNewOccurrence] = useState<Partial<ThemeOccurrence>>(emptyOccurrence);
  const [successMessage, setSuccessMessage] = useState('');
  const [manualMetadataMode, setManualMetadataMode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showExampleComments, setShowExampleComments] = useState(false);
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Journey creation modal states
  const [showJourneyModal, setShowJourneyModal] = useState(false);
  const [newJourneyData, setNewJourneyData] = useState<{
    name: string;
    description: string;
    status: 'pending' | 'active' | 'inactive';
    collectionFrequency?: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'semi-annually' | 'annually';
    steps: Array<{
      id: string;
      stepNumber: number;
      name: string;
      appId: string;
      appName: string;
      description?: string;
    }>;
  }>({
    name: '',
    description: '',
    status: 'pending',
    collectionFrequency: 'monthly',
    steps: [],
  });
  
  // Theme search state
  const [themeSearchQuery, setThemeSearchQuery] = useState('');
  const [themeSearchResults, setThemeSearchResults] = useState<ExistingTheme[]>([]);
  const [showThemeSearchDropdown, setShowThemeSearchDropdown] = useState(false);
  const themeSearchRef = useRef<HTMLDivElement>(null);
  
  // Related occurrences view state (for edit modal)
  const [showRelatedOccurrences, setShowRelatedOccurrences] = useState(false);
  const [relatedOccurrencesFilterApp, setRelatedOccurrencesFilterApp] = useState<string>('all');
  const [relatedOccurrencesFilterMonth, setRelatedOccurrencesFilterMonth] = useState<string>('all');

  const fetchThemes = async (referenceData: {
    periods: Array<{ period: string; label: string; sort_order: number }>;
    apps: Array<{ id: string; name: string }>;
    journeys: Array<{ id: string; name: string }>;
    themes: Array<{ id: string; title: string; default_type: string }>;
  }) => {
    const { data, error } = await supabase
      .from('pain_observations')
      .select(
        [
          'id',
          'period',
          'theme_id',
          'theme_type',
          'status',
          'months_active',
          'percent_of_feedback',
          'narrative',
          'bullets',
          'app_id',
          'journey_id',
          'created_at'
        ].join(',')
      )
      .order('created_at', { ascending: false })
      .limit(2000);

    if (error) {
      throw error;
    }

    const periodMap = new Map(referenceData.periods.map(period => [period.period, period]));
    const appMap = new Map(referenceData.apps.map(app => [app.id, app.name]));
    const journeyMap = new Map(referenceData.journeys.map(journey => [journey.id, journey.name]));
    const themeMap = new Map(referenceData.themes.map(theme => [theme.id, theme]));

    const rows = (data ?? []) as Array<any>;
    const enrichedRows = rows.map(row => {
      const period = periodMap.get(row.period);
      const theme = themeMap.get(row.theme_id);
      return {
        ...row,
        period_label: period?.label,
        sort_order: period?.sort_order,
        theme_title: theme?.title,
        app_name: row.app_id ? appMap.get(row.app_id) : null,
        journey_name: row.journey_id ? journeyMap.get(row.journey_id) : null,
        default_type: theme?.default_type,
      };
    });

    return enrichedRows.map(mapObservationRow);
  };

  const fetchReferenceData = async () => {
    const [
      { data: periods, error: periodsError },
      { data: apps, error: appsError },
      { data: journeys, error: journeysError },
      { data: appPeriodRows, error: appPeriodError },
      { data: themes, error: themesError },
    ] =
      await Promise.all([
        supabase.from('fiscal_periods').select('period,label,sort_order').order('sort_order', { ascending: false }),
        supabase.from('apps').select('id,name').order('name', { ascending: true }),
        supabase.from('journeys').select('id,name').order('name', { ascending: true }),
        supabase
          .from('v_app_period_metrics_unified')
          .select('period,period_label,sort_order,overall_score,response_count')
          .or('overall_score.not.is.null,response_count.gt.0')
          .order('sort_order', { ascending: false })
          .limit(2000),
        supabase.from('themes').select('id,title,default_type').order('title', { ascending: true }),
      ]);

    if (periodsError) throw periodsError;
    if (appsError) throw appsError;
    if (journeysError) throw journeysError;
    if (themesError) throw themesError;

    setFiscalPeriods(periods ?? []);
    setAppCatalog(apps ?? []);
    setJourneyCatalog(journeys ?? []);
    setThemeCatalog(themes ?? []);
    if (!appPeriodError) {
      const periodMap = new Map<string, { period: string; label: string; sort_order: number }>();
      (appPeriodRows ?? []).forEach(row => {
        if (!periodMap.has(row.period)) {
          periodMap.set(row.period, {
            period: row.period,
            label: row.period_label ?? row.period,
            sort_order: row.sort_order ?? 0,
          });
        }
      });
      const scorePeriodList = Array.from(periodMap.values()).sort((a, b) => b.sort_order - a.sort_order);
      setScorePeriods(scorePeriodList);
      return {
        periods: periods ?? [],
        apps: apps ?? [],
        journeys: journeys ?? [],
        themes: themes ?? [],
        scorePeriods: scorePeriodList,
      };
    }

    setScorePeriods([]);
    return {
      periods: periods ?? [],
      apps: apps ?? [],
      journeys: journeys ?? [],
      themes: themes ?? [],
      scorePeriods: [],
    };
  };

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const reference = await fetchReferenceData();
        const themeRows = await fetchThemes(reference);
        if (!isActive) return;
        setOccurrences(themeRows);
      } catch (error: any) {
        if (!isActive) return;
        setLoadError(error?.message ?? 'Failed to load themes');
        setOccurrences([]);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (isAddingNew && newOccurrence.appId) {
      void loadAppPeriods(newOccurrence.appId, true);
    }
  }, [isAddingNew, newOccurrence.appId]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeSearchRef.current && !themeSearchRef.current.contains(event.target as Node)) {
        setShowThemeSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const existingThemesForSearch = useMemo<ExistingTheme[]>(() => {
    if (themeCatalog.length === 0 && occurrences.length === 0) {
      return [];
    }

    const themesById = new Map(themeCatalog.map(theme => [theme.id, theme]));
    const grouped = groupOccurrencesByTheme(occurrences);

    const fromOccurrences = grouped.map(group => {
      const sorted = [...group.occurrences].sort((a, b) => {
        const aValue = typeof a.periodSortOrder === 'number'
          ? a.periodSortOrder
          : new Date(a.timePeriod).getTime();
        const bValue = typeof b.periodSortOrder === 'number'
          ? b.periodSortOrder
          : new Date(b.timePeriod).getTime();
        return bValue - aValue;
      });
      const latest = sorted[0];
      const catalogTheme = themesById.get(group.themeId);
      const appCount = new Set(group.occurrences.map(occ => occ.appId)).size;

      return {
        id: group.themeId,
        title: catalogTheme?.title ?? group.themeName,
        appId: latest?.appId ?? 'portfolio',
        appName: latest?.appName ?? 'Portfolio',
        percentage: latest?.percentage ?? 0,
        type: (latest?.type ?? catalogTheme?.default_type ?? 'negative') as ExistingTheme['type'],
        monthsActive: latest?.monthsActive ?? 0,
        trendDirection: latest?.trendDirection ?? 'stable',
        trendPercentage: latest?.trendPercentage ?? 0,
        crossAppCount: appCount,
        isNew: Boolean(latest?.isNew),
      };
    });

    const existingIds = new Set(fromOccurrences.map(theme => theme.id));
    const fromCatalog = themeCatalog
      .filter(theme => !existingIds.has(theme.id))
      .map(theme => ({
        id: theme.id,
        title: theme.title,
        appId: 'portfolio',
        appName: 'All apps',
        percentage: 0,
        type: (theme.default_type ?? 'negative') as ExistingTheme['type'],
        monthsActive: 0,
        trendDirection: 'stable' as ExistingTheme['trendDirection'],
        trendPercentage: 0,
        crossAppCount: 0,
        isNew: false,
      }));

    return [...fromOccurrences, ...fromCatalog];
  }, [occurrences, themeCatalog]);

  // Search existing themes
  const searchThemes = (query: string) => {
    if (query.trim() === '') {
      setThemeSearchResults([]);
      return;
    }

    const matches = existingThemesForSearch
      .filter(theme => theme.title.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 20);

    setThemeSearchResults(matches);
  };

  const selectExistingTheme = (existingTheme: ExistingTheme) => {
    if (isAddingNew && newOccurrence) {
      setNewOccurrence({
        ...newOccurrence,
        themeName: existingTheme.title,
        themeId: existingTheme.id ?? toThemeId(existingTheme.title),
        type: existingTheme.type,
        monthsActive: existingTheme.monthsActive,
        trendDirection: existingTheme.trendDirection,
        trendPercentage: existingTheme.trendPercentage,
        isNew: existingTheme.isNew,
      });
    } else if (editingOccurrence) {
      setEditingOccurrence({
        ...editingOccurrence,
        themeName: existingTheme.title,
        themeId: existingTheme.id ?? toThemeId(existingTheme.title),
        type: existingTheme.type,
        monthsActive: existingTheme.monthsActive,
        trendDirection: existingTheme.trendDirection,
        trendPercentage: existingTheme.trendPercentage,
        isNew: existingTheme.isNew,
      });
    }

    setThemeSearchQuery(existingTheme.title);
    setShowThemeSearchDropdown(false);
  };

  // Group occurrences and filter
  // First filter the occurrences themselves based on app/journey/status
  const filteredOccurrences = occurrences.filter(occ => {
    const matchesApp = filterApp === 'all' || occ.appId === filterApp;
    const matchesJourney = filterJourney === 'all' || occ.journeyId === filterJourney;
    const matchesStatus = filterStatus === 'all' || occ.status === filterStatus;
    
    return matchesApp && matchesJourney && matchesStatus;
  });
  
  // Then group the filtered occurrences
  const groupedThemes = groupOccurrencesByTheme(filteredOccurrences);
  
  // Finally filter groups by search and type
  const filteredGroups = groupedThemes.filter(group => {
    const matchesSearch = group.themeName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || group.type === filterType;

    return matchesSearch && matchesType;
  });

  const buildStacks = () => {
    const allOccurrences = filteredGroups.flatMap(group => group.occurrences);
    const stackMap = new Map<string, ThemeOccurrence[]>();

    allOccurrences.forEach(occurrence => {
      const stackKey = groupBy === 'theme'
        ? `${occurrence.themeId}`
        : groupBy === 'app'
          ? `${occurrence.appId}`
          : `${occurrence.themeId}-${occurrence.appId}`;
      if (!stackMap.has(stackKey)) {
        stackMap.set(stackKey, []);
      }
      stackMap.get(stackKey)!.push(occurrence);
    });

    const getSortValue = (occurrence: ThemeOccurrence) => {
      if (typeof occurrence.periodSortOrder === 'number') {
        return occurrence.periodSortOrder;
      }
      const parsed = new Date(occurrence.timePeriod).getTime();
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    stackMap.forEach(stack => {
      stack.sort((a, b) => getSortValue(b) - getSortValue(a));
    });

    const stacksArray = Array.from(stackMap.entries());
    const getSortLabel = (occurrences: ThemeOccurrence[]) => {
      if (sortBy === 'app') {
        return (occurrences[0]?.appName ?? '').toLowerCase();
      }
      return (occurrences[0]?.themeName ?? '').toLowerCase();
    };
    stacksArray.sort((aEntry, bEntry) => {
      const aOccurrences = aEntry[1];
      const bOccurrences = bEntry[1];
      if (sortBy === 'group-count') {
        return bOccurrences.length - aOccurrences.length;
      }
      return getSortLabel(aOccurrences).localeCompare(getSortLabel(bOccurrences));
    });
    return stacksArray;
  };

  const stacks = buildStacks();
  const totalPages = Math.max(1, Math.ceil(stacks.length / pageSize));
  const pagedStacks = stacks.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const startIndex = stacks.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, stacks.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterApp, filterJourney, filterType, filterStatus, pageSize, groupBy, sortBy]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const appOptions = appCatalog
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  const journeyOptions = journeyCatalog
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  const periodOptions = scorePeriods.length
    ? scorePeriods.map(period => ({ period: period.period, label: period.label, sort_order: period.sort_order }))
    : fiscalPeriods.length
      ? fiscalPeriods.map(period => ({ period: period.period, label: period.label, sort_order: period.sort_order }))
    : [
        { period: 'FY26-10', label: 'Nov 2025', sort_order: 202610 },
        { period: 'FY26-09', label: 'Oct 2025', sort_order: 202609 },
        { period: 'FY26-08', label: 'Sep 2025', sort_order: 202608 },
        { period: 'FY26-07', label: 'Aug 2025', sort_order: 202607 },
        { period: 'FY26-06', label: 'Jul 2025', sort_order: 202606 },
        { period: 'FY26-05', label: 'Jun 2025', sort_order: 202605 },
      ];

  const getPeriodOptionsForApp = (appId?: string) => {
    if (!appId) return [];
    return appScorePeriodsByApp[appId] ?? [];
  };

  const loadAppPeriods = async (appId: string, setDefaultForNew = false) => {
    if (!appId || appPeriodsLoading[appId]) return;
    if (appScorePeriodsByApp[appId]?.length) {
      if (setDefaultForNew && newOccurrence.appId === appId && !newOccurrence.periodCode) {
        const first = appScorePeriodsByApp[appId][0];
        if (first) {
          setNewOccurrence({
            ...newOccurrence,
            periodCode: first.period,
            timePeriod: first.label,
            periodSortOrder: first.sort_order,
          });
        }
      }
      return;
    }

    setAppPeriodsLoading(prev => ({ ...prev, [appId]: true }));
    setAppPeriodsError(prev => ({ ...prev, [appId]: '' }));

    const { data, error } = await supabase
      .from('app_period_metrics')
      .select('period,overall_score,response_count')
      .eq('app_id', appId)
      .or('overall_score.not.is.null,response_count.gt.0');

    if (error) {
      setAppPeriodsError(prev => ({ ...prev, [appId]: error.message }));
      setAppPeriodsLoading(prev => ({ ...prev, [appId]: false }));
      return;
    }

    const periodLookup = new Map(fiscalPeriods.map(period => [period.period, period]));
    const periods = (data ?? []).map((row: any) => {
      const periodInfo = periodLookup.get(row.period);
      return {
        period: row.period,
        label: periodInfo?.label ?? row.period,
        sort_order: periodInfo?.sort_order ?? 0,
      };
    });
    periods.sort((a, b) => b.sort_order - a.sort_order);
    setAppScorePeriodsByApp(prev => ({ ...prev, [appId]: periods }));
    setAppPeriodsLoading(prev => ({ ...prev, [appId]: false }));

    if (setDefaultForNew && newOccurrence.appId === appId && !newOccurrence.periodCode) {
      const first = periods[0];
      if (first) {
        setNewOccurrence({
          ...newOccurrence,
          periodCode: first.period,
          timePeriod: first.label,
          periodSortOrder: first.sort_order,
        });
      }
    }
  };

  // Get related occurrences for the currently editing theme
  const getRelatedOccurrences = () => {
    if (!editingOccurrence?.themeId) return [];
    
    let related = occurrences.filter(occ => 
      occ.themeId === editingOccurrence.themeId && occ.id !== editingOccurrence.id
    );
    
    // Apply filters
    if (relatedOccurrencesFilterApp !== 'all') {
      related = related.filter(occ => occ.appId === relatedOccurrencesFilterApp);
    }
    if (relatedOccurrencesFilterMonth !== 'all') {
      related = related.filter(occ => occ.timePeriod === relatedOccurrencesFilterMonth);
    }
    
    return related;
  };
  
  // Analyze shared vs unique summary points across related occurrences
  const analyzeSummaryPoints = () => {
    if (!editingOccurrence) return { shared: [], unique: [] };
    
    const relatedOccurrences = getRelatedOccurrences();
    const currentBullets = editingOccurrence.descriptionBullets || [];
    
    if (relatedOccurrences.length === 0) {
      return { shared: [], unique: currentBullets };
    }
    
    const shared: string[] = [];
    const unique: string[] = [];
    
    currentBullets.forEach(bullet => {
      const isInOthers = relatedOccurrences.some(occ => 
        occ.descriptionBullets?.some(b => b.toLowerCase() === bullet.toLowerCase())
      );
      if (isInOthers) {
        shared.push(bullet);
      } else {
        unique.push(bullet);
      }
    });
    
    return { shared, unique };
  };
  
  // Get aggregated view combining current occurrence + filtered related occurrences
  const getAggregatedView = () => {
    if (!editingOccurrence) return null;
    
    const relatedOccurrences = getRelatedOccurrences();
    
    // If viewing single occurrence only (no filters applied or no related matches)
    if (relatedOccurrences.length === 0) {
      return editingOccurrence;
    }
    
    // Combine all occurrences (current + related matches)
    const allOccurrences = [editingOccurrence, ...relatedOccurrences];
    
    // Aggregate description bullets with source labels
    const aggregatedBullets: Array<{ text: string; source: string }> = [];
    allOccurrences.forEach(occ => {
      if (occ.descriptionBullets) {
        occ.descriptionBullets.forEach(bullet => {
          if (bullet.trim()) {
            aggregatedBullets.push({
              text: bullet,
              source: `${occ.appName} • ${occ.timePeriod}`
            });
          }
        });
      }
    });
    
    // Aggregate example comments with source labels
    const aggregatedComments: Array<{ text: string; source: string }> = [];
    allOccurrences.forEach(occ => {
      if (occ.exampleComments) {
        occ.exampleComments.forEach(comment => {
          if (comment.trim()) {
            aggregatedComments.push({
              text: comment,
              source: `${occ.appName} • ${occ.timePeriod}`
            });
          }
        });
      }
    });
    
    return {
      ...editingOccurrence,
      aggregatedBullets,
      aggregatedComments,
      aggregatedCount: allOccurrences.length
    };
  };
  
  // Handle filter changes - switch to aggregated view when filters are active
  const handleRelatedAppFilterChange = (value: string) => {
    setRelatedOccurrencesFilterApp(value);
  };
  
  const handleRelatedMonthFilterChange = (value: string) => {
    setRelatedOccurrencesFilterMonth(value);
  };

  const toggleStack = (stackId: string) => {
    const newExpanded = new Set(expandedStacks);
    if (newExpanded.has(stackId)) {
      newExpanded.delete(stackId);
    } else {
      newExpanded.add(stackId);
    }
    setExpandedStacks(newExpanded);
  };

  const startEditing = (occurrence: ThemeOccurrence) => {
    setEditingOccurrenceId(occurrence.id);
    setEditingOccurrence({ ...occurrence });
    setShowRelatedOccurrences(false);
    setRelatedOccurrencesFilterApp('all');
    setRelatedOccurrencesFilterMonth('all');
    setThemeSearchQuery(occurrence.themeName);
    setManualMetadataMode(false);
    setShowExampleComments(occurrence.exampleComments && occurrence.exampleComments.length > 0);
    setEditScope('single'); // Default to editing single occurrence
  };

  const cancelEditing = () => {
    setEditingOccurrenceId(null);
    setEditingOccurrence(null);
    setManualMetadataMode(false);
    setThemeSearchQuery('');
    setEditScope('single');
  };

  const saveOccurrence = async () => {
    if (!editingOccurrence) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const trimmedTitle = editingOccurrence.themeName?.trim() ?? '';
      if (!trimmedTitle) {
        setSaveError('Theme title is required.');
        return;
      }

      const existingTheme = themeCatalog.find(theme => theme.id === editingOccurrence.themeId);
      if (existingTheme && existingTheme.title.trim() !== trimmedTitle) {
        const { error: titleUpdateError } = await supabase
          .from('themes')
          .update({ title: trimmedTitle })
          .eq('id', editingOccurrence.themeId);

        if (titleUpdateError) throw titleUpdateError;

        setThemeCatalog(themeCatalog.map(theme =>
          theme.id === editingOccurrence.themeId ? { ...theme, title: trimmedTitle } : theme
        ));
      }

      const scopeType = editingOccurrence.journeyId
        ? 'journey'
        : editingOccurrence.appId
          ? 'app'
          : 'portfolio';

      const periodCode = editingOccurrence.periodCode
        ?? periodOptions.find(period => period.label === editingOccurrence.timePeriod)?.period
        ?? editingOccurrence.timePeriod;

      const bullets = editingOccurrence.descriptionBullets?.filter(b => b.trim()) ?? [];

      const normalizedEditStatus = normalizeStatusForDb(editingOccurrence.status);
      const resolvedEditStatus = (editingOccurrence.type ?? 'negative') === 'positive'
        ? (normalizedEditStatus ?? 'stabilized')
        : (normalizedEditStatus ?? 'unresolved');

      const { error: updateError } = await supabase
        .from('pain_observations')
        .update({
          period: periodCode,
          theme_id: editingOccurrence.themeId,
          theme_type: editingOccurrence.type ?? 'negative',
          status: resolvedEditStatus,
          months_active: editingOccurrence.monthsActive ?? null,
          percent_of_feedback: editingOccurrence.percentage ?? null,
          narrative: bullets[0] ?? null,
          bullets: bullets.length ? bullets : null,
          app_id: scopeType === 'app' ? editingOccurrence.appId : null,
          journey_id: scopeType === 'journey' ? editingOccurrence.journeyId : null,
          scope_type: scopeType,
        })
        .eq('id', Number(editingOccurrence.id));

      if (updateError) throw updateError;

      if (editingOccurrence.appId) {
        const { error: deleteError } = await supabase
          .from('pain_observation_apps')
          .delete()
          .eq('observation_id', Number(editingOccurrence.id));

        if (deleteError) throw deleteError;

        const { error: linkError } = await supabase
          .from('pain_observation_apps')
          .insert({
            observation_id: Number(editingOccurrence.id),
            app_id: editingOccurrence.appId,
          });

        if (linkError) throw linkError;
      }

      const refreshed = await fetchThemes({
        periods: fiscalPeriods,
        apps: appCatalog,
        journeys: journeyCatalog,
        themes: themeCatalog,
      });
      setOccurrences(refreshed);
      setEditingOccurrenceId(null);
      setEditingOccurrence(null);
      setManualMetadataMode(false);
      setThemeSearchQuery('');
      setEditScope('single');
      setSuccessMessage('Theme occurrence updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setSaveError(error?.message ?? 'Failed to update theme.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteOccurrence = async () => {
    if (!editingOccurrence) return;

    const confirmed = window.confirm('Delete this theme occurrence? This cannot be undone.');
    if (!confirmed) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const occurrenceId = Number(editingOccurrence.id);

      const { error: deleteLinksError } = await supabase
        .from('pain_observation_apps')
        .delete()
        .eq('observation_id', occurrenceId);

      if (deleteLinksError) throw deleteLinksError;

      const { error: deleteError } = await supabase
        .from('pain_observations')
        .delete()
        .eq('id', occurrenceId);

      if (deleteError) throw deleteError;

      const refreshed = await fetchThemes({
        periods: fiscalPeriods,
        apps: appCatalog,
        journeys: journeyCatalog,
        themes: themeCatalog,
      });
      setOccurrences(refreshed);
      setEditingOccurrenceId(null);
      setEditingOccurrence(null);
      setManualMetadataMode(false);
      setThemeSearchQuery('');
      setEditScope('single');
      setSuccessMessage('Theme occurrence deleted.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setSaveError(error?.message ?? 'Failed to delete theme.');
    } finally {
      setIsSaving(false);
    }
  };

  const startAddingNew = () => {
    setIsAddingNew(true);
    setNewOccurrence({
      ...emptyOccurrence,
    });
    setThemeSearchQuery('');
    setManualMetadataMode(false);
    setShowExampleComments(false);
  };

  const cancelAddingNew = () => {
    setIsAddingNew(false);
    setNewOccurrence({ ...emptyOccurrence });
    setThemeSearchQuery('');
    setManualMetadataMode(false);
    setShowExampleComments(false);
  };

  const handlePreview = () => {
    if (!newOccurrence.themeName || newOccurrence.descriptionBullets?.filter(b => b.trim()).length === 0) {
      alert('Please fill in all required fields (Title and at least one Description Bullet)');
      return;
    }
    setShowPreview(true);
  };

  const saveNewOccurrence = async (keepOpen = false) => {
    if (!newOccurrence.themeName || !newOccurrence.descriptionBullets || newOccurrence.descriptionBullets.filter(b => b.trim()).length === 0) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const themeTitle = newOccurrence.themeName.trim();
      const themeId = newOccurrence.themeId ?? toThemeId(themeTitle);
      const periodCode = newOccurrence.periodCode
        ?? periodOptions.find(period => period.label === newOccurrence.timePeriod)?.period
        ?? newOccurrence.timePeriod;

      if (!periodCode) {
        setSaveError('Please select a valid period.');
        return;
      }

      const scopeType = newOccurrence.journeyId
        ? 'journey'
        : newOccurrence.appId
          ? 'app'
          : 'portfolio';

      const { data: existingTheme, error: themeLookupError } = await supabase
        .from('themes')
        .select('id,title')
        .eq('title', themeTitle)
        .maybeSingle();

      if (themeLookupError) {
        throw themeLookupError;
      }

      let resolvedThemeId = existingTheme?.id ?? themeId;
      let nextThemeCatalog = themeCatalog;

      if (!existingTheme) {
        const { error: themeInsertError } = await supabase
          .from('themes')
          .insert({
            id: resolvedThemeId,
            title: themeTitle,
            description: newOccurrence.descriptionBullets?.filter(b => b.trim()).join(' ') || null,
            default_type: newOccurrence.type ?? 'negative',
            tags: [],
          });

        if (themeInsertError) {
          throw themeInsertError;
        }
        const createdTheme = { id: resolvedThemeId, title: themeTitle, default_type: newOccurrence.type ?? 'negative' };
        nextThemeCatalog = [...themeCatalog, createdTheme];
        setThemeCatalog(nextThemeCatalog);
      }

      const bullets = newOccurrence.descriptionBullets?.filter(b => b.trim()) ?? [];
      const normalizedStatus = normalizeStatusForDb(newOccurrence.status);
      const resolvedStatus = (newOccurrence.type ?? 'negative') === 'positive'
        ? (normalizedStatus ?? 'stabilized')
        : (normalizedStatus ?? 'unresolved');

      const { data: observation, error: observationError } = await supabase
        .from('pain_observations')
        .insert({
          period: periodCode,
          theme_id: resolvedThemeId,
          scope_type: scopeType,
          app_id: scopeType === 'app' ? newOccurrence.appId : null,
          journey_id: scopeType === 'journey' ? newOccurrence.journeyId : null,
          theme_type: newOccurrence.type ?? 'negative',
          severity: 'medium',
          status: resolvedStatus,
          months_active: newOccurrence.monthsActive ?? null,
          mentions_count: null,
          percent_of_feedback: newOccurrence.percentage ?? null,
          narrative: bullets[0] ?? null,
          bullets: bullets.length ? bullets : null,
        })
        .select('id')
        .single();

      if (observationError) {
        throw observationError;
      }

      if (newOccurrence.appId) {
        const { error: linkError } = await supabase
          .from('pain_observation_apps')
          .insert({
            observation_id: observation?.id,
            app_id: newOccurrence.appId,
          });

        if (linkError) {
          throw linkError;
        }
      }

      const refreshed = await fetchThemes({
        periods: fiscalPeriods,
        apps: appCatalog,
        journeys: journeyCatalog,
        themes: nextThemeCatalog,
      });
      setOccurrences(refreshed);

      if (keepOpen) {
        setNewOccurrence(prev => ({
          ...emptyOccurrence,
          appId: prev.appId,
          appName: prev.appName,
          journeyId: prev.journeyId,
          journeyName: prev.journeyName,
          periodCode: prev.periodCode,
          timePeriod: prev.timePeriod,
          periodSortOrder: prev.periodSortOrder,
        }));
        setThemeSearchQuery('');
        setManualMetadataMode(false);
        setShowPreview(false);
        setShowExampleComments(false);
        setSuccessMessage('Theme saved. Add another.');
        setTimeout(() => setSuccessMessage(''), 3000);
        return;
      }

      setIsAddingNew(false);
      setNewOccurrence({ ...emptyOccurrence });
      setThemeSearchQuery('');
      setManualMetadataMode(false);
      setShowPreview(false);
      setSuccessMessage('Theme occurrence created successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setSaveError(error?.message ?? 'Failed to create theme.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateEditingOccurrence = (field: keyof ThemeOccurrence, value: any) => {
    if (editingOccurrence) {
      setEditingOccurrence({ ...editingOccurrence, [field]: value });
    }
  };

  const updateNewOccurrence = (field: keyof Partial<ThemeOccurrence>, value: any) => {
    setNewOccurrence((prev) => ({ ...prev, [field]: value }));
  };

  const updateDescriptionBullet = (index: number, value: string, isNew: boolean) => {
    if (isNew && newOccurrence.descriptionBullets) {
      const newBullets = [...newOccurrence.descriptionBullets];
      newBullets[index] = value;
      setNewOccurrence({ ...newOccurrence, descriptionBullets: newBullets });
    } else if (editingOccurrence) {
      const newBullets = [...editingOccurrence.descriptionBullets];
      newBullets[index] = value;
      setEditingOccurrence({ ...editingOccurrence, descriptionBullets: newBullets });
    }
  };

  const addDescriptionBullet = (isNew: boolean) => {
    if (isNew && newOccurrence.descriptionBullets) {
      setNewOccurrence({ ...newOccurrence, descriptionBullets: [...newOccurrence.descriptionBullets, ''] });
    } else if (editingOccurrence) {
      setEditingOccurrence({ ...editingOccurrence, descriptionBullets: [...editingOccurrence.descriptionBullets, ''] });
    }
  };

  const removeDescriptionBullet = (index: number, isNew: boolean) => {
    if (isNew && newOccurrence.descriptionBullets && newOccurrence.descriptionBullets.length > 1) {
      setNewOccurrence({ 
        ...newOccurrence, 
        descriptionBullets: newOccurrence.descriptionBullets.filter((_, i) => i !== index) 
      });
    } else if (editingOccurrence && editingOccurrence.descriptionBullets.length > 1) {
      setEditingOccurrence({ 
        ...editingOccurrence, 
        descriptionBullets: editingOccurrence.descriptionBullets.filter((_, i) => i !== index) 
      });
    }
  };

  const updateExampleComment = (index: number, value: string, isNew: boolean) => {
    if (isNew && newOccurrence.exampleComments) {
      const newComments = [...newOccurrence.exampleComments];
      newComments[index] = value;
      setNewOccurrence({ ...newOccurrence, exampleComments: newComments });
    } else if (editingOccurrence) {
      const newComments = [...editingOccurrence.exampleComments];
      newComments[index] = value;
      setEditingOccurrence({ ...editingOccurrence, exampleComments: newComments });
    }
  };

  const addExampleComment = (isNew: boolean) => {
    if (isNew) {
      setNewOccurrence({ ...newOccurrence, exampleComments: [...(newOccurrence.exampleComments ?? []), ''] });
    } else if (editingOccurrence) {
      setEditingOccurrence({ ...editingOccurrence, exampleComments: [...editingOccurrence.exampleComments, ''] });
    }
  };

  const removeExampleComment = (index: number, isNew: boolean) => {
    if (isNew && newOccurrence.exampleComments) {
      setNewOccurrence({ 
        ...newOccurrence, 
        exampleComments: newOccurrence.exampleComments.filter((_, i) => i !== index) 
      });
    } else if (editingOccurrence) {
      setEditingOccurrence({ 
        ...editingOccurrence, 
        exampleComments: editingOccurrence.exampleComments.filter((_, i) => i !== index) 
      });
    }
  };

  const handleCreateJourney = () => {
    if (newJourneyData.name.trim() && newJourneyData.steps.length > 0) {
      const journeyId = `j${journeyCatalog.length + 1}`;
      // In a real app, you would save this to the database
      console.log('Creating new journey:', { id: journeyId, ...newJourneyData });
      
      // Update the theme with the new journey
      if (isAddingNew) {
        setNewOccurrence({ ...newOccurrence, journeyId, journeyName: newJourneyData.name });
      } else if (editingOccurrence) {
        setEditingOccurrence({ ...editingOccurrence, journeyId, journeyName: newJourneyData.name });
      }
      
      // Close modal and reset
      setShowJourneyModal(false);
      setNewJourneyData({
        name: '',
        description: '',
        status: 'pending',
        collectionFrequency: 'monthly',
        steps: [],
      });
      setSuccessMessage(`Journey "${newJourneyData.name}" created successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const addStepToJourney = () => {
    const newStep = {
      id: `s${Date.now()}`,
      stepNumber: newJourneyData.steps.length + 1,
      name: '',
      appId: '',
      appName: '',
      description: '',
    };
    setNewJourneyData({ ...newJourneyData, steps: [...newJourneyData.steps, newStep] });
  };

  const updateJourneyStep = (stepId: string, field: string, value: any) => {
    const updatedSteps = newJourneyData.steps.map(step => {
      if (step.id === stepId) {
        if (field === 'appId') {
          const app = appOptions.find(a => a.id === value);
          return { ...step, appId: value, appName: app?.name || '' };
        }
        return { ...step, [field]: value };
      }
      return step;
    });
    setNewJourneyData({ ...newJourneyData, steps: updatedSteps });
  };

  const removeJourneyStep = (stepId: string) => {
    const updatedSteps = newJourneyData.steps
      .filter(step => step.id !== stepId)
      .map((step, index) => ({ ...step, stepNumber: index + 1 }));
    setNewJourneyData({ ...newJourneyData, steps: updatedSteps });
  };

  const getStatusBadge = (status?: 'unresolved' | 'improving' | 'stabilized' | 'resolved-monitoring', type?: 'positive' | 'negative' | 'neutral') => {
    if (type === 'positive') {
      return null;
    }
    if (!status) return { label: 'Unresolved', color: 'text-red-800', bgColor: 'bg-red-100' };

    switch (status) {
      case 'unresolved':
        return { label: 'Unresolved', color: 'text-red-800', bgColor: 'bg-red-100' };
      case 'improving':
        return { label: 'Improving', color: 'text-amber-800', bgColor: 'bg-amber-100' };
      case 'stabilized':
        return { label: 'Stabilized', color: 'text-green-800', bgColor: 'bg-green-100' };
      case 'resolved-monitoring':
        return { label: 'Resolved - Monitoring', color: 'text-blue-800', bgColor: 'bg-blue-100' };
    }
  };

  const getPersistenceLabel = (monthsActive?: number): string => {
    if (!monthsActive || monthsActive === 0) return 'New this period';
    if (monthsActive < 3) return `Emerging pattern (${monthsActive} month${monthsActive > 1 ? 's' : ''})`;
    if (monthsActive < 6) return `Recurring pattern (${monthsActive} months)`;
    return `Chronic issue (${monthsActive}+ months)`;
  };

  const getDisplayPersistenceLabel = (occurrence?: { persistenceTag?: string; monthsActive?: number }) => {
    if (occurrence?.persistenceTag) return occurrence.persistenceTag;
    return getPersistenceLabel(occurrence?.monthsActive);
  };

  const renderThemeForm = (occurrence: Partial<ThemeOccurrence>, isNew: boolean) => {
    const currentOccurrence = isNew ? newOccurrence : editingOccurrence;
    if (!currentOccurrence) return null;

    return (
      <div className="space-y-6">
        {/* Target Context */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Target Context</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Target App</Label>
              <Select 
                value={currentOccurrence.appId ?? 'none'} 
                onValueChange={(value) => {
                  if (value === 'none') {
                    if (isNew) {
                      setNewOccurrence(prev => ({
                        ...prev,
                        appId: undefined,
                        appName: undefined,
                        periodCode: undefined,
                        timePeriod: '',
                        periodSortOrder: undefined,
                      }));
                    } else {
                      updateEditingOccurrence('appId', undefined);
                      updateEditingOccurrence('appName', undefined);
                      updateEditingOccurrence('periodCode', undefined);
                      updateEditingOccurrence('timePeriod', '');
                      updateEditingOccurrence('periodSortOrder', undefined);
                    }
                    return;
                  }
                  const app = appOptions.find(a => a.id === value);
                  if (isNew) {
                    setNewOccurrence({ ...newOccurrence, appId: value, appName: app?.name });
                    void loadAppPeriods(value, true);
                  } else {
                    updateEditingOccurrence('appId', value);
                    updateEditingOccurrence('appName', app?.name);
                    void loadAppPeriods(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select app (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {appOptions.map(app => (
                    <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Month</Label>
              <Select 
                value={currentOccurrence.periodCode || ''} 
                onValueChange={(value) => {
                  const selected = getPeriodOptionsForApp(currentOccurrence.appId).find(period => period.period === value);
                  if (isNew) {
                    setNewOccurrence({
                      ...newOccurrence,
                      periodCode: value,
                      timePeriod: selected?.label ?? value,
                      periodSortOrder: selected?.sort_order,
                    });
                  } else {
                    updateEditingOccurrence('periodCode', value);
                    updateEditingOccurrence('timePeriod', selected?.label ?? value);
                    updateEditingOccurrence('periodSortOrder', selected?.sort_order);
                  }
                }}
                disabled={!currentOccurrence.appId || appPeriodsLoading[currentOccurrence.appId]}
              >
                <SelectTrigger>
                  <SelectValue placeholder={currentOccurrence.appId ? 'Select month' : 'Select app first'} />
                </SelectTrigger>
                <SelectContent>
                  {getPeriodOptionsForApp(currentOccurrence.appId).length === 0 && (
                    <SelectItem value="no-data" disabled>
                      {appPeriodsLoading[currentOccurrence.appId ?? '']
                        ? 'Loading months...'
                        : 'No scored months found'}
                    </SelectItem>
                  )}
                  {getPeriodOptionsForApp(currentOccurrence.appId).map(period => (
                    <SelectItem key={period.period} value={period.period}>{period.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentOccurrence.appId && appPeriodsError[currentOccurrence.appId] && (
                <p className="text-xs text-red-600">{appPeriodsError[currentOccurrence.appId]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Target Journey</Label>
              <Select 
                value={currentOccurrence.journeyId || 'none'} 
                onValueChange={(value) => {
                  if (value === 'create-new') {
                    setShowJourneyModal(true);
                  } else if (value === 'none') {
                    if (isNew) {
                      setNewOccurrence({ ...newOccurrence, journeyId: undefined, journeyName: undefined });
                    } else {
                      updateEditingOccurrence('journeyId', undefined);
                      updateEditingOccurrence('journeyName', undefined);
                    }
                  } else {
                    const journey = journeyOptions.find(j => j.id === value);
                    if (isNew) {
                      setNewOccurrence({ ...newOccurrence, journeyId: value, journeyName: journey?.name });
                    } else {
                      updateEditingOccurrence('journeyId', value);
                      updateEditingOccurrence('journeyName', journey?.name);
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select journey (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {journeyOptions.map(journey => (
                    <SelectItem key={journey.id} value={journey.id}>{journey.name}</SelectItem>
                  ))}
                  <SelectItem value="create-new">
                    <div className="flex items-center gap-2 text-orange-600 font-semibold">
                      <Plus className="size-4" />
                      Create New Journey
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Theme Details */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Theme Details</h3>
          <div className="space-y-4">
            {/* Theme Title with Smart Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label>
                  Theme Title <span className="text-red-600">*</span>
                </Label>
                <div className="relative" ref={themeSearchRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      value={themeSearchQuery}
                      onChange={(e) => {
                        setThemeSearchQuery(e.target.value);
                        if (isNew) {
                          updateNewOccurrence('themeName', e.target.value);
                        } else {
                          updateEditingOccurrence('themeName', e.target.value);
                        }
                        searchThemes(e.target.value);
                        setShowThemeSearchDropdown(e.target.value.trim() !== '');
                      }}
                      placeholder="Search existing themes or enter new..."
                      className="pl-9"
                      required
                    />
                  </div>
                  {showThemeSearchDropdown && themeSearchResults.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-slate-300 rounded shadow-lg">
                      {themeSearchResults.map((existingTheme, resultIndex) => (
                        <button
                          key={resultIndex}
                          type="button"
                          onClick={() => selectExistingTheme(existingTheme)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-100 border-b border-slate-100 last:border-b-0"
                        >
                          <div className="font-medium text-sm">{existingTheme.title}</div>
                          <div className="text-xs text-slate-600 mt-1 flex items-center gap-3">
                            <span className="font-semibold">{existingTheme.appName}</span>
                            <span>
                              {existingTheme.percentage == null ? '—' : `${existingTheme.percentage}%`}
                            </span>
                            <span className={existingTheme.type === 'positive' ? 'text-green-700' : existingTheme.type === 'negative' ? 'text-red-700' : 'text-slate-700'}>
                              {existingTheme.type}
                            </span>
                            {existingTheme.isNew && <span className="text-amber-600">NEW</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Percentage</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={currentOccurrence.percentage ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const parsed = value === '' ? null : Number(value);
                    const nextValue = Number.isNaN(parsed) ? null : parsed;
                    if (isNew) {
                      updateNewOccurrence('percentage', nextValue);
                    } else {
                      updateEditingOccurrence('percentage', nextValue);
                    }
                  }}
                  placeholder="0-100"
                />
                <p className="text-xs text-slate-500">What % of feedback mentions this theme?</p>
              </div>
            </div>

            {/* Type and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Theme Type</Label>
                <Select 
                  value={currentOccurrence.type} 
                  onValueChange={(value) => {
                    const newType = value as 'positive' | 'negative' | 'neutral';
                    if (isNew) {
                      setNewOccurrence((prev) => ({
                        ...prev,
                        type: newType,
                        status: newType === 'negative' ? 'unresolved' : undefined,
                      }));
                    } else {
                      updateEditingOccurrence('type', newType);
                      if (newType === 'negative') {
                        updateEditingOccurrence('status', 'unresolved');
                      } else {
                        updateEditingOccurrence('status', undefined);
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="negative">Negative (Pain Point)</SelectItem>
                    <SelectItem value="positive">Positive (Driver)</SelectItem>
                    <SelectItem value="neutral">Neutral (Observation)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">Is this feedback positive, negative, or neutral?</p>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={currentOccurrence.type === 'positive' ? 'none' : (currentOccurrence.status ?? 'none')} 
                  onValueChange={(value) => {
                    const nextStatus = value === 'none' ? undefined : value;
                    if (isNew) {
                      updateNewOccurrence('status', nextStatus);
                    } else {
                      updateEditingOccurrence('status', nextStatus);
                    }
                  }}
                  disabled={currentOccurrence.type === 'positive'}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="unresolved">Unresolved</SelectItem>
                    <SelectItem value="improving">Improving</SelectItem>
                    <SelectItem value="stabilized">Stabilized</SelectItem>
                    <SelectItem value="resolved-monitoring">Resolved - Monitoring</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  {currentOccurrence.type === 'positive'
                    ? 'Status is not applicable for positive themes.'
                    : 'Current state of this issue or driver'}
                </p>
              </div>
            </div>

            {/* Summary Points */}
            <div className="space-y-2">
              <Label>
                Summary Points <span className="text-red-600">*</span>
              </Label>
              <p className="text-xs text-slate-500">2-3 concise bullets synthesized from associate comments</p>
              
              {currentOccurrence.descriptionBullets?.map((bullet, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={bullet}
                    onChange={(e) => updateDescriptionBullet(index, e.target.value, isNew)}
                    placeholder="Enter summary point..."
                    className="flex-1"
                  />
                  {(currentOccurrence.descriptionBullets?.length ?? 0) > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDescriptionBullet(index, isNew)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addDescriptionBullet(isNew)}
              >
                <Plus className="size-4 mr-2" />
                Add Bullet
              </Button>
            </div>

            {/* Example Comments Toggle */}
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label>Include Example Comments?</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">{showExampleComments ? 'Yes' : 'No'}</span>
                    <Switch
                      checked={showExampleComments}
                      onCheckedChange={setShowExampleComments}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">Add verbatim quotes from associate feedback (optional)</p>
              </div>
              
              {showExampleComments && (
                <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                  {currentOccurrence.exampleComments?.map((comment, index) => (
                    <div key={index} className="flex gap-2">
                      <Textarea
                        value={comment}
                        onChange={(e) => updateExampleComment(index, e.target.value, isNew)}
                        placeholder="Enter example comment from associate feedback..."
                        className="flex-1"
                        rows={2}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExampleComment(index, isNew)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addExampleComment(isNew)}
                  >
                    <Plus className="size-4 mr-2" />
                    Add Example
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Auto-Calculated Metadata - Only show in edit mode */}
        {!isNew && (
          <div className="border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Auto-Calculated Metadata</h3>
                <p className="text-sm text-slate-500">System-generated values based on historical data</p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="manual-mode" className="text-sm">
                  {manualMetadataMode ? <Unlock className="size-4 inline mr-1 text-amber-600" /> : <Lock className="size-4 inline mr-1 text-slate-400" />}
                  {manualMetadataMode ? 'Manual Mode' : 'Read-Only'}
                </Label>
                <Switch
                  id="manual-mode"
                  checked={manualMetadataMode}
                  onCheckedChange={setManualMetadataMode}
                />
              </div>
            </div>

            <Card className={`p-4 ${manualMetadataMode ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
              {manualMetadataMode && (
                <div className="mb-4 p-3 bg-amber-100 border border-amber-300 rounded flex items-start gap-2">
                  <AlertCircle className="size-5 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900">
                    <strong>Warning:</strong> Manual mode enabled. Changes to these fields will override system calculations and may affect reporting accuracy.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Persistence */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Pattern Persistence
                    {!manualMetadataMode && <Lock className="size-3 text-slate-400" />}
                  </Label>
                  {manualMetadataMode ? (
                    <Input
                      type="number"
                      min="0"
                      value={currentOccurrence.monthsActive || 0}
                      onChange={(e) => {
                        updateEditingOccurrence('monthsActive', parseInt(e.target.value));
                        if (editingOccurrence?.manualOverrides) {
                          updateEditingOccurrence('manualOverrides', { ...editingOccurrence.manualOverrides, monthsActive: true });
                        }
                      }}
                    />
                  ) : (
                    <div className="p-2 bg-white border border-slate-300 rounded text-sm text-slate-400">
                      {getDisplayPersistenceLabel(currentOccurrence)}
                    </div>
                  )}
                </div>

                {/* Trend Direction */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Trend Direction
                    {!manualMetadataMode && <Lock className="size-3 text-slate-400" />}
                  </Label>
                  {manualMetadataMode ? (
                    <div className="flex gap-2">
                      <Select 
                        value={currentOccurrence.trendDirection || 'stable'} 
                        onValueChange={(value) => {
                          updateEditingOccurrence('trendDirection', value);
                          if (editingOccurrence?.manualOverrides) {
                            updateEditingOccurrence('manualOverrides', { ...editingOccurrence.manualOverrides, trendDirection: true });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="increasing">Increasing</SelectItem>
                          <SelectItem value="decreasing">Decreasing</SelectItem>
                          <SelectItem value="stable">Stable</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="%"
                        value={currentOccurrence.trendPercentage || 0}
                        onChange={(e) => {
                          updateEditingOccurrence('trendPercentage', parseFloat(e.target.value));
                          if (editingOccurrence?.manualOverrides) {
                            updateEditingOccurrence('manualOverrides', { ...editingOccurrence.manualOverrides, trendPercentage: true });
                          }
                        }}
                        className="w-24"
                      />
                    </div>
                  ) : (
                    <div className="p-2 bg-white border border-slate-300 rounded text-sm text-slate-400">
                      {currentOccurrence.trendDirection === 'increasing' && `↑ ${currentOccurrence.trendPercentage}% vs last period`}
                      {currentOccurrence.trendDirection === 'decreasing' && `↓ ${Math.abs(currentOccurrence.trendPercentage || 0)}% vs last period`}
                      {currentOccurrence.trendDirection === 'stable' && 'Stable vs last period'}
                      {!currentOccurrence.trendDirection && 'No trend data'}
                    </div>
                  )}
                </div>

                {/* Cross-App Count - Not applicable to individual occurrences */}
                {/* Each occurrence is specific to one app+month */}

                {/* New Theme Flag */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    First Appearance
                    {!manualMetadataMode && <Lock className="size-3 text-slate-400" />}
                  </Label>
                  {manualMetadataMode ? (
                    <Select 
                      value={currentOccurrence.isNew ? 'true' : 'false'} 
                      onValueChange={(value) => {
                        updateEditingOccurrence('isNew', value === 'true');
                        if (editingOccurrence?.manualOverrides) {
                          updateEditingOccurrence('manualOverrides', { ...editingOccurrence.manualOverrides, isNew: true });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">New this period</SelectItem>
                        <SelectItem value="false">Previously seen</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2 bg-white border border-slate-300 rounded text-sm text-slate-400">
                      {currentOccurrence.isNew ? 'New this period' : 'Previously appeared'}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  };

  const navItems = [
    { id: 'home', label: 'Home', onClick: onNavigateHome },
    { id: 'all-apps', label: 'All Apps', onClick: onNavigateAllApps },
    { id: 'key-journeys', label: 'Key Journeys', onClick: onNavigateKeyJourneys },
    { id: 'top-pains', label: 'Top Pains', onClick: onNavigateTopPains },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Preview Modal */}
      {showPreview && newOccurrence.themeName && (
        <AdminThemesPreview
          themes={[{
            title: newOccurrence.themeName,
            percentage: newOccurrence.percentage ?? 0,
            type: newOccurrence.type ?? 'negative',
            descriptionBullets: newOccurrence.descriptionBullets ?? [],
            exampleComments: newOccurrence.exampleComments ?? [],
            monthsActive: newOccurrence.monthsActive,
            trendDirection: newOccurrence.trendDirection,
            trendPercentage: newOccurrence.trendPercentage,
            crossAppCount: 1, // Single occurrence
            isNew: newOccurrence.isNew,
            status: newOccurrence.status,
            manualOverrides: newOccurrence.manualOverrides ?? {},
          }]}
          contextThemes={[]}
          contextInfo={{
            apps: newOccurrence.appName || 'None',
            journey: newOccurrence.journeyName || 'None',
            timePeriod: newOccurrence.timePeriod || 'November 2025',
          }}
          onClose={() => setShowPreview(false)}
          onSubmit={() => {
            setShowPreview(false);
            saveNewOccurrence();
          }}
        />
      )}

      {/* Journey Creation Modal */}
      {showJourneyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900">Create New Journey</h2>
              <Button variant="ghost" size="sm" onClick={() => {
                setShowJourneyModal(false);
                setNewJourneyData({
                  name: '',
                  description: '',
                  status: 'pending',
                  collectionFrequency: 'monthly',
                  steps: [],
                });
              }}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Left Panel - Form */}
              <div className="flex-1 overflow-y-auto p-6 border-r border-slate-200">

              <div className="space-y-6">
                {/* Basic Information Section */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">
                    Basic Information
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="journey-name">
                      Journey Name <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="journey-name"
                      value={newJourneyData.name}
                      onChange={(e) => setNewJourneyData({ ...newJourneyData, name: e.target.value })}
                      placeholder="e.g., Schedule Patient Visit"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="journey-description">Description (Optional)</Label>
                    <Textarea
                      id="journey-description"
                      value={newJourneyData.description}
                      onChange={(e) => setNewJourneyData({ ...newJourneyData, description: e.target.value })}
                      placeholder="Describe this journey..."
                      rows={3}
                    />
                  </div>
                </div>

                {/* Collection Settings Section */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-2">
                    Collection Settings
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="journey-status">
                        Collection Status <span className="text-red-600">*</span>
                      </Label>
                      <Select
                        value={newJourneyData.status}
                        onValueChange={(value: any) => setNewJourneyData({ ...newJourneyData, status: value })}
                      >
                        <SelectTrigger id="journey-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending - Not Yet Collecting Data</SelectItem>
                          <SelectItem value="active">Active - Currently Collecting Data</SelectItem>
                          <SelectItem value="inactive">Inactive - No Longer Being Measured</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(newJourneyData.status === 'pending' || newJourneyData.status === 'active') && (
                      <div className="space-y-2">
                        <Label htmlFor="journey-frequency">
                          Collection Frequency <span className="text-red-600">*</span>
                        </Label>
                        <Select
                          value={newJourneyData.collectionFrequency}
                          onValueChange={(value: any) => setNewJourneyData({ ...newJourneyData, collectionFrequency: value })}
                        >
                          <SelectTrigger id="journey-frequency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="semi-annually">Semi-annually</SelectItem>
                            <SelectItem value="annually">Annually</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Define Journey Steps Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        Define Journey Steps <span className="text-red-600">*</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Add the sequential steps that make up this journey
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addStepToJourney}
                    >
                      <Plus className="size-4 mr-1" />
                      Add Step
                    </Button>
                  </div>

                  {newJourneyData.steps.length === 0 && (
                    <div className="text-center py-8 bg-slate-50 border border-slate-200 rounded-lg">
                      <p className="text-slate-600 text-sm">No steps added yet. Click "Add Step" to begin.</p>
                    </div>
                  )}

                  {newJourneyData.steps.map((step, index) => (
                    <div key={step.id} className="border border-slate-300 rounded-lg p-4 bg-white">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center size-8 rounded-full bg-[#ff6900] text-white font-semibold shrink-0 mt-1">
                          {step.stepNumber}
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label className="text-sm">Step Name <span className="text-red-600">*</span></Label>
                              <Input
                                value={step.name}
                                onChange={(e) => updateJourneyStep(step.id, 'name', e.target.value)}
                                placeholder="e.g., Check Availability"
                                className="text-sm"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">Primary App <span className="text-red-600">*</span></Label>
                              <Select
                                value={step.appId}
                                onValueChange={(value) => updateJourneyStep(step.id, 'appId', value)}
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue placeholder="Select app..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {appOptions.map(app => (
                                    <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">Journey Context (Optional)</Label>
                            <Textarea
                              value={step.description || ''}
                              onChange={(e) => updateJourneyStep(step.id, 'description', e.target.value)}
                              placeholder="How this step fits in this journey..."
                              rows={2}
                              className="text-sm resize-none"
                            />
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeJourneyStep(step.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              </div>

              {/* Right Panel - Live Preview */}
              <div className="w-[400px] bg-slate-50 overflow-y-auto p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Eye className="size-5 text-slate-600" />
                    <h3 className="text-base font-semibold text-slate-900">Live Preview</h3>
                  </div>

                  {/* Journey Header */}
                  <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Journey Name</div>
                      <div className="text-lg font-semibold text-slate-900">
                        {newJourneyData.name || <span className="text-slate-400 italic">Untitled Journey</span>}
                      </div>
                    </div>
                    
                    {newJourneyData.description && (
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Description</div>
                        <div className="text-sm text-slate-700">{newJourneyData.description}</div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Status</div>
                        <div className="text-sm">
                          {newJourneyData.status === 'pending' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-100 text-amber-800 text-xs font-medium">
                            <Clock className="size-3" /> Pending
                          </span>}
                          {newJourneyData.status === 'active' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium">
                            <CheckCircle className="size-3" /> Active
                          </span>}
                          {newJourneyData.status === 'inactive' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-200 text-slate-700 text-xs font-medium">
                            <XCircle className="size-3" /> Inactive
                          </span>}
                        </div>
                      </div>
                      {(newJourneyData.status === 'pending' || newJourneyData.status === 'active') && (
                        <div>
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Frequency</div>
                          <div className="text-sm text-slate-900 capitalize">{newJourneyData.collectionFrequency}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Journey Steps Preview */}
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                      Journey Flow ({newJourneyData.steps.length} step{newJourneyData.steps.length !== 1 ? 's' : ''})
                    </div>
                    
                    {newJourneyData.steps.length === 0 ? (
                      <div className="bg-white rounded-lg border border-dashed border-slate-300 p-6 text-center">
                        <p className="text-sm text-slate-500">No steps added yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {newJourneyData.steps.map((step, index) => (
                          <div key={step.id}>
                            <div className="bg-white rounded-lg border border-slate-200 p-3">
                              <div className="flex items-start gap-3">
                                <div className="flex items-center justify-center size-7 rounded-full bg-[#ff6900] text-white text-sm font-semibold shrink-0">
                                  {step.stepNumber}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-slate-900 truncate">
                                    {step.name || <span className="text-slate-400 italic">Step {step.stepNumber}</span>}
                                  </div>
                                  {step.appName && (
                                    <div className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                                      <span className="size-1 rounded-full bg-slate-400"></span>
                                      {step.appName}
                                    </div>
                                  )}
                                  {step.description && (
                                    <div className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                                      {step.description}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            {index < newJourneyData.steps.length - 1 && (
                              <div className="flex justify-center py-1">
                                <ArrowDown className="size-4 text-slate-400" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions - Bottom Bar */}
            <div className="flex gap-2 justify-end border-t border-slate-200 p-6">
              <Button variant="outline" onClick={() => {
                setShowJourneyModal(false);
                setNewJourneyData({
                  name: '',
                  description: '',
                  status: 'pending',
                  collectionFrequency: 'monthly',
                  steps: [],
                });
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateJourney}
                disabled={!newJourneyData.name.trim() || newJourneyData.steps.length === 0 || newJourneyData.steps.some(s => !s.name || !s.appId)}
                style={{ backgroundColor: '#ff6900', color: 'white' }}
                className="hover:bg-orange-600"
              >
                Create Journey
              </Button>
            </div>
          </Card>
        </div>
      )}

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
                <h1 className="font-semibold">Admin: Manage Feedback Themes</h1>
              </div>
              <p className="text-white/90 mt-1 text-sm">
                View, edit, and create feedback themes for apps, journeys, and time periods
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onNavigateBack}
              className="bg-orange-700 border-orange-600 text-white hover:bg-orange-600"
            >
              Back
            </Button>
          </div>
        </div>
      </header>

      {/* Admin Tabs */}
      <AdminTabNav activeTab="manage-themes" onTabChange={onTabChange} />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded text-green-800">
            {successMessage}
          </div>
        )}
        {saveError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-800">
            {saveError}
          </div>
        )}
        {loadError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-800">
            Failed to load themes from Supabase: {loadError}
          </div>
        )}
        {isLoading && (
          <div className="mb-6 text-sm text-slate-600">Loading themes...</div>
        )}

        {/* Add New Theme Button */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">All Themes ({stacks.length})</h2>
            <p className="text-sm text-slate-600 mt-1">Manage feedback themes across apps and time periods</p>
          </div>
          {!isAddingNew && !editingOccurrenceId && (
            <Button onClick={startAddingNew} style={{ backgroundColor: '#ff6900', color: 'white' }} className="hover:bg-orange-600">
              <Plus className="size-4 mr-2" />
              Add New Theme
            </Button>
          )}
        </div>

        {/* New Theme Form - Inline Split Screen */}
        {isAddingNew && (
          <Card className="mb-6 border-2 border-[#ff6900] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 p-6 bg-white">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Create New Theme</h3>
                <p className="text-sm text-slate-600 mt-1">Fill out the form to add a new feedback theme</p>
              </div>
              <Button variant="ghost" size="sm" onClick={cancelAddingNew}>
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex">
              {/* Left Panel - Form */}
              <div className="flex-1 p-6 border-r border-slate-200 bg-white">
                {renderThemeForm(newOccurrence, true)}
              </div>

              {/* Right Panel - Live Preview */}
              <div className="w-[400px] bg-slate-50 p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Eye className="size-5 text-slate-600" />
                      <h3 className="text-base font-semibold text-slate-900">Live Preview</h3>
                    </div>

                    {/* Theme Preview Card */}
                    <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
                      {/* Title and Badges */}
                      <div className="space-y-2">
                        <div className="font-semibold text-base text-slate-900">
                          {newOccurrence.themeName || <span className="text-slate-400 italic">Theme Title</span>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`text-xs px-2 py-1 rounded font-medium ${
                            newOccurrence.type === 'positive' ? 'bg-green-100 text-green-800' :
                            newOccurrence.type === 'negative' ? 'bg-red-100 text-red-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {newOccurrence.type === 'positive' ? 'Positive' : newOccurrence.type === 'negative' ? 'Pain Point' : 'Neutral'}
                          </span>
                          {getStatusBadge(newOccurrence.status, newOccurrence.type) && (
                            <span className={`text-xs px-2 py-1 rounded font-medium ${getStatusBadge(newOccurrence.status, newOccurrence.type)?.bgColor} ${getStatusBadge(newOccurrence.status, newOccurrence.type)?.color}`}>
                              {getStatusBadge(newOccurrence.status, newOccurrence.type)?.label}
                            </span>
                          )}
                          {newOccurrence.monthsActive !== undefined && newOccurrence.monthsActive > 0 && (
                            <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">
                              {getDisplayPersistenceLabel(newOccurrence)}
                            </span>
                          )}
                          {newOccurrence.trendDirection && newOccurrence.trendDirection !== 'stable' && (
                            <span className={`text-xs px-2 py-1 rounded font-medium ${
                              newOccurrence.trendDirection === 'increasing' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {newOccurrence.trendDirection === 'increasing' ? '↑' : '↓'} {Math.abs(newOccurrence.trendPercentage || 0)}%
                            </span>
                          )}
                          {newOccurrence.isNew && (
                            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                              New this period
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Context Metadata */}
                      <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        {newOccurrence.appName && (
                          <div><strong>App:</strong> {newOccurrence.appName}</div>
                        )}
                        {newOccurrence.journeyName && (
                          <div><strong>Journey:</strong> {newOccurrence.journeyName}</div>
                        )}
                        <div><strong>Period:</strong> {newOccurrence.timePeriod || 'November 2025'}</div>
                        <div>
                          <strong>Percentage:</strong>{' '}
                          {newOccurrence.percentage == null ? 'Not provided' : `${newOccurrence.percentage}% of feedback`}
                        </div>
                      </div>

                      {/* Summary Points */}
                      {newOccurrence.descriptionBullets && newOccurrence.descriptionBullets.length > 0 && newOccurrence.descriptionBullets.some(b => b.trim()) && (
                        <div className="pt-3 border-t border-slate-100">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Summary Points</div>
                          <ul className="space-y-1.5 text-sm text-slate-700">
                            {newOccurrence.descriptionBullets.filter(b => b.trim()).map((bullet, idx) => (
                              <li key={idx} className="flex gap-2">
                                <span className="text-slate-400 shrink-0">•</span>
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Example Comments */}
                      {newOccurrence.exampleComments && newOccurrence.exampleComments.length > 0 && newOccurrence.exampleComments.some(c => c.trim()) && (
                        <div className="pt-3 border-t border-slate-100">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Example Comments</div>
                          <div className="space-y-2">
                            {newOccurrence.exampleComments.filter(c => c.trim()).map((comment, idx) => (
                              <div key={idx} className="bg-slate-50 rounded p-2 text-xs text-slate-600 italic border-l-2 border-slate-300">
                                "{comment}"
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Empty State */}
                      {!newOccurrence.themeName && (!newOccurrence.descriptionBullets || newOccurrence.descriptionBullets.length === 0) && (
                        <div className="text-center py-6 text-sm text-slate-400">
                          Fill out the form to see a preview
                        </div>
                      )}
                    </div>
                  </div>
                </div>
            </div>

            {/* Actions - Bottom Bar */}
            <div className="flex flex-wrap gap-2 justify-end border-t border-slate-200 p-6 bg-white">
              <Button variant="outline" onClick={cancelAddingNew}>
                Cancel
              </Button>
              <Button 
                variant="outline"
                onClick={() => saveNewOccurrence(true)}
                disabled={isSaving}
              >
                Save & Add Another
              </Button>
              <Button 
                onClick={() => saveNewOccurrence(false)}
                disabled={isSaving}
                style={{ backgroundColor: '#ff6900', color: 'white' }}
                className="hover:bg-orange-600"
              >
                <Save className="size-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Theme'}
              </Button>
            </div>
          </Card>
        )}

        {/* Filters */}
        <Card className="p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search themes..."
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Select value={filterApp} onValueChange={setFilterApp}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Apps</SelectItem>
                    {appOptions.map(app => (
                      <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="unresolved">Unresolved</SelectItem>
                    <SelectItem value="improving">Improving</SelectItem>
                    <SelectItem value="stabilized">Stabilized</SelectItem>
                    <SelectItem value="resolved-monitoring">Resolved - Monitoring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-700">Group by</span>
                <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1">
                  <Button
                    size="sm"
                    variant={groupBy === 'theme+app' ? 'default' : 'ghost'}
                    className={groupBy === 'theme+app' ? 'bg-orange-600 text-white hover:bg-orange-700' : 'text-slate-600'}
                    onClick={() => setGroupBy('theme+app')}
                  >
                    Theme + App
                  </Button>
                  <Button
                    size="sm"
                    variant={groupBy === 'theme' ? 'default' : 'ghost'}
                    className={groupBy === 'theme' ? 'bg-orange-600 text-white hover:bg-orange-700' : 'text-slate-600'}
                    onClick={() => setGroupBy('theme')}
                  >
                    Theme
                  </Button>
                  <Button
                    size="sm"
                    variant={groupBy === 'app' ? 'default' : 'ghost'}
                    className={groupBy === 'app' ? 'bg-orange-600 text-white hover:bg-orange-700' : 'text-slate-600'}
                    onClick={() => setGroupBy('app')}
                  >
                    App
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-700">Sort by</span>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                  <SelectTrigger className="h-8 w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="theme">Theme name (A–Z)</SelectItem>
                    <SelectItem value="group-count">Group count (High–Low)</SelectItem>
                    <SelectItem value="app">App name (A–Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
        </Card>

        {/* Themes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pagedStacks.map(([stackKey, stackOccurrences]) => {
                const isMultiMonth = stackOccurrences.length > 1;
                const topOccurrence = stackOccurrences[0];
                const isExpanded = expandedStacks.has(stackKey);
                const uniqueAppsCount = new Set(stackOccurrences.map(occ => occ.appId)).size;
                const uniqueThemesCount = new Set(stackOccurrences.map(occ => occ.themeId)).size;
                const uniqueMonthsCount = new Set(stackOccurrences.map(occ => occ.timePeriod)).size;
                
                if (isMultiMonth && !isExpanded) {
                  // Render stacked card with full content
                  return (
                    <div key={stackKey} className="relative pb-3">
                      {/* Stack shadow layers - peek from behind like a deck */}
                      <div className="absolute inset-x-1 -bottom-1 h-full bg-white border border-slate-300 rounded-lg shadow-sm -z-10" />
                      <div className="absolute inset-x-2 -bottom-2 h-full bg-white border border-slate-200 rounded-lg shadow-sm -z-20" />
                      
                      {/* Top card */}
                      <Card 
                        className="relative p-4 hover:shadow-lg transition-all cursor-pointer border-2 border-slate-400"
                        onClick={() => toggleStack(stackKey)}
                      >
                        {/* Stack badge */}
                        <div className="absolute top-3 right-3 flex gap-2">
                          <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800 font-semibold border border-orange-300">
                            {groupBy === 'theme+app' && `${uniqueMonthsCount} months`}
                            {groupBy === 'theme' && `${uniqueAppsCount} apps · ${uniqueMonthsCount} months`}
                            {groupBy === 'app' && `${uniqueThemesCount} themes · ${uniqueMonthsCount} months`}
                          </span>
                        </div>
                        
                        {/* Theme Card Content - Full height */}
                        <div className="space-y-4 pr-20">
                          {/* Title and Badges */}
                          <div className="space-y-2">
                            <div className="font-semibold text-base text-slate-900">
                              {topOccurrence.themeName}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className={`text-xs px-2 py-1 rounded font-medium ${
                                topOccurrence.type === 'positive' ? 'bg-green-100 text-green-800' :
                                topOccurrence.type === 'negative' ? 'bg-red-100 text-red-800' :
                                'bg-slate-100 text-slate-800'
                              }`}>
                                {topOccurrence.type === 'positive' ? 'Positive' : topOccurrence.type === 'negative' ? 'Pain Point' : 'Neutral'}
                              </span>
                              {getStatusBadge(topOccurrence.status, topOccurrence.type) && (
                                <span className={`text-xs px-2 py-1 rounded font-medium ${getStatusBadge(topOccurrence.status, topOccurrence.type)?.bgColor} ${getStatusBadge(topOccurrence.status, topOccurrence.type)?.color}`}>
                                  {getStatusBadge(topOccurrence.status, topOccurrence.type)?.label}
                                </span>
                              )}
                              {topOccurrence.monthsActive !== undefined && topOccurrence.monthsActive > 0 && (
                                <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">
                                  {getDisplayPersistenceLabel(topOccurrence)}
                                </span>
                              )}
                              {topOccurrence.trendDirection && topOccurrence.trendDirection !== 'stable' && (
                                <span className={`text-xs px-2 py-1 rounded font-medium ${
                                  topOccurrence.trendDirection === 'increasing' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                }`}>
                                  {topOccurrence.trendDirection === 'increasing' ? '↑' : '↓'} {Math.abs(topOccurrence.trendPercentage || 0)}%
                                </span>
                              )}
                              {topOccurrence.isNew && (
                                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                                  New this period
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Context Metadata */}
                          <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                            {groupBy === 'theme' && (
                              <div><strong>Apps:</strong> {uniqueAppsCount}</div>
                            )}
                            {groupBy === 'app' && (
                              <div><strong>Themes:</strong> {uniqueThemesCount}</div>
                            )}
                            {groupBy !== 'theme' && topOccurrence.appName && (
                              <div><strong>App:</strong> {topOccurrence.appName}</div>
                            )}
                            {groupBy !== 'theme' && topOccurrence.journeyName && (
                              <div><strong>Journey:</strong> {topOccurrence.journeyName}</div>
                            )}
                            <div><strong>Period:</strong> {topOccurrence.timePeriod}</div>
                            <div><strong>Percentage:</strong> {topOccurrence.percentage}% of feedback</div>
                          </div>

                          {/* Summary Points */}
                          {topOccurrence.descriptionBullets && topOccurrence.descriptionBullets.length > 0 && topOccurrence.descriptionBullets.some(b => b.trim()) && (
                            <div className="pt-3 border-t border-slate-100">
                              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Summary Points</div>
                              <ul className="space-y-1.5 text-sm text-slate-700">
                                {topOccurrence.descriptionBullets.filter(b => b.trim()).map((bullet, idx) => (
                                  <li key={idx} className="flex gap-2">
                                    <span className="text-slate-400 shrink-0">•</span>
                                    <span>{bullet}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Example Comments */}
                          {topOccurrence.exampleComments && topOccurrence.exampleComments.length > 0 && topOccurrence.exampleComments.some(c => c.trim()) && (
                            <div className="pt-3 border-t border-slate-100">
                              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Example Comments</div>
                              <div className="space-y-2">
                                {topOccurrence.exampleComments.filter(c => c.trim()).map((comment, idx) => (
                                  <div key={idx} className="bg-slate-50 rounded p-2 text-xs text-slate-600 italic border-l-2 border-slate-300">
                                    "{comment}"
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Expand hint */}
                          <div className="pt-3 border-t border-slate-100 text-xs text-orange-600 font-medium flex items-center gap-1">
                            <span>
                              Click to expand
                              {groupBy === 'theme+app' && ` ${uniqueMonthsCount} months`}
                              {groupBy === 'theme' && ` ${uniqueAppsCount} apps / ${uniqueMonthsCount} months`}
                              {groupBy === 'app' && ` ${uniqueThemesCount} themes / ${uniqueMonthsCount} months`}
                            </span>
                            <ChevronDown className="size-3" />
                          </div>
                        </div>
                      </Card>
                    </div>
                  );
                } else if (isMultiMonth && isExpanded) {
                  // Render expanded fan of cards
                  return (
                    <div key={stackKey} className="col-span-full space-y-3">
                      {/* Collapse header */}
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toggleStack(stackKey)}
                          className="flex items-center gap-2"
                        >
                          <ChevronUp className="size-4" />
                          Collapse Stack
                        </Button>
                        <span className="text-sm text-slate-600">
                          {groupBy === 'theme+app' && (
                            <> <strong>{topOccurrence.themeName}</strong> in <strong>{topOccurrence.appName}</strong> across {uniqueMonthsCount} months</>
                          )}
                          {groupBy === 'theme' && (
                            <> <strong>{topOccurrence.themeName}</strong> across {uniqueAppsCount} apps and {uniqueMonthsCount} months</>
                          )}
                          {groupBy === 'app' && (
                            <> <strong>{topOccurrence.appName}</strong> across {uniqueThemesCount} themes and {uniqueMonthsCount} months</>
                          )}
                        </span>
                      </div>
                      
                      {/* Fanned out cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stackOccurrences.map((occurrence) => (
                          <Card key={occurrence.id} className="p-4 hover:shadow-md transition-shadow relative border-orange-200 border-2">
                            {/* Edit Button - Top Right */}
                            <div className="absolute top-3 right-3">
                              <Button variant="outline" size="sm" onClick={() => startEditing(occurrence)}>
                                <Edit2 className="size-4" />
                              </Button>
                            </div>

                            {/* Theme Card Content */}
                            <div className="space-y-4 pr-12">
                              {/* Title and Badges */}
                              <div className="space-y-2">
                                <div className="font-semibold text-base text-slate-900">
                                  {occurrence.themeName}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                                    occurrence.type === 'positive' ? 'bg-green-100 text-green-800' :
                                    occurrence.type === 'negative' ? 'bg-red-100 text-red-800' :
                                    'bg-slate-100 text-slate-800'
                                  }`}>
                                    {occurrence.type === 'positive' ? 'Positive' : occurrence.type === 'negative' ? 'Pain Point' : 'Neutral'}
                                  </span>
                                  {getStatusBadge(occurrence.status, occurrence.type) && (
                                    <span className={`text-xs px-2 py-1 rounded font-medium ${getStatusBadge(occurrence.status, occurrence.type)?.bgColor} ${getStatusBadge(occurrence.status, occurrence.type)?.color}`}>
                                      {getStatusBadge(occurrence.status, occurrence.type)?.label}
                                    </span>
                                  )}
                                  {occurrence.monthsActive !== undefined && occurrence.monthsActive > 0 && (
                                    <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">
                                      {getDisplayPersistenceLabel(occurrence)}
                                    </span>
                                  )}
                                  {occurrence.trendDirection && occurrence.trendDirection !== 'stable' && (
                                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                                      occurrence.trendDirection === 'increasing' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                    }`}>
                                      {occurrence.trendDirection === 'increasing' ? '↑' : '↓'} {Math.abs(occurrence.trendPercentage || 0)}%
                                    </span>
                                  )}
                                  {occurrence.isNew && (
                                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                                      New this period
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Context Metadata */}
                              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                                {occurrence.appName && (
                                  <div><strong>App:</strong> {occurrence.appName}</div>
                                )}
                                {occurrence.journeyName && (
                                  <div><strong>Journey:</strong> {occurrence.journeyName}</div>
                                )}
                                <div><strong>Period:</strong> {occurrence.timePeriod}</div>
                                <div><strong>Percentage:</strong> {occurrence.percentage}% of feedback</div>
                              </div>

                              {/* Summary Points */}
                              {occurrence.descriptionBullets && occurrence.descriptionBullets.length > 0 && occurrence.descriptionBullets.some(b => b.trim()) && (
                                <div className="pt-3 border-t border-slate-100">
                                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Summary Points</div>
                                  <ul className="space-y-1.5 text-sm text-slate-700">
                                    {occurrence.descriptionBullets.filter(b => b.trim()).map((bullet, idx) => (
                                      <li key={idx} className="flex gap-2">
                                        <span className="text-slate-400 shrink-0">•</span>
                                        <span>{bullet}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Example Comments */}
                              {occurrence.exampleComments && occurrence.exampleComments.length > 0 && occurrence.exampleComments.some(c => c.trim()) && (
                                <div className="pt-3 border-t border-slate-100">
                                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Example Comments</div>
                                  <div className="space-y-2">
                                    {occurrence.exampleComments.filter(c => c.trim()).map((comment, idx) => (
                                      <div key={idx} className="bg-slate-50 rounded p-2 text-xs text-slate-600 italic border-l-2 border-slate-300">
                                        "{comment}"
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                } else {
                  // Render single card (no stacking)
                  const occurrence = topOccurrence;
                  return (
              <Card key={occurrence.id} className="p-4 hover:shadow-md transition-shadow relative">
                {/* Edit Button - Top Right */}
                <div className="absolute top-3 right-3">
                  <Button variant="outline" size="sm" onClick={() => startEditing(occurrence)}>
                    <Edit2 className="size-4" />
                  </Button>
                </div>

                {/* Theme Card Content */}
                <div className="space-y-4 pr-12">
                  {/* Title and Badges */}
                  <div className="space-y-2">
                    <div className="font-semibold text-base text-slate-900">
                      {occurrence.themeName}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        occurrence.type === 'positive' ? 'bg-green-100 text-green-800' :
                        occurrence.type === 'negative' ? 'bg-red-100 text-red-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {occurrence.type === 'positive' ? 'Positive' : occurrence.type === 'negative' ? 'Pain Point' : 'Neutral'}
                      </span>
                      {getStatusBadge(occurrence.status, occurrence.type) && (
                        <span className={`text-xs px-2 py-1 rounded font-medium ${getStatusBadge(occurrence.status, occurrence.type)?.bgColor} ${getStatusBadge(occurrence.status, occurrence.type)?.color}`}>
                          {getStatusBadge(occurrence.status, occurrence.type)?.label}
                        </span>
                      )}
                      {occurrence.monthsActive !== undefined && occurrence.monthsActive > 0 && (
                        <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">
                          {getDisplayPersistenceLabel(occurrence)}
                        </span>
                      )}
                      {occurrence.trendDirection && occurrence.trendDirection !== 'stable' && (
                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                          occurrence.trendDirection === 'increasing' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {occurrence.trendDirection === 'increasing' ? '↑' : '↓'} {Math.abs(occurrence.trendPercentage || 0)}%
                        </span>
                      )}
                      {occurrence.isNew && (
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                          New this period
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Context Metadata */}
                  <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    {groupBy === 'theme' && (
                      <div><strong>Apps:</strong> {uniqueAppsCount}</div>
                    )}
                    {groupBy === 'app' && (
                      <div><strong>Themes:</strong> {uniqueThemesCount}</div>
                    )}
                    {groupBy !== 'theme' && occurrence.appName && (
                      <div><strong>App:</strong> {occurrence.appName}</div>
                    )}
                    {groupBy !== 'theme' && occurrence.journeyName && (
                      <div><strong>Journey:</strong> {occurrence.journeyName}</div>
                    )}
                    <div><strong>Period:</strong> {occurrence.timePeriod}</div>
                    <div><strong>Percentage:</strong> {occurrence.percentage}% of feedback</div>
                  </div>

                  {/* Summary Points */}
                  {occurrence.descriptionBullets && occurrence.descriptionBullets.length > 0 && occurrence.descriptionBullets.some(b => b.trim()) && (
                    <div className="pt-3 border-t border-slate-100">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Summary Points</div>
                      <ul className="space-y-1.5 text-sm text-slate-700">
                        {occurrence.descriptionBullets.filter(b => b.trim()).map((bullet, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="text-slate-400 shrink-0">•</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Example Comments */}
                  {occurrence.exampleComments && occurrence.exampleComments.length > 0 && occurrence.exampleComments.some(c => c.trim()) && (
                    <div className="pt-3 border-t border-slate-100">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Example Comments</div>
                      <div className="space-y-2">
                        {occurrence.exampleComments.filter(c => c.trim()).map((comment, idx) => (
                          <div key={idx} className="bg-slate-50 rounded p-2 text-xs text-slate-600 italic border-l-2 border-slate-300">
                            "{comment}"
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          }
        })}

            {stacks.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-500">
                No themes found. Try adjusting your filters or create a new theme.
              </div>
            )}
        </div>

        {stacks.length > 25 && (
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-slate-600">
              Showing {startIndex}-{endIndex} of {stacks.length} themes
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Per page</span>
                <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="h-8 w-[92px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage <= 1}
                >
                  Prev
                </Button>
                <div className="text-sm text-slate-600">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Theme Modal */}
        {editingOccurrenceId && editingOccurrence && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 p-6 bg-white">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Edit Theme: {editingOccurrence.themeName}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Editing: {editingOccurrence.appName} • {editingOccurrence.timePeriod}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={cancelEditing}>
                  <X className="size-4" />
                </Button>
              </div>

              {/* Related Occurrences Panel - Collapsible */}
              {(() => {
                const relatedOccurrences = getRelatedOccurrences();
                const allRelated = occurrences.filter(occ => 
                  occ.themeId === editingOccurrence.themeId && occ.id !== editingOccurrence.id
                );
                const { shared, unique } = analyzeSummaryPoints();
                
                return allRelated.length > 0 && (
                  <div className="border-b border-slate-200 bg-slate-50">
                    <button
                      onClick={() => setShowRelatedOccurrences(!showRelatedOccurrences)}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <GitBranch className="size-4 text-slate-600" />
                        <span className="text-sm font-medium text-slate-900">
                          Related Occurrences ({allRelated.length} other app+month combination{allRelated.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                      {showRelatedOccurrences ? (
                        <ChevronUp className="size-4 text-slate-600" />
                      ) : (
                        <ChevronDown className="size-4 text-slate-600" />
                      )}
                    </button>
                    
                    {showRelatedOccurrences && (
                      <div className="p-4 pt-0 space-y-4">
                        {/* Context Message */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
                          <div className="font-semibold mb-1">This theme appears across multiple apps/months:</div>
                          <div className="space-y-1">
                            <div>• <strong>Shared summary points:</strong> {shared.length} point{shared.length !== 1 ? 's' : ''} appear in other occurrences</div>
                            <div>• <strong>Unique summary points:</strong> {unique.length} point{unique.length !== 1 ? 's' : ''} only in this app+month</div>
                          </div>
                        </div>

                        {/* Filters */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-slate-600 mb-1">Filter by App</Label>
                            <Select value={relatedOccurrencesFilterApp} onValueChange={handleRelatedAppFilterChange}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Apps ({allRelated.length})</SelectItem>
                                {Array.from(new Set(allRelated.map(occ => occ.appId))).map(appId => {
                                  const app = appOptions.find(a => a.id === appId);
                                  const count = allRelated.filter(occ => occ.appId === appId).length;
                                  return (
                                    <SelectItem key={appId} value={appId}>
                                      {app?.name} ({count})
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs text-slate-600 mb-1">Filter by Month</Label>
                            <Select value={relatedOccurrencesFilterMonth} onValueChange={handleRelatedMonthFilterChange}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Months ({allRelated.length})</SelectItem>
                                {Array.from(new Set(allRelated.map(occ => occ.timePeriod))).map(period => {
                                  const count = allRelated.filter(occ => occ.timePeriod === period).length;
                                  return (
                                    <SelectItem key={period} value={period}>
                                      {period} ({count})
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Related Occurrences List */}
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {relatedOccurrences.length === 0 && (
                            <div className="text-xs text-slate-500 text-center py-4">
                              No matching occurrences with current filters
                            </div>
                          )}
                          {relatedOccurrences.map(occ => (
                            <div 
                              key={occ.id} 
                              className="bg-white rounded border border-slate-200 p-3 text-xs cursor-pointer hover:border-orange-500 hover:shadow-sm transition-all"
                              onClick={() => startEditing(occ)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <div className="font-medium text-slate-900">{occ.appName}</div>
                                  <div className="text-slate-500">{occ.timePeriod} • {occ.percentage}% of feedback</div>
                                </div>
                                {getStatusBadge(occ.status, occ.type) && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getStatusBadge(occ.status, occ.type)?.bgColor} ${getStatusBadge(occ.status, occ.type)?.color}`}>
                                    {getStatusBadge(occ.status, occ.type)?.label}
                                  </span>
                                )}
                              </div>
                              {occ.descriptionBullets && occ.descriptionBullets.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  <div className="text-slate-600 font-medium">Summary Points:</div>
                                  {occ.descriptionBullets.map((bullet, idx) => {
                                    const isShared = editingOccurrence.descriptionBullets?.some(
                                      b => b.toLowerCase() === bullet.toLowerCase()
                                    );
                                    return (
                                      <div key={idx} className="flex gap-1.5">
                                        <span className="text-slate-400 shrink-0">•</span>
                                        <span className={isShared ? 'text-blue-700 font-medium' : 'text-slate-600'}>
                                          {bullet}
                                          {isShared && <span className="ml-1 text-blue-500">(shared)</span>}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex flex-1 overflow-hidden">
                {/* Left Panel - Form */}
                <div className="flex-1 p-6 border-r border-slate-200 bg-white overflow-y-auto">
                  {renderThemeForm(editingOccurrence!, false)}
                </div>

                {/* Right Panel - Live Preview */}
                <div className="w-[350px] bg-slate-50 p-6 overflow-y-auto">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Eye className="size-4 text-slate-600" />
                      <h3 className="text-sm font-semibold text-slate-900">Live Preview</h3>
                    </div>

                    {/* Theme Preview Card - Reusing same structure */}
                    <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
                      {/* Title and Badges */}
                      <div className="space-y-2">
                        <div className="font-semibold text-base text-slate-900">
                          {editingOccurrence?.themeName && editingOccurrence.themeName.trim() !== '' ? editingOccurrence.themeName : <span className="text-slate-400 italic">Theme Title</span>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`text-xs px-2 py-1 rounded font-medium ${
                            editingOccurrence?.type === 'positive' ? 'bg-green-100 text-green-800' :
                            editingOccurrence?.type === 'negative' ? 'bg-red-100 text-red-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {editingOccurrence?.type === 'positive' ? 'Positive' : editingOccurrence?.type === 'negative' ? 'Pain Point' : 'Neutral'}
                          </span>
                          {editingOccurrence?.status && (
                            <span className={`text-xs px-2 py-1 rounded font-medium ${getStatusBadge(editingOccurrence.status, editingOccurrence.type)?.bgColor} ${getStatusBadge(editingOccurrence.status, editingOccurrence.type)?.color}`}>
                              {getStatusBadge(editingOccurrence.status, editingOccurrence.type)?.label}
                            </span>
                          )}
                          {editingOccurrence?.monthsActive !== undefined && editingOccurrence.monthsActive > 0 && (
                            <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">
                              {getDisplayPersistenceLabel(editingOccurrence)}
                            </span>
                          )}
                          {editingOccurrence?.trendDirection && editingOccurrence.trendDirection !== 'stable' && (
                            <span className={`text-xs px-2 py-1 rounded font-medium ${
                              editingOccurrence.trendDirection === 'increasing' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {editingOccurrence.trendDirection === 'increasing' ? '↑' : '↓'} {Math.abs(editingOccurrence.trendPercentage || 0)}%
                            </span>
                          )}
                          {editingOccurrence?.isNew && (
                            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                              New this period
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Context Metadata */}
                      <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        {editingOccurrence?.appName && (
                          <div><strong>App:</strong> {editingOccurrence.appName}</div>
                        )}
                        {editingOccurrence?.journeyName && (
                          <div><strong>Journey:</strong> {editingOccurrence.journeyName}</div>
                        )}
                        <div><strong>Period:</strong> {editingOccurrence?.timePeriod || 'November 2025'}</div>
                        <div>
                          <strong>Percentage:</strong>{' '}
                          {editingOccurrence?.percentage == null ? 'Not provided' : `${editingOccurrence.percentage}% of feedback`}
                        </div>
                      </div>

                      {/* Summary Points */}
                      {editingOccurrence?.descriptionBullets && editingOccurrence.descriptionBullets.length > 0 && editingOccurrence.descriptionBullets.some(b => b.trim()) && (
                        <div className="pt-3 border-t border-slate-100">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Summary Points</div>
                          <ul className="space-y-1.5 text-sm text-slate-700">
                            {editingOccurrence.descriptionBullets.filter(b => b.trim()).map((bullet, idx) => (
                              <li key={idx} className="flex gap-2">
                                <span className="text-slate-400 shrink-0">•</span>
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Example Comments */}
                      {editingOccurrence?.exampleComments && editingOccurrence.exampleComments.length > 0 && editingOccurrence.exampleComments.some(c => c.trim()) && (
                        <div className="pt-3 border-t border-slate-100">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Example Comments</div>
                          <div className="space-y-2">
                            {editingOccurrence.exampleComments.filter(c => c.trim()).map((comment, idx) => (
                              <div key={idx} className="bg-slate-50 rounded p-2 text-xs text-slate-600 italic border-l-2 border-slate-300">
                                "{comment}"
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions - Bottom Bar */}
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-6 bg-white">
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={deleteOccurrence}
                >
                  <Trash2 className="size-4 mr-2" />
                  Delete
                </Button>
                <div className="flex gap-2">
                <Button variant="outline" onClick={cancelEditing}>
                  Cancel
                </Button>
                <Button 
                  onClick={saveOccurrence}
                  disabled={isSaving || !editingOccurrence?.themeName || editingOccurrence.themeName.trim() === ''}
                  style={{ backgroundColor: '#ff6900' }}
                  className="text-white hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
