import React, { useEffect, useMemo, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AdminTabNav } from './AdminTabNav';
import { Switch } from './ui/switch';
import { supabase } from '../lib/supabaseClient';
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Edit2,
  Eye,
  EyeOff,
  Link2,
  Plus,
  Save,
  Search,
  Tags,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';

interface ManageTopPainsProps {
  onNavigateBack: () => void;
  onNavigateHome: () => void;
  onNavigateAllApps: () => void;
  onNavigateKeyJourneys: () => void;
  onNavigateTopPains: () => void;
  onTabChange: (tab: 'manage-themes' | 'manage-top-pains' | 'manage-journeys' | 'manage-apps' | 'feature-flags' | 'settings') => void;
}

type NormalizedTheme = {
  id: string;
  key: string;
  title: string;
  severity: string | null;
  description: string | null;
  status: string | null;
  keywords: string[] | null;
  category?: string | null;
  is_active?: boolean | null;
};

type ThemeRow = {
  id: string;
  title: string;
};

type ThemeMapping = {
  theme_id: string;
  normalized_theme_id: string;
  source: string | null;
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
  narrative: string | null;
  bullets: string[] | null;
  trend_direction?: string | null;
  trend_percentage?: number | null;
};

type AppThemeMapping = {
  id: string;
  app_id: string;
  app_name: string;
  theme_key: string;
  theme_title: string;
  time_period: string;
  percentage: number;
  mention_count: number | null;
  severity: 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
  narratives: string[];
  example_comment?: string;
  mentions_estimated?: boolean;
  status?: string;
  months_active?: number;
  trend_direction?: 'increasing' | 'decreasing' | 'stable';
  trend_percentage?: number;
};

type TopPainGrouping = {
  theme_key: string;
  canonical_title: string;
  description: string;
  category: string;
  keywords: string[];
  total_mentions: number;
  has_mentions_data: boolean;
  avg_percentage: number;
  affected_apps: string[];
  app_mappings: AppThemeMapping[];
  high_severity_count: number;
  medium_severity_count: number;
  low_severity_count: number;
  predominant_severity: 'high' | 'medium' | 'low';
  avg_months_active: number;
  predominant_trend: 'increasing' | 'decreasing' | 'stable';
  is_active: boolean;
  confidence_issues: boolean;
  needs_review: boolean;
  rank: number;
  impact_score: number;
};

