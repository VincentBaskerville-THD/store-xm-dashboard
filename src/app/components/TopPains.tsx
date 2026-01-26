import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileDown, AlertTriangle, TrendingUp, TrendingDown, AlertCircle, Info, Link2, Clock, X, BarChart3, LineChart, Construction } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import type { TimePeriodData } from './TimeSelector';
import { NavigationHeader } from './NavigationHeader';
import { supabase } from '../lib/supabaseClient';
// TODO: Replace mock pain data once Top Pains is wired to live data.

interface TopPainsProps {
  timePeriod: TimePeriodData;
  onTimePeriodChange: (period: TimePeriodData) => void;
  onNavigateBack: () => void;
  onNavigateHome?: () => void;
  onNavigateAllApps?: () => void;
  onNavigateKeyJourneys?: () => void;
  onNavigateTopPains?: () => void;
  onNavigateAdmin?: () => void;
  onNavigateExport?: () => void;
  isFeatureEnabled?: boolean;
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
  category: string | null;
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
  persistence_tag: string | null;
};

// Mock pain data aggregated from themes across apps/journeys
const mockPainData: Array<Omit<PainPoint, 'impactScore' | 'estimatedMentionsCount'>> = [
  {
    id: '1',
    title: 'Performance & Loading Speed Issues',
    percentage: 39,
    affectedApps: ['1Returns', 'Order Up', 'Curbside', 'Order Fulfillment'],
    monthsActive: 9,
    trendDirection: 'stable',
    totalMentions: 487,
    description: 'Users consistently report slow load times, system lag, and delayed responses across multiple applications',
    severity: 'high',
  },
  {
    id: '2',
    title: 'Receipt Lookup & Search Problems',
    percentage: 28,
    affectedApps: ['1Returns', 'Order Up'],
    monthsActive: 9,
    trendDirection: 'stable',
    totalMentions: 349,
    description: 'Receipt scanning and lookup functionality frequently fails or requires multiple attempts',
    severity: 'high',
  },
  {
    id: '3',
    title: 'Cross-System Transition Delays',
    percentage: 28,
    affectedApps: ['1Returns', 'Order Up', 'Specialty Project tool', 'Curbside'],
    monthsActive: 5,
    trendDirection: 'stable',
    totalMentions: 298,
    description: 'Switching between applications causes 30-45 second delays and requires manual data re-entry',
    severity: 'high',
  },
  {
    id: '4',
    title: 'Refund Processing Bottlenecks',
    percentage: 19,
    affectedApps: ['Order Up'],
    monthsActive: 3,
    trendDirection: 'increasing',
    trendPercentage: 12,
    totalMentions: 237,
    description: 'Refund step requires unnecessary manager approvals for standard returns that should be automatic',
    severity: 'medium',
  },
  {
    id: '5',
    title: 'Complex Navigation & UI Confusion',
    percentage: 18,
    affectedApps: ['1Returns', 'Specialty Project tool', 'Engage'],
    monthsActive: 6,
    trendDirection: 'decreasing',
    trendPercentage: 8,
    totalMentions: 224,
    description: 'Users struggle to find key features and navigate through complex menu structures',
    severity: 'medium',
  },
  {
    id: '6',
    title: 'Mobile Experience Issues',
    percentage: 15,
    affectedApps: ['Curbside', 'Order Fulfillment'],
    monthsActive: 4,
    trendDirection: 'increasing',
    trendPercentage: 15,
    totalMentions: 187,
    description: 'Mobile versions are difficult to use, with layout issues and touch target problems',
    severity: 'medium',
  },
  {
    id: '7',
    title: 'Error Messages Unclear',
    percentage: 12,
    affectedApps: ['1Returns', 'Order Up', 'Curbside'],
    monthsActive: 7,
    trendDirection: 'stable',
    totalMentions: 149,
    description: 'Error messages don\'t provide clear guidance on how to resolve issues',
    severity: 'low',
  },
  {
    id: '8',
    title: 'Manual Data Re-entry Required',
    percentage: 11,
    affectedApps: ['1Returns', 'Order Up', 'Curbside', 'Specialty Project tool'],
    monthsActive: 8,
    trendDirection: 'stable',
    totalMentions: 137,
    description: 'Same information must be typed into multiple systems instead of automatic transfer',
    severity: 'medium',
  },
  {
    id: '9',
    title: 'Inventory Sync Failures',
    percentage: 10,
    affectedApps: ['Specialty Project tool', 'Order Up', 'Engage'],
    monthsActive: 12,
    trendDirection: 'increasing',
    trendPercentage: 18,
    totalMentions: 124,
    description: 'Inventory counts don\'t sync properly between systems, leading to overselling',
    severity: 'high',
  },
  {
    id: '10',
    title: 'Limited Search Filters',
    percentage: 9,
    affectedApps: ['Curbside', '1Returns'],
    monthsActive: 15,
    trendDirection: 'stable',
    totalMentions: 112,
    description: 'Search functionality lacks advanced filtering options needed for complex queries',
    severity: 'medium',
  },
  {
    id: '11',
    title: 'Report Generation Timeout',
    percentage: 9,
    affectedApps: ['Order Up', 'Engage'],
    monthsActive: 4,
    trendDirection: 'stable',
    totalMentions: 108,
    description: 'Large reports time out before completing, requiring multiple attempts',
    severity: 'medium',
  },
  {
    id: '12',
    title: 'Accessibility Issues',
    percentage: 8,
    affectedApps: ['Curbside', '1Returns', 'Order Up'],
    monthsActive: 18,
    trendDirection: 'decreasing',
    trendPercentage: 5,
    totalMentions: 99,
    description: 'Screen readers and keyboard navigation don\'t work properly across interfaces',
    severity: 'medium',
  },
  {
    id: '13',
    title: 'Shipping Label Print Failures',
    percentage: 8,
    affectedApps: ['Order Fulfillment', 'Engage'],
    monthsActive: 6,
    trendDirection: 'increasing',
    trendPercentage: 10,
    totalMentions: 95,
    description: 'Labels fail to print correctly or print with incorrect formatting',
    severity: 'high',
  },
  {
    id: '14',
    title: 'Customer Contact Info Missing',
    percentage: 7,
    affectedApps: ['Curbside', '1Returns'],
    monthsActive: 5,
    trendDirection: 'stable',
    totalMentions: 87,
    description: 'Customer email and phone numbers not displaying when needed for follow-up',
    severity: 'medium',
  },
  {
    id: '15',
    title: 'Barcode Scanner Compatibility',
    percentage: 7,
    affectedApps: ['Specialty Project tool', 'Order Fulfillment', '1Returns'],
    monthsActive: 13,
    trendDirection: 'stable',
    totalMentions: 84,
    description: 'External barcode scanners frequently disconnect or fail to register scans',
    severity: 'low',
  },
  {
    id: '16',
    title: 'Order Status Not Updating',
    percentage: 7,
    affectedApps: ['Order Up', 'Curbside'],
    monthsActive: 8,
    trendDirection: 'increasing',
    trendPercentage: 14,
    totalMentions: 81,
    description: 'Order status remains stuck in "processing" even after shipment',
    severity: 'high',
  },
  {
    id: '17',
    title: 'Browser Compatibility Problems',
    percentage: 6,
    affectedApps: ['Curbside', 'Order Up', 'Engage'],
    monthsActive: 11,
    trendDirection: 'stable',
    totalMentions: 74,
    description: 'Certain features don\'t work in Safari and older browsers',
    severity: 'low',
  },
  {
    id: '18',
    title: 'Password Reset Flow Broken',
    percentage: 6,
    affectedApps: ['Curbside', '1Returns'],
    monthsActive: 2,
    trendDirection: 'increasing',
    trendPercentage: 22,
    totalMentions: 71,
    description: 'Password reset emails not arriving or links expiring too quickly',
    severity: 'medium',
  },
  {
    id: '19',
    title: 'Return Window Calculation Errors',
    percentage: 6,
    affectedApps: ['1Returns', 'Curbside'],
    monthsActive: 7,
    trendDirection: 'stable',
    totalMentions: 68,
    description: 'System incorrectly calculates whether items are within return window',
    severity: 'high',
  },
  {
    id: '20',
    title: 'Notification Overload',
    percentage: 5,
    affectedApps: ['Order Up', 'Order Fulfillment', 'Engage'],
    monthsActive: 9,
    trendDirection: 'increasing',
    trendPercentage: 8,
    totalMentions: 62,
    description: 'Too many email and in-app notifications causing important alerts to be missed',
    severity: 'low',
  },
  {
    id: '21',
    title: 'Image Upload Failures',
    percentage: 5,
    affectedApps: ['1Returns', 'Curbside'],
    monthsActive: 4,
    trendDirection: 'stable',
    totalMentions: 59,
    description: 'Product or damage photos fail to upload during returns process',
    severity: 'medium',
  },
  {
    id: '22',
    title: 'Session Timeout Too Aggressive',
    percentage: 5,
    affectedApps: ['Order Up', 'Engage', 'Specialty Project tool'],
    monthsActive: 14,
    trendDirection: 'stable',
    totalMentions: 56,
    description: 'Users get logged out in the middle of tasks, losing unsaved work',
    severity: 'medium',
  },
  {
    id: '23',
    title: 'Bulk Action Limitations',
    percentage: 4,
    affectedApps: ['Order Up', 'Specialty Project tool'],
    monthsActive: 10,
    trendDirection: 'decreasing',
    trendPercentage: 6,
    totalMentions: 52,
    description: 'Cannot process more than 50 items at once in bulk operations',
    severity: 'low',
  },
  {
    id: '24',
    title: 'Tax Calculation Inaccuracies',
    percentage: 4,
    affectedApps: ['Order Up', 'Curbside'],
    monthsActive: 3,
    trendDirection: 'increasing',
    trendPercentage: 25,
    totalMentions: 49,
    description: 'Sales tax calculations incorrect for certain states and product categories',
    severity: 'high',
  },
  {
    id: '25',
    title: 'Return Labels Not Generated',
    percentage: 4,
    affectedApps: ['1Returns', 'Order Fulfillment'],
    monthsActive: 5,
    trendDirection: 'stable',
    totalMentions: 47,
    description: 'Prepaid return labels fail to generate for approved returns',
    severity: 'high',
  },
  {
    id: '26',
    title: 'Address Validation Too Strict',
    percentage: 4,
    affectedApps: ['Curbside', 'Order Fulfillment'],
    monthsActive: 16,
    trendDirection: 'stable',
    totalMentions: 44,
    description: 'Valid addresses rejected by validation system, blocking orders',
    severity: 'medium',
  },
  {
    id: '27',
    title: 'Language Toggle Not Persisting',
    percentage: 3,
    affectedApps: ['Curbside'],
    monthsActive: 6,
    trendDirection: 'stable',
    totalMentions: 41,
    description: 'Language preference resets to English after each session',
    severity: 'low',
  },
  {
    id: '28',
    title: 'Discount Code Application Errors',
    percentage: 3,
    affectedApps: ['Order Up', 'Curbside'],
    monthsActive: 2,
    trendDirection: 'increasing',
    trendPercentage: 30,
    totalMentions: 38,
    description: 'Valid promo codes rejected or discount amounts calculated incorrectly',
    severity: 'high',
  },
  {
    id: '29',
    title: 'Export File Format Issues',
    percentage: 3,
    affectedApps: ['Order Up', 'Specialty Project tool', 'Engage'],
    monthsActive: 8,
    trendDirection: 'stable',
    totalMentions: 36,
    description: 'Exported CSV and Excel files have formatting problems and missing columns',
    severity: 'low',
  },
  {
    id: '30',
    title: 'Dashboard Widget Loading Errors',
    percentage: 3,
    affectedApps: ['Order Up', 'Engage'],
    monthsActive: 4,
    trendDirection: 'stable',
    totalMentions: 33,
    description: 'Dashboard widgets fail to load data intermittently',
    severity: 'medium',
  },
  {
    id: '31',
    title: 'Gift Message Character Limit',
    percentage: 3,
    affectedApps: ['Curbside', 'Order Up'],
    monthsActive: 20,
    trendDirection: 'stable',
    totalMentions: 31,
    description: 'Gift message field has unreasonably short character limit',
    severity: 'low',
  },
  {
    id: '32',
    title: 'Return Reason Dropdown Incomplete',
    percentage: 2,
    affectedApps: ['1Returns'],
    monthsActive: 7,
    trendDirection: 'stable',
    totalMentions: 28,
    description: 'Common return reasons missing from dropdown, forcing "Other" selection',
    severity: 'low',
  },
  {
    id: '33',
    title: 'Stock Alert Threshold Not Configurable',
    percentage: 2,
    affectedApps: ['Specialty Project tool'],
    monthsActive: 12,
    trendDirection: 'stable',
    totalMentions: 26,
    description: 'Cannot customize low stock alert thresholds per product',
    severity: 'medium',
  },
  {
    id: '34',
    title: 'Multi-Location Shipping Calculation Wrong',
    percentage: 2,
    affectedApps: ['Order Fulfillment', 'Order Up'],
    monthsActive: 5,
    trendDirection: 'increasing',
    trendPercentage: 15,
    totalMentions: 24,
    description: 'Shipping costs incorrect when order ships from multiple warehouses',
    severity: 'high',
  },
  {
    id: '35',
    title: 'Color Scheme Hard to Read',
    percentage: 2,
    affectedApps: ['Engage', 'Specialty Project tool'],
    monthsActive: 15,
    trendDirection: 'stable',
    totalMentions: 22,
    description: 'Low contrast text difficult to read, especially in bright environments',
    severity: 'low',
  },
  {
    id: '36',
    title: 'Carrier Service Unavailable Errors',
    percentage: 2,
    affectedApps: ['Order Fulfillment', 'Engage'],
    monthsActive: 3,
    trendDirection: 'increasing',
    trendPercentage: 20,
    totalMentions: 21,
    description: 'Shipping carrier APIs frequently timeout or return errors',
    severity: 'high',
  },
  {
    id: '37',
    title: 'Historical Data Access Limited',
    percentage: 2,
    affectedApps: ['Order Up', 'Curbside'],
    monthsActive: 18,
    trendDirection: 'stable',
    totalMentions: 19,
    description: 'Cannot view orders or returns older than 12 months',
    severity: 'medium',
  },
  {
    id: '38',
    title: 'Duplicate Order Creation Possible',
    percentage: 1,
    affectedApps: ['Order Up', 'Customer Portal'],
    monthsActive: 4,
    trendDirection: 'increasing',
    trendPercentage: 35,
    totalMentions: 17,
    description: 'Double-clicking submit button creates duplicate orders',
    severity: 'high',
  },
  {
    id: '39',
    title: 'In-Store Pickup Location Unclear',
    percentage: 1,
    affectedApps: ['Customer Portal', 'Order Up'],
    monthsActive: 6,
    trendDirection: 'stable',
    totalMentions: 15,
    description: 'Pickup instructions don\'t clearly indicate which entrance or counter to use',
    severity: 'low',
  },
  {
    id: '40',
    title: 'Product Variant Selection Confusing',
    percentage: 1,
    affectedApps: ['Customer Portal'],
    monthsActive: 9,
    trendDirection: 'stable',
    totalMentions: 14,
    description: 'Size/color selection UI unclear, leading to wrong items ordered',
    severity: 'medium',
  },
  {
    id: '41',
    title: 'Wishlist Sync Issues',
    percentage: 1,
    affectedApps: ['Customer Portal'],
    monthsActive: 11,
    trendDirection: 'decreasing',
    trendPercentage: 10,
    totalMentions: 12,
    description: 'Wishlist items don\'t sync across devices properly',
    severity: 'low',
  },
  {
    id: '42',
    title: 'Refund Method Restrictions',
    percentage: 1,
    affectedApps: ['1Returns', 'Order Up'],
    monthsActive: 7,
    trendDirection: 'stable',
    totalMentions: 11,
    description: 'Limited options for refund method, especially for international orders',
    severity: 'medium',
  },
  {
    id: '43',
    title: 'Shipping Carrier Tracking Links Broken',
    percentage: 1,
    affectedApps: ['Customer Portal', 'Shipping Manager'],
    monthsActive: 2,
    trendDirection: 'increasing',
    trendPercentage: 40,
    totalMentions: 10,
    description: 'Tracking number links lead to carrier error pages',
    severity: 'medium',
  },
  {
    id: '44',
    title: 'Product Review Submission Failures',
    percentage: 1,
    affectedApps: ['Customer Portal'],
    monthsActive: 8,
    trendDirection: 'stable',
    totalMentions: 9,
    description: 'Product reviews fail to submit with vague error messages',
    severity: 'low',
  },
  {
    id: '45',
    title: 'Batch Update Processing Slow',
    percentage: 1,
    affectedApps: ['Inventory Manager', 'Order Up'],
    monthsActive: 13,
    trendDirection: 'stable',
    totalMentions: 8,
    description: 'Bulk inventory updates take excessively long to process',
    severity: 'medium',
  },
  {
    id: '46',
    title: 'Return Item Condition Assessment Unclear',
    percentage: 1,
    affectedApps: ['1Returns'],
    monthsActive: 5,
    trendDirection: 'stable',
    totalMentions: 7,
    description: 'Guidelines for item condition (new/used/damaged) not clearly defined',
    severity: 'low',
  },
  {
    id: '47',
    title: 'Order Cancellation Window Too Short',
    percentage: 1,
    affectedApps: ['Customer Portal', 'Order Up'],
    monthsActive: 10,
    trendDirection: 'stable',
    totalMentions: 6,
    description: 'Orders cannot be cancelled after just a few minutes',
    severity: 'medium',
  },
  {
    id: '48',
    title: 'Gift Card Balance Check Unreliable',
    percentage: 1,
    affectedApps: ['Customer Portal', 'Order Up'],
    monthsActive: 4,
    trendDirection: 'increasing',
    trendPercentage: 28,
    totalMentions: 5,
    description: 'Gift card balance lookup frequently fails or shows incorrect amounts',
    severity: 'medium',
  },
];