export function ManageTopPains({
  onNavigateBack,
  onNavigateHome,
  onNavigateAllApps,
  onNavigateKeyJourneys,
  onNavigateTopPains,
  onTabChange,
}: ManageTopPainsProps) {
  const [normalizedThemes, setNormalizedThemes] = useState<NormalizedTheme[]>([]);
  const [themeOptions, setThemeOptions] = useState<ThemeRow[]>([]);
  const [mappings, setMappings] = useState<ThemeMapping[]>([]);
  const [observations, setObservations] = useState<ObservationRow[]>([]);
  const [latestPeriodLabel, setLatestPeriodLabel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set());
  const [editingTheme, setEditingTheme] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<NormalizedTheme>>({});
  const [showInactive, setShowInactive] = useState(false);
  const [showRankingInfo, setShowRankingInfo] = useState(false);
  const [addingThemeToGroup, setAddingThemeToGroup] = useState<string | null>(null);
  const [appThemeSearchQuery, setAppThemeSearchQuery] = useState('');
  const [isAutoGrouping, setIsAutoGrouping] = useState(false);
  const [autoGroupSummary, setAutoGroupSummary] = useState('');
  const [onlyUnmapped, setOnlyUnmapped] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    const [
      { data: normalizedRows },
      { data: themeRows },
      { data: mappingRows },
      { data: observationRows },
    ] =
      await Promise.all([
        supabase.from('normalized_themes').select('*').order('title', { ascending: true }),
        supabase.from('themes').select('id,title').order('title', { ascending: true }),
        supabase.from('theme_mappings').select('*'),
        supabase
          .from('v_pain_observations_enriched')
          .select(
            'period,period_label,sort_order,theme_id,theme_title,theme_type,app_id,app_name,severity,status,months_active,mentions_count,mentions_estimated,percent_of_feedback,narrative,bullets,trend_direction,trend_percentage',
          )
          .order('sort_order', { ascending: false })
          .limit(2000),
      ]);

    setNormalizedThemes((normalizedRows as NormalizedTheme[]) ?? []);
    setThemeOptions((themeRows as ThemeRow[]) ?? []);
    setMappings((mappingRows as ThemeMapping[]) ?? []);
    const cleanedObservations = (observationRows as ObservationRow[]) ?? [];
    if (cleanedObservations.length > 0) {
      const latestLabel = cleanedObservations[0].period_label ?? cleanedObservations[0].period;
      const negativeObservations = cleanedObservations.filter((row) => row.theme_type === 'negative');
      const latestObservations = negativeObservations.filter(
        (row) => (row.period_label ?? row.period) === latestLabel,
      );

      if (latestObservations.length > 0) {
        setLatestPeriodLabel(latestLabel ?? null);
        setObservations(latestObservations);
      } else {
        setLatestPeriodLabel('All periods');
        setObservations(negativeObservations);
      }
    } else {
      setLatestPeriodLabel(null);
      setObservations([]);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const startEditing = (group: TopPainGrouping) => {
    setEditingTheme(group.theme_key);
    setEditForm({
      id: normalizedThemes.find((theme) => theme.key === group.theme_key)?.id ?? '',
      key: group.theme_key,
      title: group.canonical_title,
      description: group.description,
      keywords: group.keywords,
      category: group.category,
      is_active: group.is_active,
    });
  };

  const startCreating = () => {
    setEditingTheme('__new__');
    setEditForm({
      key: '',
      title: '',
      description: '',
      keywords: [],
      category: 'functionality',
      is_active: true,
    });
  };

  const cancelEditing = () => {
    setEditingTheme(null);
    setEditForm({});
  };

  const saveTheme = async () => {
    if (!editForm.key?.trim() || !editForm.title?.trim()) {
      setError('Key and title are required.');
      return;
    }
    setIsSaving(true);
    setError('');
    const id = editForm.id || editForm.key.trim();
    const { error: saveError } = await supabase.from('normalized_themes').upsert({
      id,
      key: editForm.key.trim(),
      title: editForm.title.trim(),
      description: editForm.description || null,
      keywords: editForm.keywords?.length ? editForm.keywords : null,
      category: editForm.category || null,
      is_active: editForm.is_active ?? true,
    });

    if (saveError) {
      setError(saveError.message);
    } else {
      await loadData();
      setEditingTheme(null);
      setEditForm({});
    }
    setIsSaving(false);
  };

  const startAddingTheme = (themeKey: string) => {
    setAddingThemeToGroup(themeKey);
    setAppThemeSearchQuery('');
  };

  const cancelAddingTheme = () => {
    setAddingThemeToGroup(null);
    setAppThemeSearchQuery('');
  };

  const addAppThemeToGroup = async (themeId: string, groupKey: string) => {
    const normalized = normalizedThemes.find((theme) => theme.key === groupKey);
    if (!normalized) {
      setError('Unable to find normalized theme for this group.');
      return;
    }
    const { error: mappingError } = await supabase.from('theme_mappings').upsert({
      theme_id: themeId,
      normalized_theme_id: normalized.id,
      source: 'manual',
      confidence: null,
    });
    if (mappingError) {
      setError(mappingError.message);
      return;
    }
    await loadData();
    setAddingThemeToGroup(null);
    setAppThemeSearchQuery('');
  };

  const autoGroupThemes = async () => {
    setError('');
    setAutoGroupSummary('');
    setIsAutoGrouping(true);

    await loadData();

    const excludedThemeIds = new Set([
      'positive_feedback',
      'recognition_team_accomplishments',
      'test',
      'limited_themes_based_on_46_feedback_responses',
    ]);

    const fallback = normalizedThemes.find((theme) => theme.key === 'uncategorized-needs-review');
    if (!fallback) {
      setError('Missing fallback theme: uncategorized-needs-review');
      setIsAutoGrouping(false);
      return;
    }

    const candidates = normalizedThemes.filter((theme) => theme.key !== 'uncategorized-needs-review');
    const existingMap = new Map(mappings.map((mapping) => [mapping.theme_id, mapping.normalized_theme_id]));

    const toUpsert = themeOptions
      .filter((theme) => !excludedThemeIds.has(theme.id))
      .filter((theme) => (onlyUnmapped ? !existingMap.has(theme.id) : true))
      .map((theme) => {
        const text = theme.title.toLowerCase();
        let bestTheme = fallback;
        let bestMatches = 0;
        let bestConfidence = 0;
        let ambiguousMatchCount = 0;

        for (const candidate of candidates) {
          const keywords = (candidate.keywords ?? []).map((keyword) => keyword.toLowerCase()).filter(Boolean);
          if (!keywords.length) continue;
          const matchCount = keywords.reduce((count, keyword) => (text.includes(keyword) ? count + 1 : count), 0);
          const minMatches = keywords.length <= 2 ? 1 : 2;
          const confidence = matchCount / keywords.length;

          if (matchCount >= minMatches) {
            if (
              matchCount > bestMatches ||
              (matchCount === bestMatches && confidence > bestConfidence)
            ) {
              bestTheme = candidate;
              bestMatches = matchCount;
              bestConfidence = confidence;
            }
          }
        }

        if (bestMatches === 1) {
          ambiguousMatchCount = candidates.reduce((count, candidate) => {
            const keywords = (candidate.keywords ?? []).map((keyword) => keyword.toLowerCase()).filter(Boolean);
            if (!keywords.length) return count;
            const matchCount = keywords.reduce((c, keyword) => (text.includes(keyword) ? c + 1 : c), 0);
            return matchCount === 1 ? count + 1 : count;
          }, 0);
        }

        let normalizedConfidence = 0;
        if (bestTheme.key !== 'uncategorized-needs-review') {
          if (bestMatches >= 2) {
            normalizedConfidence = 0.9;
          } else if (bestMatches === 1) {
            normalizedConfidence = ambiguousMatchCount > 1 ? 0.3 : 0.6;
          } else {
            normalizedConfidence = 0.3;
          }
        }

        return {
          theme_id: theme.id,
          normalized_theme_id: bestTheme.id,
          source: 'rule',
          confidence: Number(normalizedConfidence.toFixed(2)),
        };
      });

    if (!toUpsert.length) {
      setAutoGroupSummary('No themes to map.');
      setIsAutoGrouping(false);
      return;
    }

    const { error: upsertError } = await supabase.from('theme_mappings').upsert(toUpsert);
    if (upsertError) {
      setError(upsertError.message);
    } else {
      setAutoGroupSummary(`Mapped ${toUpsert.length} themes.`);
      await loadData();
    }

    setIsAutoGrouping(false);
  };

  const inferCategory = (key: string): string => {
    const normalized = key.toLowerCase();
    if (normalized.includes('performance') || normalized.includes('slow')) return 'performance';
    if (normalized.includes('bug') || normalized.includes('error') || normalized.includes('crash') || normalized.includes('glitch')) return 'bugs';
    if (normalized.includes('feature') || normalized.includes('request')) return 'feature-requests';
    if (normalized.includes('navigation') || normalized.includes('usability') || normalized.includes('ui')) return 'usability';
    if (normalized.includes('integration') || normalized.includes('sync') || normalized.includes('cross-system')) return 'integration';
    if (normalized.includes('workflow') || normalized.includes('process') || normalized.includes('order') || normalized.includes('returns')) return 'workflow';
    if (normalized.includes('access') || normalized.includes('permission')) return 'accessibility';
    if (normalized.includes('device') || normalized.includes('hardware') || normalized.includes('scanner')) return 'hardware';
    return 'capabilities';
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

  const toConfidenceLabel = (value: number | null, source: string | null): 'high' | 'medium' | 'low' => {
    if (value === null) return source === 'manual' ? 'medium' : 'low';
    if (value >= 0.75) return 'high';
    if (value >= 0.5) return 'medium';
    return 'low';
  };

  const topPainGroupings = useMemo<TopPainGrouping[]>(() => {
    const normalizedById = new Map(normalizedThemes.map((theme) => [theme.id, theme]));
    const mappingByThemeId = new Map(
      mappings.map((mapping) => [mapping.theme_id, mapping]),
    );

    const grouped = new Map<string, TopPainGrouping>();

    observations.forEach((row) => {
      if (!row.theme_id) return;
      const mapping = mappingByThemeId.get(row.theme_id);
      if (!mapping) return;
      const normalized = normalizedById.get(mapping.normalized_theme_id);
      if (!normalized) return;

      if (!grouped.has(normalized.key)) {
        grouped.set(normalized.key, {
          theme_key: normalized.key,
          canonical_title: normalized.title,
          description: normalized.description ?? '',
          category: normalized.category ?? inferCategory(normalized.key),
          keywords: normalized.keywords ?? [],
          total_mentions: 0,
          has_mentions_data: false,
          avg_percentage: 0,
          affected_apps: [],
          app_mappings: [],
          high_severity_count: 0,
          medium_severity_count: 0,
          low_severity_count: 0,
          predominant_severity: 'low',
          avg_months_active: 0,
          predominant_trend: 'stable',
          is_active: normalized.is_active ?? !['inactive', 'archived', 'disabled'].includes(normalized.status ?? ''),
          confidence_issues: false,
          needs_review: normalized.key === 'uncategorized-needs-review',
          rank: 0,
          impact_score: 0,
        });
      }

      const group = grouped.get(normalized.key)!;
      const severity = (row.severity ?? 'low') as 'high' | 'medium' | 'low';
      const confidence = toConfidenceLabel(mapping.confidence, mapping.source);

      const appMapping: AppThemeMapping = {
        id: `${row.theme_id}-${row.app_id ?? 'unknown'}`,
        app_id: row.app_id ?? 'unknown',
        app_name: row.app_name ?? row.app_id ?? 'Unknown',
        theme_key: normalized.key,
        theme_title: row.theme_title ?? themeOptions.find((theme) => theme.id === row.theme_id)?.title ?? 'Untitled',
        time_period: row.period_label ?? row.period ?? '',
        percentage: row.percent_of_feedback ?? 0,
        mention_count: row.mentions_count ?? null,
        severity,
        confidence,
        narratives: row.bullets?.length ? row.bullets : row.narrative ? [row.narrative] : [],
        example_comment: row.narrative ?? row.bullets?.[0],
        mentions_estimated: Boolean(row.mentions_estimated),
        status: row.status ?? undefined,
        months_active: row.months_active ?? undefined,
        trend_direction: (row.trend_direction as AppThemeMapping['trend_direction']) ?? undefined,
        trend_percentage: row.trend_percentage ?? undefined,
      };

      if (appMapping.mention_count !== null) {
        group.has_mentions_data = true;
        group.total_mentions += appMapping.mention_count;
      }
      group.app_mappings.push(appMapping);
      group.affected_apps.push(appMapping.app_name);

      if (severity === 'high') group.high_severity_count += 1;
      if (severity === 'medium') group.medium_severity_count += 1;
      if (severity === 'low') group.low_severity_count += 1;
      if (confidence === 'low') {
        group.confidence_issues = true;
        group.needs_review = true;
      }
    });

    const results: TopPainGrouping[] = [];
    normalizedThemes.forEach((theme) => {
      const existing = grouped.get(theme.key);
      if (existing) {
        results.push(existing);
      }
    });

    results.forEach((group) => {
      if (group.app_mappings.length > 0) {
        group.avg_percentage =
          group.app_mappings.reduce((sum, mapping) => sum + mapping.percentage, 0) /
          group.app_mappings.length;
        group.avg_months_active =
          group.app_mappings.reduce((sum, mapping) => sum + (mapping.months_active ?? 0), 0) /
          group.app_mappings.length;

        if (!group.has_mentions_data) {
          group.total_mentions = group.app_mappings.reduce((sum, mapping) => sum + mapping.percentage, 0);
        }
      }

      if (
        group.high_severity_count >= group.medium_severity_count &&
        group.high_severity_count >= group.low_severity_count
      ) {
        group.predominant_severity = 'high';
      } else if (group.medium_severity_count >= group.low_severity_count) {
        group.predominant_severity = 'medium';
      } else {
        group.predominant_severity = 'low';
      }

      const increasingCount = group.app_mappings.filter((mapping) => mapping.trend_direction === 'increasing').length;
      const decreasingCount = group.app_mappings.filter((mapping) => mapping.trend_direction === 'decreasing').length;
      if (
        increasingCount > decreasingCount &&
        increasingCount > group.app_mappings.length / 3
      ) {
        group.predominant_trend = 'increasing';
      } else if (
        decreasingCount > increasingCount &&
        decreasingCount > group.app_mappings.length / 3
      ) {
        group.predominant_trend = 'decreasing';
      } else {
        group.predominant_trend = 'stable';
      }

      const severityMultiplier = group.predominant_severity === 'high' ? 3 : group.predominant_severity === 'medium' ? 2 : 1;
      const trendMultiplier = group.predominant_trend === 'increasing' ? 1.2 : group.predominant_trend === 'decreasing' ? 0.8 : 1;
      const statusWeightedMentions = group.app_mappings.reduce((sum, mapping) => {
        const baseMentions =
          mapping.mention_count === null ? mapping.percentage : mapping.mention_count;
        return sum + baseMentions * getStatusMultiplier(mapping.status);
      }, 0);
      group.impact_score =
        statusWeightedMentions * severityMultiplier * trendMultiplier * Math.max(group.affected_apps.length, 1);
    });

    const activeResults = results.filter((group) => group.app_mappings.length > 0 && group.total_mentions > 0);

    activeResults.sort((a, b) => b.impact_score - a.impact_score);
    activeResults.forEach((group, index) => {
      group.rank = index + 1;
    });

    return activeResults;
  }, [normalizedThemes, mappings, observations, themeOptions]);

  const filteredGroupings = useMemo(() => {
    return topPainGroupings.filter((group) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = group.canonical_title.toLowerCase().includes(query);
        const matchesKey = group.theme_key.toLowerCase().includes(query);
        const matchesKeywords = group.keywords.some((keyword) => keyword.toLowerCase().includes(query));
        const matchesApps = group.affected_apps.some((app) => app.toLowerCase().includes(query));
        if (!matchesTitle && !matchesKey && !matchesKeywords && !matchesApps) return false;
      }

      if (categoryFilter !== 'all' && group.category !== categoryFilter) return false;
      if (severityFilter !== 'all' && group.predominant_severity !== severityFilter) return false;

      if (statusFilter === 'needs-review' && !group.needs_review) return false;
      if (statusFilter === 'high-confidence' && group.confidence_issues) return false;

      if (!showInactive && !group.is_active) return false;

      return true;
    });
  }, [topPainGroupings, searchQuery, categoryFilter, severityFilter, statusFilter, showInactive]);

  const toggleExpanded = (themeKey: string) => {
    setExpandedThemes((prev) => {
      const next = new Set(prev);
      if (next.has(themeKey)) {
        next.delete(themeKey);
      } else {
        next.add(themeKey);
      }
      return next;
    });
  };

  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    if (severity === 'high') return 'bg-red-100 text-red-800';
    if (severity === 'medium') return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-700';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      performance: 'bg-purple-100 text-purple-800',
      capabilities: 'bg-blue-100 text-blue-800',
      usability: 'bg-green-100 text-green-800',
      integration: 'bg-indigo-100 text-indigo-800',
      bugs: 'bg-red-100 text-red-800',
      workflow: 'bg-amber-100 text-amber-800',
      accessibility: 'bg-teal-100 text-teal-800',
      hardware: 'bg-slate-100 text-slate-800',
      'feature-requests': 'bg-pink-100 text-pink-800',
    };
    return colors[category] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 text-white" style={{ backgroundColor: '#ff6900' }}>
        <nav className="border-b border-orange-700">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1">
              {[
                { id: 'home', label: 'Portfolio', onClick: onNavigateHome },
                { id: 'all-apps', label: 'All Apps', onClick: onNavigateAllApps },
                { id: 'key-journeys', label: 'Key Journeys', onClick: onNavigateKeyJourneys },
                { id: 'top-pains', label: 'Top Pains', onClick: onNavigateTopPains },
              ].map((item) => (
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-semibold">Admin: Manage Top Pains</h1>
              <p className="text-white/90 mt-1 text-sm">
                Review and edit normalized theme groupings that power the Top Pains page
              </p>
              {latestPeriodLabel && (
                <p className="text-white/80 mt-1 text-xs">Showing data for {latestPeriodLabel}</p>
              )}
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

      <AdminTabNav activeTab="manage-top-pains" onTabChange={onTabChange} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 flex items-center gap-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="size-4 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-900">Manage Top Pains</h2>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700"
                  onClick={() => setShowRankingInfo((prev) => !prev)}
                >
                  {showRankingInfo ? 'Hide ranking logic' : 'Show ranking logic'}
                </Button>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Review and edit normalized theme groupings that power the Top Pains page
              </p>
              {showRankingInfo && (
                <div className="mt-2 rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  <div className="font-semibold text-slate-700">Ranking logic (impact score)</div>
                  <div>impact = mentions × status × severity × trend × affected apps</div>
                  <div>severity: high 3, medium 2, low 1</div>
                  <div>status: unresolved 1.0, improving 0.85, stabilized 0.6, resolved 0.3</div>
                  <div>trend: increasing 1.2, stable 1.0, decreasing 0.8</div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button className="gap-2" style={{ backgroundColor: '#ff6900', color: 'white' }} onClick={startCreating}>
                <Plus className="size-4" />
                Add New Theme
              </Button>
            </div>
          </div>
        </div>

        <Card className="mb-4 p-3 bg-white border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2">
              <Label htmlFor="search" className="text-sm font-medium text-slate-700 mb-1.5 block">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  id="search"
                  placeholder="Search by title, key, app, or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category" className="text-sm font-medium text-slate-700 mb-1.5 block">
                Category
              </Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="capabilities">Capabilities</SelectItem>
                  <SelectItem value="usability">Usability</SelectItem>
                  <SelectItem value="integration">Integration</SelectItem>
                  <SelectItem value="bugs">Bugs</SelectItem>
                  <SelectItem value="workflow">Workflow</SelectItem>
                  <SelectItem value="accessibility">Accessibility</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="feature-requests">Feature Requests</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="severity" className="text-sm font-medium text-slate-700 mb-1.5 block">
                Severity
              </Label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status" className="text-sm font-medium text-slate-700 mb-1.5 block">
                Status
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="needs-review">Needs Review</SelectItem>
                  <SelectItem value="high-confidence">High Confidence</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              id="show-inactive"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="size-4 rounded border-slate-300"
            />
            <Label htmlFor="show-inactive" className="text-sm text-slate-600 cursor-pointer">
              Show inactive themes
            </Label>
          </div>
        </Card>

        <Card className="mb-4 p-4 bg-white border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Auto-group themes (keywords)</div>
              <div className="text-xs text-slate-500">
                Uses normalized theme keywords. Unmatched themes fall back to uncategorized.
              </div>
            </div>
            <Button onClick={autoGroupThemes} disabled={isAutoGrouping}>
              {isAutoGrouping ? 'Working...' : 'Auto-group'}
            </Button>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={onlyUnmapped} onCheckedChange={setOnlyUnmapped} />
              <span className="text-sm text-slate-700">Only map unmapped themes</span>
            </div>
            {autoGroupSummary && <span className="text-xs text-slate-600">{autoGroupSummary}</span>}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <Card className="p-4 bg-gradient-to-br from-slate-50 to-white border-slate-200 border-l-4 border-l-slate-400 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">Total Themes</div>
                <div className="mt-1.5 text-2xl font-bold text-slate-900">{filteredGroupings.length}</div>
              </div>
              <div className="p-2 bg-slate-100 rounded-lg">
                <Tags className="size-5 text-slate-600" />
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-red-50 to-white border-red-200 border-l-4 border-l-red-500 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-xs font-medium text-red-700 uppercase tracking-wide">High Severity</div>
                <div className="mt-1.5 text-2xl font-bold text-red-700">
                  {filteredGroupings.filter((group) => group.predominant_severity === 'high').length}
                </div>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="size-5 text-red-600" />
              </div>
            </div>
          </Card>
          <Card
            className="p-4 bg-gradient-to-br from-orange-50 to-white border-orange-200 border-l-4 hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
            style={{ borderLeftColor: '#ff6900' }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-xs font-medium uppercase tracking-wide" style={{ color: '#cc5400' }}>
                  Needs Review
                </div>
                <div className="mt-1.5 text-2xl font-bold" style={{ color: '#ff6900' }}>
                  {filteredGroupings.filter((group) => group.needs_review).length}
                </div>
              </div>
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#fff3eb' }}>
                <Eye className="size-5" style={{ color: '#ff6900' }} />
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-white border-blue-200 border-l-4 border-l-blue-500 hover:shadow-md transition-all duration-200 hover:scale-[1.02]">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-xs font-medium text-blue-700 uppercase tracking-wide">Avg Apps Affected</div>
                <div className="mt-1.5 text-2xl font-bold text-blue-700">
                  {filteredGroupings.length > 0
                    ? (
                        filteredGroupings.reduce((sum, group) => sum + group.affected_apps.length, 0) /
                        filteredGroupings.length
                      ).toFixed(1)
                    : '0.0'}
                </div>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Link2 className="size-5 text-blue-600" />
              </div>
            </div>
          </Card>
        </div>

        {editingTheme === '__new__' && (
          <Card className="mb-4 p-4 border border-orange-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-slate-900">Create new normalized theme</div>
              <Button size="sm" variant="ghost" onClick={cancelEditing} className="text-slate-500">
                <X className="size-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600 mb-1">Normalized Key</Label>
                <Input
                  value={editForm.key || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, key: e.target.value }))}
                  placeholder="performance-loading-speed"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600 mb-1">Display Title</Label>
                <Input
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Performance & Loading Speed"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-slate-600 mb-1">Description</Label>
                <Textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-slate-600 mb-1">Keywords (comma-separated)</Label>
                <Input
                  value={editForm.keywords?.join(', ') || ''}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      keywords: e.target.value.split(',').map((keyword) => keyword.trim()).filter(Boolean),
                    }))
                  }
                  placeholder="slow, loading, lag"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600 mb-1">Category</Label>
                <Select
                  value={editForm.category ?? 'functionality'}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="capabilities">Capabilities</SelectItem>
                    <SelectItem value="usability">Usability</SelectItem>
                    <SelectItem value="integration">Integration</SelectItem>
                  <SelectItem value="bugs">Bugs</SelectItem>
                    <SelectItem value="workflow">Workflow</SelectItem>
                    <SelectItem value="accessibility">Accessibility</SelectItem>
                    <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="feature-requests">Feature Requests</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Switch
                  checked={editForm.is_active ?? true}
                  onCheckedChange={(checked) => setEditForm((prev) => ({ ...prev, is_active: checked }))}
                />
                <Label className="text-xs text-slate-600">Active</Label>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" onClick={saveTheme} disabled={isSaving} style={{ backgroundColor: '#ff6900', color: 'white' }}>
                <Save className="size-3 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEditing}>
                Cancel
              </Button>
            </div>
          </Card>
        )}

        <div className="space-y-3">
          {filteredGroupings.map((group) => {
            const isExpanded = expandedThemes.has(group.theme_key);
            const isEditing = editingTheme === group.theme_key;
            const normalizedId = normalizedThemes.find((theme) => theme.key === group.theme_key)?.id;
            const mappedThemeIds = mappings
              .filter((mapping) => mapping.normalized_theme_id === normalizedId)
              .map((mapping) => mapping.theme_id);
            const availableObservations = observations.filter((row) => {
              if (!row.theme_id) return false;
              if (mappedThemeIds.includes(row.theme_id)) return false;
              if (appThemeSearchQuery) {
                const query = appThemeSearchQuery.toLowerCase();
                return (
                  (row.app_name ?? '').toLowerCase().includes(query) ||
                  (row.theme_title ?? '').toLowerCase().includes(query)
                );
              }
              return true;
            });

            return (
              <Card key={group.theme_key} className="overflow-hidden bg-white border-slate-200">
                <div className="p-3 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-base font-bold text-slate-900">#{group.rank}</span>
                      <Badge variant="outline" className={getSeverityColor(group.predominant_severity)}>
                        <AlertTriangle className="size-3 mr-1" />
                        {group.predominant_severity}
                      </Badge>

                      {isEditing && !isExpanded ? (
                        <Input
                          value={editForm.title || ''}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                          className="text-sm font-semibold max-w-md"
                        />
                      ) : (
                        <h3 className="text-sm font-semibold text-slate-900">{group.canonical_title}</h3>
                      )}

                      <Badge variant="outline" className={`${getCategoryColor(group.category)} text-[10px] px-1.5 py-0`}>
                        {group.category}
                      </Badge>
                      {group.needs_review && (
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0">
                          <AlertCircle className="size-3 mr-1" />
                          Review
                        </Badge>
                      )}
                      {!group.is_active && (
                        <Badge variant="outline" className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0">
                          <EyeOff className="size-3 mr-1" />
                          Inactive
                        </Badge>
                      )}

                      <div className="flex items-center gap-3 text-xs text-slate-600 ml-auto">
                        <span className="flex items-center gap-1">
                          <Link2 className="size-3" />
                          {group.affected_apps.length} apps
                        </span>
                        <span>{group.total_mentions} mentions</span>
                        <span>{group.avg_percentage.toFixed(1)}% avg</span>
                        {group.predominant_trend !== 'stable' && (
                          <span
                            className={`flex items-center gap-1 ${
                              group.predominant_trend === 'increasing' ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {group.predominant_trend === 'increasing' ? (
                              <TrendingUp className="size-3" />
                            ) : (
                              <TrendingDown className="size-3" />
                            )}
                            <span className="capitalize">{group.predominant_trend}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 ml-4">
                      {!isExpanded && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditing(group)}
                          className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleExpanded(group.theme_key)}
                        className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
                      >
                        {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-slate-50 p-3">
                    <div className="mb-3 p-3 bg-white rounded border border-slate-200">
                      <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-3">
                          {isEditing ? (
                            <div className="space-y-2">
                              <div>
                                <Label className="text-xs text-slate-600 mb-1">Title</Label>
                                <Input
                                  value={editForm.title || ''}
                                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-slate-600 mb-1">Description</Label>
                                <Textarea
                                  value={editForm.description || ''}
                                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                                  rows={2}
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-slate-600 mb-1">Keywords (comma-separated)</Label>
                                <Input
                                  value={editForm.keywords?.join(', ') || ''}
                                  onChange={(e) =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      keywords: e.target.value.split(',').map((keyword) => keyword.trim()).filter(Boolean),
                                    }))
                                  }
                                  placeholder="slow, loading, lag"
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-slate-600 mb-1">Category</Label>
                                <Select
                                  value={editForm.category ?? 'functionality'}
                                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, category: value }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="performance">Performance</SelectItem>
                                    <SelectItem value="functionality">Functionality</SelectItem>
                                    <SelectItem value="usability">Usability</SelectItem>
                                    <SelectItem value="integration">Integration</SelectItem>
                                    <SelectItem value="errors">Errors</SelectItem>
                                    <SelectItem value="workflow">Workflow</SelectItem>
                                    <SelectItem value="accessibility">Accessibility</SelectItem>
                                    <SelectItem value="hardware">Hardware</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={editForm.is_active ?? true}
                                  onCheckedChange={(checked) => setEditForm((prev) => ({ ...prev, is_active: checked }))}
                                />
                                <Label className="text-xs text-slate-600">Active</Label>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={saveTheme} disabled={isSaving} style={{ backgroundColor: '#ff6900', color: 'white' }}>
                                  <Save className="size-3 mr-1" />
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEditing}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs text-slate-600 mb-2">{group.description}</p>
                              <div className="flex items-center gap-4 text-xs">
                                <div>
                                  <span className="text-slate-600">Key:</span>{' '}
                                  <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                    {group.theme_key}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  <Tags className="size-3 text-slate-400" />
                                  {group.keywords.slice(0, 10).map((keyword, idx) => (
                                    <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                      {keyword}
                                    </span>
                                  ))}
                                  {group.keywords.length > 10 && (
                                    <span className="text-[10px] text-slate-500">+{group.keywords.length - 10}</span>
                                  )}
                                </div>
                              </div>
                              {!isEditing && (
                                <Button size="sm" variant="outline" onClick={() => startEditing(group)} className="mt-2 text-xs">
                                  <Edit2 className="size-3 mr-1" />
                                  Edit Details
                                </Button>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="border-l border-slate-200 pl-4">
                          <div className="text-xs font-semibold text-slate-700 mb-2">Severity Distribution</div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <div className="size-2 bg-red-500 rounded"></div>
                                <span>High</span>
                              </div>
                              <span className="font-medium">{group.high_severity_count}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <div className="size-2 bg-amber-500 rounded"></div>
                                <span>Medium</span>
                              </div>
                              <span className="font-medium">{group.medium_severity_count}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <div className="size-2 bg-slate-400 rounded"></div>
                                <span>Low</span>
                              </div>
                              <span className="font-medium">{group.low_severity_count}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-slate-700">
                          App-Specific Themes ({group.app_mappings.length})
                        </h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startAddingTheme(group.theme_key)}
                          className="h-7 text-xs gap-1"
                          style={{ borderColor: '#ff6900', color: '#ff6900' }}
                        >
                          <Plus className="size-3" />
                          Add App Theme
                        </Button>
                      </div>

                      {addingThemeToGroup === group.theme_key && (
                        <div className="mb-3 p-3 bg-white rounded border-2 border-orange-500">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-xs font-semibold text-slate-900">Connect Existing App Theme</h5>
                            <Button size="sm" variant="ghost" onClick={cancelAddingTheme} className="h-6 w-6 p-0">
                              <X className="size-3" />
                            </Button>
                          </div>
                          <div className="mb-2">
                            <Input
                              placeholder="Search by app name or theme title..."
                              value={appThemeSearchQuery}
                              onChange={(e) => setAppThemeSearchQuery(e.target.value)}
                              className="text-xs"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {availableObservations.slice(0, 10).map((row) => (
                              <button
                                key={`${row.theme_id}-${row.app_id}`}
                                onClick={() => row.theme_id && addAppThemeToGroup(row.theme_id, group.theme_key)}
                                className="w-full text-left p-2 text-xs hover:bg-slate-50 rounded border border-slate-200 flex items-center justify-between"
                              >
                                <div>
                                  <div className="font-medium text-slate-900">{row.app_name ?? row.app_id ?? 'Unknown app'}</div>
                                  <div className="text-slate-600">"{row.theme_title ?? 'Untitled'}"</div>
                                  <div className="text-slate-500">
                                    {(row.percent_of_feedback ?? 0).toFixed(0)}% • {row.mentions_count ?? 0} mentions
                                  </div>
                                </div>
                                <Plus className="size-3 text-slate-400" />
                              </button>
                            ))}
                            {availableObservations.length === 0 && (
                              <div className="text-xs text-slate-500">No available themes to add.</div>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                        {group.app_mappings.map((mapping) => (
                          <div key={mapping.id} className="p-2 bg-white rounded border border-slate-200">
                            <div className="flex items-start justify-between mb-1.5">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-xs text-slate-900 truncate mb-1">{mapping.app_name}</div>
                                <div className="flex flex-wrap gap-0.5 mb-1">
                                  <Badge variant="outline" className={`${getSeverityColor(mapping.severity)} text-[9px] px-1 py-0`}>
                                    Severity: {mapping.severity}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-1 py-0 ${
                                      mapping.confidence === 'high'
                                        ? 'bg-green-100 text-green-800'
                                        : mapping.confidence === 'medium'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    Confidence: {mapping.confidence}
                                  </Badge>
                                  {mapping.status && (
                                    <Badge
                                      variant="outline"
                                      className={`text-[9px] px-1 py-0 ${
                                        mapping.status === 'unresolved'
                                          ? 'bg-red-100 text-red-800'
                                          : mapping.status === 'improving'
                                            ? 'bg-amber-100 text-amber-800'
                                            : mapping.status === 'stabilized'
                                              ? 'bg-green-100 text-green-800'
                                              : 'bg-blue-100 text-blue-800'
                                      }`}
                                    >
                                      Status: {mapping.status}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0 text-slate-400 hover:text-slate-700 flex-shrink-0"
                              >
                                <Edit2 className="size-2.5" />
                              </Button>
                            </div>

                            <div className="text-[10px] font-medium text-slate-700 mb-1.5 line-clamp-2">
                              "{mapping.theme_title}"
                            </div>

                            <div className="flex items-center gap-2 text-[10px] text-slate-600 mb-1.5">
                              <span className="font-medium">{mapping.percentage}% of responses</span>
                              <span className="text-slate-400">•</span>
                              <span>
                                {mapping.mention_count === null
                                  ? 'mentions unavailable'
                                  : `${mapping.mention_count} mentions`}
                              </span>
                              {mapping.mentions_estimated && (
                                <span className="text-[9px] uppercase tracking-wide text-amber-600">
                                  estimated
                                </span>
                              )}
                            </div>
                            {mapping.trend_direction && mapping.trend_direction !== 'stable' && (
                              <div
                                className={`flex items-center gap-0.5 text-[10px] mb-1.5 ${
                                  mapping.trend_direction === 'increasing' ? 'text-red-600' : 'text-green-600'
                                }`}
                              >
                                {mapping.trend_direction === 'increasing' && <TrendingUp className="size-2.5" />}
                                {mapping.trend_direction === 'decreasing' && <TrendingDown className="size-2.5" />}
                                <span>
                                  {mapping.trend_percentage !== undefined
                                    ? `${mapping.trend_percentage > 0 ? '+' : ''}${mapping.trend_percentage}%`
                                    : mapping.trend_direction}
                                </span>
                              </div>
                            )}

                            {mapping.narratives.length > 0 && (
                              <div className="mt-1.5 pt-1.5 border-t border-slate-200">
                                <div className="text-[9px] font-medium text-slate-600 mb-0.5">Key points:</div>
                                <ul className="text-[10px] text-slate-600 space-y-0.5 list-disc list-inside">
                                  {mapping.narratives.slice(0, 2).map((narrative, idx) => (
                                    <li key={idx} className="line-clamp-1">
                                      {narrative}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {mapping.example_comment && (
                              <div className="mt-1.5 pt-1.5 border-t border-slate-200">
                                <div className="text-[9px] font-medium text-slate-600 mb-0.5">Example comment:</div>
                                <div className="text-[10px] text-slate-600 italic line-clamp-2">
                                  "{mapping.example_comment}"
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {filteredGroupings.length === 0 && (
          <Card className="p-12 text-center">
            <AlertCircle className="size-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No themes found</h3>
            <p className="text-sm text-slate-600">Try adjusting your filters or search query</p>
          </Card>
        )}
      </div>
    </div>
  );
}