const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
  if (severity === 'high') return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', badge: 'bg-red-100 text-red-800 border-red-300' };
  if (severity === 'medium') return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', badge: 'bg-orange-100 text-orange-800 border-orange-300' };
  return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-900', badge: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
};

export function TopPains({
  timePeriod,
  onTimePeriodChange,
  onNavigateBack,
  onNavigateHome,
  onNavigateAllApps,
  onNavigateKeyJourneys,
  onNavigateTopPains,
  onNavigateAdmin,
  onNavigateExport,
  isFeatureEnabled = true,
  showAdminButton,
}: TopPainsProps) {
  if (!isFeatureEnabled) {
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
          title="Top Pains"
          subtitle="Emerging experience issues across the portfolio"
          showExportButton={true}
        />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <Construction className="mx-auto size-12 text-orange-500" />
            <h2 className="mt-4 text-xl font-semibold text-slate-900">Work in progress</h2>
            <p className="mt-2 text-slate-600">
              This functionality is coming soon. Check back in a few days &amp;/or give Vincent a ping.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [visualizationView, setVisualizationView] = useState<'both' | 'ranking' | 'trends'>('both');
  const [selectedPainForDetail, setSelectedPainForDetail] = useState<PainPoint | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [painData, setPainData] = useState<PainPoint[]>([]);
  const [rawObservations, setRawObservations] = useState<ObservationRow[]>([]);
  const [normalizedThemes, setNormalizedThemes] = useState<NormalizedThemeRow[]>([]);
  const [themeMappings, setThemeMappings] = useState<ThemeMappingRow[]>([]);
  const [availableApps, setAvailableApps] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [prevStats] = useState<ReturnType<typeof computeSummary> | null>(null);
  const [recentPeriods, setRecentPeriods] = useState<Array<{ period: string; label: string }>>([]);
  const [seriesByThemeKey, setSeriesByThemeKey] = useState<Record<string, number[]>>({});
  const [dataMonthsCount, setDataMonthsCount] = useState<number>(0);
  const itemsPerPage = 10;

  // Reset to page 1 when time period changes
  useEffect(() => {
    setCurrentPage(1);
  }, [timePeriod.period]);

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

  const buildRecentSeries = (
    observations: ObservationRow[],
    normalizedThemes: NormalizedThemeRow[],
    mappings: ThemeMappingRow[],
    periods: Array<{ period: string; label: string }>,
  ) => {
    const normalizedById = new Map(normalizedThemes.map((theme) => [theme.id, theme]));
    const mappingByThemeId = new Map(mappings.map((mapping) => [mapping.theme_id, mapping]));
    const periodIndex = new Map(periods.map((period, index) => [period.period, index]));
    const series: Record<string, number[]> = {};

    observations.forEach((row) => {
      if (!row.theme_id || !row.period) return;
      const index = periodIndex.get(row.period);
      if (index === undefined) return;
      const mapping = mappingByThemeId.get(row.theme_id);
      if (!mapping) return;
      const normalized = normalizedById.get(mapping.normalized_theme_id);
      if (!normalized || normalized.is_active === false) return;

      if (!series[normalized.key]) {
        series[normalized.key] = Array(periods.length).fill(0);
      }
      const baseMentions = row.mentions_count ?? row.percent_of_feedback ?? 0;
      series[normalized.key][index] += baseMentions;
    });

    return series;
  };


  const computeSummary = (pains: PainPoint[]) => {
    const highSeverityCount = pains.filter((pain) => pain.severity === 'high').length;
    const crossAppPainsCount = pains.filter((pain) => pain.affectedApps.length > 1).length;
    const avgMonthsActive =
      pains.length > 0 ? pains.reduce((sum, pain) => sum + pain.monthsActive, 0) / pains.length : 0;
    const chronicCount = pains.filter((pain) => pain.monthsActive >= 6).length;
      return {
      highSeverityCount,
      crossAppPainsCount,
      avgMonthsActive,
      chronicCount,
    };
  };

  useEffect(() => {
    let isMounted = true;
    const loadPainData = async () => {
      setIsLoading(true);
      setLoadError(null);

      const [
        { data: observations, error: observationsError },
        { data: normalizedRows },
        { data: mappingRows },
      ] = await Promise.all([
        supabase
          .from('v_pain_observations_enriched')
          .select(
            'period,period_label,sort_order,theme_id,theme_title,theme_type,app_id,app_name,severity,status,months_active,mentions_count,mentions_estimated,percent_of_feedback,trend_direction,trend_percentage,persistence_tag',
          )
          .eq('theme_type', 'negative'),
        supabase.from('normalized_themes').select('id,key,title,description,category,is_active'),
        supabase.from('theme_mappings').select('theme_id,normalized_theme_id,confidence'),
      ]);

      if (!isMounted) return;

      if (observationsError) {
        setLoadError('Unable to load top pains.');
        setIsLoading(false);
        return;
      }

      const resolvedObservations = (observations ?? []) as ObservationRow[];
      const resolvedNormalizedThemes = (normalizedRows ?? []) as NormalizedThemeRow[];
      const resolvedMappings = (mappingRows ?? []) as ThemeMappingRow[];
      const pains = buildPainPoints(
        resolvedObservations,
        resolvedNormalizedThemes,
        resolvedMappings,
      );

      if (!isMounted) return;

      setPainData(pains);
      setRawObservations(resolvedObservations);
      setNormalizedThemes(resolvedNormalizedThemes);
      setThemeMappings(resolvedMappings);
      const apps = Array.from(
        new Set((observations ?? []).map((row) => row.app_name).filter(Boolean)),
      ) as string[];
      setAvailableApps(apps.sort((a, b) => a.localeCompare(b)));

      const periodMap = new Map<string, { period: string; label: string; sort_order: number }>();
      resolvedObservations.forEach((row) => {
        if (!row.period || row.sort_order === null || row.sort_order === undefined) return;
        const label = row.period_label ?? row.period;
        if (!periodMap.has(row.period)) {
          periodMap.set(row.period, { period: row.period, label, sort_order: row.sort_order });
        }
      });
      const periods = Array.from(periodMap.values())
        .sort((a, b) => a.sort_order - b.sort_order)
        .slice(-3);
      const recent = periods.map((row) => ({ period: row.period, label: row.label }));
      setRecentPeriods(recent);
      setDataMonthsCount(periodMap.size);
      setSeriesByThemeKey(
        buildRecentSeries(
          resolvedObservations,
          resolvedNormalizedThemes,
          resolvedMappings,
          recent,
        ),
      );

      setIsLoading(false);
    };

    loadPainData();
    return () => {
      isMounted = false;
    };
  }, [timePeriod.period, timePeriod.format]);

  const prevLabel = 'previous period';

  // Filter data by scope (app)
  const scopedObservations = useMemo(() => {
    if (scopeFilter === 'all') return rawObservations;
    return rawObservations.filter((row) => row.app_name === scopeFilter);
  }, [rawObservations, scopeFilter]);

  const scopedPainData = useMemo(() => {
    if (scopeFilter === 'all') return painData;
    return buildPainPoints(scopedObservations, normalizedThemes, themeMappings);
  }, [painData, scopeFilter, scopedObservations, normalizedThemes, themeMappings]);

  const scopedPeriods = useMemo(() => {
    const periodMap = new Map<string, { period: string; label: string; sort_order: number }>();
    scopedObservations.forEach((row) => {
      if (!row.period || row.sort_order === null || row.sort_order === undefined) return;
      const label = row.period_label ?? row.period;
      if (!periodMap.has(row.period)) {
        periodMap.set(row.period, { period: row.period, label, sort_order: row.sort_order });
      }
    });
    return Array.from(periodMap.values()).sort((a, b) => a.sort_order - b.sort_order);
  }, [scopedObservations]);

  const scopedRecentPeriods = useMemo(() => {
    return scopedPeriods.slice(-3).map((row) => ({ period: row.period, label: row.label }));
  }, [scopedPeriods]);

  const scopedSeriesByThemeKey = useMemo(() => {
    if (scopeFilter === 'all') return seriesByThemeKey;
    return buildRecentSeries(scopedObservations, normalizedThemes, themeMappings, scopedRecentPeriods);
  }, [scopeFilter, seriesByThemeKey, scopedObservations, normalizedThemes, themeMappings, scopedRecentPeriods]);

  const scopedDataMonthsCount = scopeFilter === 'all' ? dataMonthsCount : scopedPeriods.length;

  const selectedPainTimeSeries = useMemo(() => {
    if (!selectedPainForDetail) return [];
    const periodMap = new Map<string, { period: string; label: string; sort_order: number }>();
    scopedObservations.forEach((row) => {
      if (!row.period || row.sort_order === null || row.sort_order === undefined) return;
      const label = row.period_label ?? row.period;
      if (!periodMap.has(row.period)) {
        periodMap.set(row.period, { period: row.period, label, sort_order: row.sort_order });
      }
    });
    const periods = Array.from(periodMap.values()).sort((a, b) => a.sort_order - b.sort_order);
    const allSeries = buildRecentSeries(
      scopedObservations,
      normalizedThemes,
      themeMappings,
      periods.map((row) => ({ period: row.period, label: row.label })),
    );
    const values = allSeries[selectedPainForDetail.id] ?? [];
    return periods.map((period, index) => ({
      label: period.label,
      value: values[index] ?? 0,
    }));
  }, [normalizedThemes, scopedObservations, selectedPainForDetail, themeMappings]);

  const getImpactScoreForScope = (pain: PainPoint) => {
    if (scopeFilter === 'all') return pain.impactScore;
    const divisor = Math.max(pain.affectedApps.length, 1);
    return pain.impactScore / divisor;
  };

  // Sort by impact score
  const getDisplayedPains = () => {
    let pains = scopedPainData;
    
    pains.sort((a, b) => {
      const aScore = getImpactScoreForScope(a);
      const bScore = getImpactScoreForScope(b);
      if (bScore !== aScore) {
        return bScore - aScore;
      }
      return b.totalMentions - a.totalMentions;
    });

    return pains;
  };

  const displayedPains = getDisplayedPains();
  const top10Pains = displayedPains.slice(0, 10);
  const top5Pains = displayedPains.slice(0, 5);
  const trendValues = top5Pains.flatMap((pain) => scopedSeriesByThemeKey[pain.id] ?? []);
  const maxTrendValue = trendValues.length > 0 ? Math.max(...trendValues) : 1;
  // Calculate summary statistics based on scoped data
  const summaryStats = computeSummary(scopedPainData);
  const highSeverityCount = summaryStats.highSeverityCount;
  const crossAppPainsCount = summaryStats.crossAppPainsCount;
  const avgMonthsActive = summaryStats.avgMonthsActive;
  const avgMonthsActiveDisplay = avgMonthsActive.toFixed(1);
  const chronicCount = summaryStats.chronicCount;

  const trendLabels = scopedRecentPeriods.map((period) => period.label);
  const lineColors = ['#2563eb', '#10b981', '#f97316', '#a855f7', '#0ea5e9'];

  const handlePainClick = (pain: PainPoint) => {
    setSelectedPainForDetail(pain);
    setDetailPanelOpen(true);
  };

  const closeDetailPanel = () => {
    setDetailPanelOpen(false);
    setTimeout(() => setSelectedPainForDetail(null), 300);
  };

  // Safety check - don't render if no pains
  const hasData = displayedPains.length > 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <NavigationHeader
        currentView="top-pains"
        onNavigateHome={onNavigateHome || onNavigateBack}
        onNavigateAllApps={onNavigateAllApps || onNavigateBack}
        onNavigateKeyJourneys={onNavigateKeyJourneys || onNavigateBack}
        onNavigateTopPains={onNavigateTopPains || (() => {})}
        onNavigateAdmin={onNavigateAdmin}
        onNavigateExport={onNavigateExport}
        showAdminButton={showAdminButton}
        title="Top Pains"
        subtitle="Recurring pain points across applications"
        showExportButton={true}
      />

      {/* Time Period Selection (disabled for all-time view) */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600">
            <span className="font-semibold text-slate-800">All time</span>
            <span className="text-slate-500">
              Top pains across {scopedDataMonthsCount} months of data
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {(isLoading || loadError) && (
          <Card className="mb-6 border-slate-200 bg-white p-4">
            {loadError ? (
              <div className="text-sm text-red-600">{loadError}</div>
            ) : (
              <div className="text-sm text-slate-600">Loading top pains…</div>
            )}
          </Card>
        )}
        {/* Scope Filter */}
        <section className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <label htmlFor="scope-filter" className="text-slate-700 font-semibold whitespace-nowrap">
              Scope:
            </label>
            <Select value={scopeFilter} onValueChange={(value) => {
              setScopeFilter(value);
              setCurrentPage(1); // Reset to first page when filter changes
            }}>
              <SelectTrigger id="scope-filter" className="w-full sm:w-80">
                <SelectValue placeholder="All Apps" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Apps</SelectItem>
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase">Apps</div>
                {availableApps.map((app) => (
                  <SelectItem key={app} value={app}>
                    {app}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Visualization Section */}
        <section className="mb-8">
          {/* Section Header with Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
            <div>
              <h2 className="text-slate-900">Pain Point Analysis</h2>
              <p className="text-slate-600">Top issues reported via feedback</p>
            </div>
            
            {/* View Toggle */}
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
              <button
                onClick={() => setVisualizationView('both')}
                className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
                  visualizationView === 'both' 
                    ? 'bg-slate-900 text-white' 
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Both
              </button>
              <button
                onClick={() => setVisualizationView('ranking')}
                className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  visualizationView === 'ranking' 
                    ? 'bg-slate-900 text-white' 
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <BarChart3 className="size-4" />
                Ranking
              </button>
              <button
                onClick={() => setVisualizationView('trends')}
                className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  visualizationView === 'trends' 
                    ? 'bg-slate-900 text-white' 
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <LineChart className="size-4" />
                Trends
              </button>
            </div>
          </div>

          {/* Visualization Content */}
          <Card className="p-6 border-slate-200">
            <div className={`grid gap-6 ${visualizationView === 'both' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
              {/* Ranking View (Bar Chart) */}
              {(visualizationView === 'both' || visualizationView === 'ranking') && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Top 10 Pain Points</h3>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
                        >
                          <Info className="size-4" />
                          Ranking logic
                        </button>
                      </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="w-max max-w-none whitespace-nowrap text-xs leading-relaxed"
                    >
                      <div className="whitespace-nowrap">
                        impact = mentions × status × severity × trend{scopeFilter === 'all' ? ' × affected apps' : ''}
                      </div>
                      <div className="whitespace-nowrap">
                        status: unresolved 1.0, improving 0.85, stabilized 0.6, resolved 0.3
                      </div>
                      <div className="whitespace-nowrap">
                        latest period decay: unresolved 1.0, improving 0.85, stabilized 0.6, resolved 0.3
                      </div>
                      <div className="whitespace-nowrap">severity: high 3, medium 2, low 1</div>
                      <div className="whitespace-nowrap">trend: increasing 1.2, stable 1.0, decreasing 0.8</div>
                    </TooltipContent>
                    </Tooltip>
                  </div>
                  
                  <div className="space-y-3">
                    {top10Pains.length === 0 ? (
                      <div className="text-sm text-slate-500">No top pains found for this period.</div>
                    ) : (
                      top10Pains.map((pain, index) => {
                      const SeverityIcon = pain.severity === 'high' ? AlertTriangle : pain.severity === 'medium' ? AlertCircle : Info;
                        const maxMentions = top10Pains[0]?.totalMentions ?? 1;
                      const barWidth = (pain.totalMentions / maxMentions) * 100;
                      
                      return (
                        <button
                          key={pain.id}
                          onClick={() => handlePainClick(pain)}
                          className="w-full text-left group"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-slate-500 w-6">#{index + 1}</span>
                            <SeverityIcon className={`size-4 flex-shrink-0 ${
                              pain.severity === 'high' ? 'text-red-600' : 
                              pain.severity === 'medium' ? 'text-orange-600' : 
                              'text-yellow-600'
                            }`} />
                            <span className="text-sm font-semibold text-slate-900 flex-1 truncate group-hover:text-slate-700">
                              {pain.title}
                            </span>
                            {scopeFilter === 'all' && (
                              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                {pain.affectedApps.length} {pain.affectedApps.length === 1 ? 'app' : 'apps'}
                              </span>
                            )}
                          </div>
                          <div className="ml-8 relative">
                            <div className="h-7 bg-slate-100 rounded overflow-hidden">
                              <div 
                                className={`h-full transition-all group-hover:opacity-80 ${
                                  pain.severity === 'high' ? 'bg-red-500' : 
                                  pain.severity === 'medium' ? 'bg-orange-500' : 
                                  'bg-yellow-500'
                                }`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                              <span className="absolute right-2 top-1 text-sm text-slate-900">
                                <span className="font-semibold">{pain.totalMentions}</span>{' '}
                                <span className="font-normal text-slate-600">mentions</span>
                                {pain.estimatedMentionsCount > 0 && (
                                  <span className="ml-1 text-xs font-normal text-slate-500">
                                    • {pain.estimatedMentionsCount} est.
                                  </span>
                                )}
                            </span>
                          </div>
                        </button>
                      );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Trends View (Line Chart) */}
              {(visualizationView === 'both' || visualizationView === 'trends') && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Top 5 Pains: Last 3 Months</h3>
                    <span className="text-sm text-slate-600">mentions per month</span>
                  </div>
                  
                  {/* Chart Area */}
                  <div className="relative h-64 border border-slate-200 rounded-lg p-4">
                    {trendLabels.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
                        Not enough data to show the last 3 months.
                      </div>
                    )}
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-4 bottom-4 w-12 pr-2 flex flex-col justify-between text-xs text-slate-600 text-right">
                      {[0, 1, 2, 3, 4].reverse().map((i) => {
                        const value = Math.round((maxTrendValue / 4) * i);
                        return <span key={i}>{value}</span>;
                      })}
                    </div>
                    
                    {/* Chart content */}
                    <div className="ml-14 h-full pb-6">
                      <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="xMidYMid meet">
                        {/* Grid lines */}
                        {[0, 1, 2, 3, 4].map((i) => (
                          <line
                            key={i}
                            x1="0"
                            y1={(i / 4) * 100}
                            x2="400"
                            y2={(i / 4) * 100}
                            stroke="#e2e8f0"
                            strokeWidth="0.5"
                          />
                        ))}
                        
                        {/* Lines for each pain point */}
                        {top5Pains.map((pain, painIndex) => {
                          const values = scopedSeriesByThemeKey[pain.id] ?? [];
                          const color = lineColors[painIndex % lineColors.length];
                          const count = values.length;
                          const points = values.map((value, i) => {
                            const x = count > 1 ? (i / (count - 1)) * 400 : 0;
                            const y = 100 - ((value / maxTrendValue) * 100);
                            return `${x},${y}`;
                          }).join(' ');
                          
                          return (
                            <g key={pain.id}>
                              <polyline
                                points={points}
                                fill="none"
                                stroke={color}
                                strokeWidth="2"
                                className="cursor-pointer"
                                onClick={() => handlePainClick(pain)}
                                style={{ transition: 'stroke-width 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.setAttribute('stroke-width', '3')}
                                onMouseLeave={(e) => e.currentTarget.setAttribute('stroke-width', '2')}
                              />
                              {/* Data points */}
                              {values.map((value, i) => {
                                const x = values.length > 1 ? (i / (values.length - 1)) * 400 : 0;
                                const y = 100 - ((value / maxTrendValue) * 100);
                                return (
                                  <circle
                                    key={i}
                                    cx={x}
                                    cy={y}
                                    r="4"
                                    fill={color}
                                    className="cursor-pointer"
                                    onClick={() => handlePainClick(pain)}
                                  />
                                );
                              })}
                            </g>
                          );
                        })}
                      </svg>
                      
                      {/* X-axis labels */}
                      <div className="flex justify-between px-1 mt-2 text-xs text-slate-600">
                        {trendLabels.map((label, i) => (
                          <span key={label + i} className="text-center">{label}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="space-y-1.5">
                    {top5Pains.map((pain, index) => {
                      const SeverityIcon = pain.severity === 'high' ? AlertTriangle : pain.severity === 'medium' ? AlertCircle : Info;
                      const color = lineColors[index % lineColors.length];
                      
                      return (
                        <button
                          key={pain.id}
                          onClick={() => handlePainClick(pain)}
                          className="flex items-center gap-2 w-full text-left hover:bg-slate-50 p-1.5 rounded transition-colors"
                        >
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <SeverityIcon className={`size-3 flex-shrink-0 ${
                            pain.severity === 'high' ? 'text-red-600' : 
                            pain.severity === 'medium' ? 'text-orange-600' : 
                            'text-yellow-600'
                          }`} />
                          <span className="text-sm text-slate-900 truncate flex-1">{pain.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* Two-column layout: Pain Points List + Summary Cards */}
        <div className="grid lg:grid-cols-[1fr_280px] gap-6 items-start">
          {/* Pain Points List - Left Column */}
          <section className="space-y-4 min-w-0">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-slate-900">All Pain Points</h2>
                <p className="text-slate-600">
                  {displayedPains.length > 0 ? (
                    <>
                      Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, displayedPains.length)} of {displayedPains.length}
                    </>
                  ) : (
                    'No pain points found'
                  )}
                </p>
              </div>
              
              {/* Pagination Info */}
              {displayedPains.length > itemsPerPage && (
                <div className="text-sm text-slate-600">
                  Page {currentPage} of {Math.ceil(displayedPains.length / itemsPerPage)}
                </div>
              )}
            </div>

            {displayedPains.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((pain, index) => {
              // Calculate global index
              const globalIndex = (currentPage - 1) * itemsPerPage + index;
              
              // Get severity icon
              const SeverityIcon = pain.severity === 'high' ? AlertTriangle : pain.severity === 'medium' ? AlertCircle : Info;
              const severityLabel = pain.severity === 'high'
                ? 'Perceived Severity: High'
                : pain.severity === 'medium'
                  ? 'Perceived Severity: Medium'
                  : 'Perceived Severity: Low';
              const severityColors = pain.severity === 'high' 
                ? 'bg-red-100 border-red-300 text-red-800' 
                : pain.severity === 'medium' 
                ? 'bg-orange-100 border-orange-300 text-orange-800' 
                : 'bg-yellow-100 border-yellow-300 text-yellow-800';
              
              return (
                <Card key={pain.id} className="p-4 sm:p-6 border-slate-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <SeverityIcon className="size-5 text-slate-900 flex-shrink-0" />
                          <span className="px-2 py-1 rounded text-sm font-semibold border border-slate-300 bg-slate-50 text-slate-700">
                            #{globalIndex + 1}
                          </span>
                        </div>
                        <h3 className="font-semibold text-slate-900 flex-1">{pain.title}</h3>
                        <span className="px-3 py-1 rounded bg-slate-100 text-slate-900 font-semibold text-sm whitespace-nowrap self-start">
                          {Math.round(pain.percentage)}% of feedback
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-700 text-xs font-semibold">
                          <Clock className="size-3" />
                          Duration: {pain.monthsActive} months
                        </span>

                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-semibold ${severityColors}`}>
                          <SeverityIcon className="size-3" />
                          {severityLabel}
                        </span>
                        
                        {scopeFilter === 'all' && pain.affectedApps.length > 1 && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-700 text-xs font-semibold">
                            <Link2 className="size-3" />
                            {pain.affectedApps.length} apps
                          </span>
                        )}

                        {pain.trendDirection === 'increasing' && pain.trendPercentage && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-700 text-xs font-semibold">
                            <TrendingUp className="size-3" />
                            {pain.trendPercentage}% vs last Q
                          </span>
                        )}

                        {pain.trendDirection === 'decreasing' && pain.trendPercentage && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-700 text-xs font-semibold">
                            <TrendingDown className="size-3" />
                            {pain.trendPercentage}% vs last Q
                          </span>
                        )}

                        <span className="text-slate-600 text-sm">
                          {pain.totalMentions} mentions
                          {pain.estimatedMentionsCount > 0 && (
                            <span className="text-slate-500"> • {pain.estimatedMentionsCount} est.</span>
                          )}
                        </span>
                      </div>

                      <p className="text-slate-700 mb-3">{pain.description}</p>

                      {scopeFilter === 'all' && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                          <span className="text-slate-600 font-semibold">Affected Apps:</span>
                          <span className="text-slate-700">{pain.affectedApps.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Pagination Controls */}
            {displayedPains.length > itemsPerPage && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
                {/* Previous Button */}
                <Button
                  onClick={() => {
                    setCurrentPage(currentPage - 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage === 1}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Previous
                </Button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1 flex-wrap justify-center">
                  {(() => {
                    const totalPages = Math.ceil(displayedPains.length / itemsPerPage);
                    const pageNumbers: React.ReactNode[] = [];
                    const maxVisiblePages = 5;
                    
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                    
                    if (endPage - startPage < maxVisiblePages - 1) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }
                    
                    // First page
                    if (startPage > 1) {
                      pageNumbers.push(
                        <button
                          key={1}
                          onClick={() => {
                            setCurrentPage(1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-3 py-1.5 rounded text-sm font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          1
                        </button>
                      );
                      
                      if (startPage > 2) {
                        pageNumbers.push(
                          <span key="ellipsis1" className="px-2 text-slate-500">...</span>
                        );
                      }
                    }
                    
                    // Visible page numbers
                    for (let i = startPage; i <= endPage; i++) {
                      pageNumbers.push(
                        <button
                          key={i}
                          onClick={() => {
                            setCurrentPage(i);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`px-3 py-1.5 rounded text-sm font-semibold border transition-colors ${
                            currentPage === i
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }
                    
                    // Last page
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pageNumbers.push(
                          <span key="ellipsis2" className="px-2 text-slate-500">...</span>
                        );
                      }
                      
                      pageNumbers.push(
                        <button
                          key={totalPages}
                          onClick={() => {
                            setCurrentPage(totalPages);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-3 py-1.5 rounded text-sm font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          {totalPages}
                        </button>
                      );
                    }
                    
                    return pageNumbers;
                  })()}
                </div>

                {/* Next Button */}
                <Button
                  onClick={() => {
                    setCurrentPage(currentPage + 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={currentPage * itemsPerPage >= displayedPains.length}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Next
                </Button>
              </div>
            )}
          </section>

          {/* Summary Cards - Right Column */}
          <aside className="lg:mt-[72px]">
            <div className="flex flex-col gap-3">
              <Card className="p-4 border-slate-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="size-5 text-red-600 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-2xl font-semibold text-slate-900 leading-none mb-0.5">{highSeverityCount}</div>
                    <h3 className="text-sm text-slate-600 mb-2">Perceived Severity (High)</h3>
                    {(() => {
                      if (!prevStats) {
                        return (
                          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                            <span>No prior period</span>
                          </div>
                        );
                      }
                      const delta = highSeverityCount - prevStats.highSeverityCount;
                      const isWorsening = delta > 0;
                      return delta !== 0 ? (
                        <div className={`flex items-center gap-1 text-xs font-semibold ${isWorsening ? 'text-red-600' : 'text-green-600'}`}>
                          {isWorsening ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                          <span>{Math.abs(delta)} from {prevLabel}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                          <span>No change from {prevLabel}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </Card>

              <Card className="p-4 border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="text-xl flex-shrink-0">🔗</div>
                  <div className="flex-1">
                    <div className="text-2xl font-semibold text-slate-900 leading-none mb-0.5">{crossAppPainsCount}</div>
                    <h3 className="text-sm text-slate-600 mb-2">Cross-App Issues</h3>
                    {(() => {
                      if (!prevStats) {
                        return (
                          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                            <span>No prior period</span>
                          </div>
                        );
                      }
                      const delta = crossAppPainsCount - prevStats.crossAppPainsCount;
                      const isWorsening = delta > 0;
                      return delta !== 0 ? (
                        <div className={`flex items-center gap-1 text-xs font-semibold ${isWorsening ? 'text-red-600' : 'text-green-600'}`}>
                          {isWorsening ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                          <span>{Math.abs(delta)} from {prevLabel}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                          <span>No change from {prevLabel}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </Card>

              <Card className="p-4 border-slate-200">
                <div className="flex items-start gap-3">
                  <Clock className="size-5 text-purple-600 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-2xl font-semibold text-slate-900 leading-none mb-0.5">{avgMonthsActiveDisplay}</div>
                    <h3 className="text-sm text-slate-600 mb-2">Avg Duration (mo)</h3>
                    {(() => {
                      if (!prevStats) {
                        return (
                          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                            <span>No prior period</span>
                          </div>
                        );
                      }
                      const delta = avgMonthsActive - prevStats.avgMonthsActive;
                      const isWorsening = delta > 0;
                      return Math.abs(delta) >= 0.1 ? (
                        <div className={`flex items-center gap-1 text-xs font-semibold ${isWorsening ? 'text-red-600' : 'text-green-600'}`}>
                          {isWorsening ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                          <span>{Math.abs(delta).toFixed(1)}mo from {prevLabel}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                          <span>No change from {prevLabel}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </Card>

              <Card className="p-4 border-slate-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="size-5 text-orange-600 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-2xl font-semibold text-slate-900 leading-none mb-0.5">{chronicCount}</div>
                    <h3 className="text-sm text-slate-600 mb-2">Chronic Issues</h3>
                    {(() => {
                      if (!prevStats) {
                        return (
                          <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                            <span>No prior period</span>
                          </div>
                        );
                      }
                      const delta = chronicCount - prevStats.chronicCount;
                      const isWorsening = delta > 0;
                      return delta !== 0 ? (
                        <div className={`flex items-center gap-1 text-xs font-semibold ${isWorsening ? 'text-red-600' : 'text-green-600'}`}>
                          {isWorsening ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                          <span>{Math.abs(delta)} from {prevLabel}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                          <span>No change from {prevLabel}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </Card>
            </div>
          </aside>
        </div>
      </div>

      {/* Detail Panel */}
      {detailPanelOpen && selectedPainForDetail && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" onClick={closeDetailPanel}>
          <div 
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {selectedPainForDetail.severity === 'high' && <AlertTriangle className="size-5 text-red-600" />}
                  {selectedPainForDetail.severity === 'medium' && <AlertCircle className="size-5 text-orange-600" />}
                  {selectedPainForDetail.severity === 'low' && <Info className="size-5 text-yellow-600" />}
                  <h2 className="text-slate-900">{selectedPainForDetail.title}</h2>
                </div>
                <p className="text-slate-600">{selectedPainForDetail.description}</p>
              </div>
              <button 
                onClick={closeDetailPanel}
                className="ml-4 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="size-6" />
              </button>
            </div>

            {/* Panel Content */}
            <div className="p-6 space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl bg-white p-5 border border-slate-200 shadow-sm">
                  <div className="text-sm text-slate-600 mb-1">Severity</div>
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-sm font-semibold ${
                    selectedPainForDetail.severity === 'high' ? 'bg-red-100 border-red-300 text-red-800' :
                    selectedPainForDetail.severity === 'medium' ? 'bg-orange-100 border-orange-300 text-orange-800' :
                    'bg-yellow-100 border-yellow-300 text-yellow-800'
                  }`}>
                    {selectedPainForDetail.severity === 'high' && <AlertTriangle className="size-3" />}
                    {selectedPainForDetail.severity === 'medium' && <AlertCircle className="size-3" />}
                    {selectedPainForDetail.severity === 'low' && <Info className="size-3" />}
                    {selectedPainForDetail.severity.charAt(0).toUpperCase() + selectedPainForDetail.severity.slice(1)}
                  </div>
                </div>

                <div className="rounded-xl bg-white p-5 border border-slate-200 shadow-sm">
                  <div className="text-sm text-slate-600 mb-1">Total Mentions</div>
                  <div className="text-2xl font-semibold text-slate-900">{selectedPainForDetail.totalMentions}</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {Math.round(selectedPainForDetail.percentage)}% of feedback
                  </div>
                  {selectedPainForDetail.estimatedMentionsCount > 0 && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      Includes {selectedPainForDetail.estimatedMentionsCount} estimated
                    </div>
                  )}
                </div>

                <div className="rounded-xl bg-white p-5 border border-slate-200 shadow-sm">
                  <div className="text-sm text-slate-600 mb-1">Duration</div>
                  <div className="text-2xl font-semibold text-slate-900">{selectedPainForDetail.monthsActive}</div>
                  <div className="text-xs text-slate-600 mt-0.5">months active</div>
                </div>

                <div className="rounded-xl bg-white p-5 border border-slate-200 shadow-sm">
                  <div className="text-sm text-slate-600 mb-1">Affected Apps</div>
                  <div className="text-2xl font-semibold text-slate-900">{selectedPainForDetail.affectedApps.length}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{selectedPainForDetail.affectedApps.length === 1 ? 'application' : 'applications'}</div>
                </div>
              </div>

              {/* Trend Chart */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Mentions Over Time</h3>
                <div className="border border-slate-200 rounded-lg p-4">
                    <div className="relative h-48">
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 bottom-8 w-12 pr-2 flex flex-col justify-between text-xs text-slate-600 text-right">
                      {[0, 1, 2, 3, 4].reverse().map((i) => {
                        const maxValue = Math.max(1, ...selectedPainTimeSeries.map(d => d.value));
                        const value = Math.round((maxValue / 4) * i);
                        return <span key={i}>{value}</span>;
                      })}
                    </div>
                    
                    {/* Chart */}
                    <div className="ml-14 h-full pb-8 pt-3">
                      <svg className="w-full h-full" viewBox="0 0 400 130" preserveAspectRatio="xMidYMid meet">
                        {/* Grid lines */}
                        {[0, 1, 2, 3, 4].map((i) => (
                          <line
                            key={i}
                            x1="0"
                            y1={18 + (i / 4) * 100}
                            x2="400"
                            y2={18 + (i / 4) * 100}
                            stroke="#e2e8f0"
                            strokeWidth="0.5"
                          />
                        ))}
                        
                        {/* Line */}
                        {(() => {
                          const trendData = selectedPainTimeSeries;
                          const maxValue = Math.max(1, ...trendData.map(d => d.value));
                          const color = selectedPainForDetail.severity === 'high' ? '#dc2626' : 
                                       selectedPainForDetail.severity === 'medium' ? '#ea580c' : 
                                       '#ca8a04';
                          
                          const points = trendData.map((d, i) => {
                            const x = trendData.length === 1 ? 200 : (i / (trendData.length - 1)) * 400;
                            const y = 18 + (100 - ((d.value / maxValue) * 100));
                            return `${x},${y}`;
                          }).join(' ');
                          
                          return (
                            <g>
                              <polyline
                                points={points}
                                fill="none"
                                stroke={color}
                                strokeWidth="2"
                              />
                              {/* Data points */}
                              {trendData.map((d, i) => {
                                const x = trendData.length === 1 ? 200 : (i / (trendData.length - 1)) * 400;
                                const y = 18 + (100 - ((d.value / maxValue) * 100));
                                return (
                                  <g key={i}>
                                    <circle
                                      cx={x}
                                      cy={y}
                                      r="5"
                                      fill={color}
                                    />
                                    <text
                                      x={x}
                                      y={Math.max(12, y - 8)}
                                    textAnchor={i === 0 ? 'start' : i === trendData.length - 1 ? 'end' : 'middle'}
                                    dx={i === 0 ? 4 : i === trendData.length - 1 ? -4 : 0}
                                    className="text-xs font-semibold fill-slate-700"
                                  >
                                    {d.value}
                                  </text>
                                  </g>
                                );
                              })}
                            </g>
                          );
                        })()}
                      </svg>
                      
                      {/* X-axis labels */}
                      <div className="flex justify-between px-1 mt-2 text-xs text-slate-600">
                        {selectedPainTimeSeries.map((segment, i) => (
                          <span key={i} className="text-center">{segment.label}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Trend indicator */}
                  <div className="mt-4 flex items-center gap-2">
                    {selectedPainForDetail.trendDirection === 'increasing' && (
                      <>
                        <TrendingUp className="size-4 text-red-600" />
                        <span className="text-sm text-slate-700">Increasing trend</span>
                        {selectedPainForDetail.trendPercentage && (
                          <span className="text-sm font-semibold text-red-600">+{selectedPainForDetail.trendPercentage}%</span>
                        )}
                      </>
                    )}
                    {selectedPainForDetail.trendDirection === 'decreasing' && (
                      <>
                        <TrendingDown className="size-4 text-green-600" />
                        <span className="text-sm text-slate-700">Decreasing trend</span>
                        {selectedPainForDetail.trendPercentage && (
                          <span className="text-sm font-semibold text-green-600">-{selectedPainForDetail.trendPercentage}%</span>
                        )}
                      </>
                    )}
                    {selectedPainForDetail.trendDirection === 'stable' && (
                      <>
                        <div className="w-4 h-0.5 bg-slate-400" />
                        <span className="text-sm text-slate-700">Stable trend</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Affected Applications */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Affected Applications</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedPainForDetail.affectedApps.map((app, index) => (
                    <div key={index} className="inline-flex items-center px-2.5 py-1.5 bg-slate-50 rounded border border-slate-200">
                      <span className="text-slate-900 text-sm">{app}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}