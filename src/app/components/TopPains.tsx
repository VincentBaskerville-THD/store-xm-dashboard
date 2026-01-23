import { useState, useEffect } from 'react';
import { ArrowLeft, FileDown, AlertTriangle, TrendingUp, TrendingDown, AlertCircle, Info, Link2, Clock, X, BarChart3, LineChart } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { TimePeriodData } from './TimeSelector';
import { TimeSelector } from './TimeSelector';
import { NavigationHeader } from './NavigationHeader';
import { mockApps, mockJourneys, markMock } from '../data/mockData';
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
  description: string;
  severity: 'high' | 'medium' | 'low';
}

// Mock pain data aggregated from themes across apps/journeys
const mockPainData: PainPoint[] = [
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
}: TopPainsProps) {
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [visualizationView, setVisualizationView] = useState<'both' | 'ranking' | 'trends'>('both');
  const [selectedPainForDetail, setSelectedPainForDetail] = useState<PainPoint | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset to page 1 when time period changes
  useEffect(() => {
    setCurrentPage(1);
  }, [timePeriod.period]);

  // Get time-period multiplier for data variation
  const getTimePeriodMultiplier = () => {
    if (timePeriod.format === 'month') {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthIndex = months.findIndex(m => timePeriod.period.includes(m));
      // Much more variation: 0.60 to 1.30, with specific patterns
      const baseMultipliers = [0.65, 0.72, 0.85, 0.90, 0.95, 1.02, 1.08, 1.15, 1.22, 1.18, 1.10, 1.05];
      return monthIndex >= 0 ? baseMultipliers[monthIndex] : 1.0;
    } else if (timePeriod.format === 'quarter') {
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      const quarterIndex = quarters.findIndex(q => timePeriod.period.includes(q));
      // Varying patterns: Q1 low, Q2 medium, Q3 high, Q4 medium-high
      const quarterMultipliers = [0.70, 0.90, 1.15, 1.05];
      return quarterIndex >= 0 ? quarterMultipliers[quarterIndex] : 1.0;
    } else if (timePeriod.format === 'year') {
      const years = ['2022', '2023', '2024', '2025'];
      const yearIndex = years.findIndex(y => timePeriod.period.includes(y));
      // Progressive increase over years
      const yearMultipliers = [0.65, 0.85, 1.05, 1.25];
      return yearIndex >= 0 ? yearMultipliers[yearIndex] : 1.0;
    }
    return 1.0;
  };

  const multiplier = getTimePeriodMultiplier();

  // Get previous period label and multiplier for comparisons
  const getPreviousPeriodInfo = () => {
    if (timePeriod.format === 'month') {
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const baseMultipliers = [0.65, 0.72, 0.85, 0.90, 0.95, 1.02, 1.08, 1.15, 1.22, 1.18, 1.10, 1.05];
      const currentIndex = months.findIndex(m => timePeriod.period.includes(m));
      if (currentIndex > 0) {
        const prevMonth = months[currentIndex - 1];
        return { label: prevMonth.slice(0, 3), multiplier: baseMultipliers[currentIndex - 1] };
      }
      // If January, compare to December of previous year
      return { label: 'Dec', multiplier: baseMultipliers[11] };
    } else if (timePeriod.format === 'quarter') {
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      const quarterMultipliers = [0.70, 0.90, 1.15, 1.05];
      const currentIndex = quarters.findIndex(q => timePeriod.period.includes(q));
      if (currentIndex > 0) {
        const prevQuarter = quarters[currentIndex - 1];
        return { label: prevQuarter, multiplier: quarterMultipliers[currentIndex - 1] };
      }
      // If Q1, compare to Q4 of previous year
      return { label: 'Q4', multiplier: quarterMultipliers[3] };
    } else if (timePeriod.format === 'year') {
      const years = ['2022', '2023', '2024', '2025'];
      const yearMultipliers = [0.65, 0.85, 1.05, 1.25];
      const currentIndex = years.findIndex(y => timePeriod.period.includes(y));
      if (currentIndex > 0) {
        const prevYear = years[currentIndex - 1];
        return { label: prevYear, multiplier: yearMultipliers[currentIndex - 1] };
      }
      // If 2022, compare to 2021
      return { label: '2021', multiplier: 0.50 };
    }
    return { label: 'prev', multiplier: 1.0 };
  };

  const previousPeriod = getPreviousPeriodInfo();

  // Calculate previous period statistics for comparison
  const getPreviousPeriodStats = () => {
    const prevData = mockPainData.map(pain => {
      const adjustedPercentage = Math.round(pain.percentage * previousPeriod.multiplier);
      const adjustedMentions = Math.round(pain.totalMentions * previousPeriod.multiplier);
      const adjustedMonthsActive = Math.max(1, Math.round(pain.monthsActive * (0.7 + previousPeriod.multiplier * 0.3)));
      
      // Dynamically determine severity based on adjusted percentage
      let adjustedSeverity: 'high' | 'medium' | 'low';
      if (adjustedPercentage >= 25) {
        adjustedSeverity = 'high';
      } else if (adjustedPercentage >= 15) {
        adjustedSeverity = 'medium';
      } else {
        adjustedSeverity = 'low';
      }
      
      // Dynamically determine trend based on multiplier
      let adjustedTrend: 'increasing' | 'decreasing' | 'stable';
      if (previousPeriod.multiplier > 1.10) {
        adjustedTrend = pain.percentage > 20 ? 'increasing' : 'stable';
      } else if (previousPeriod.multiplier < 0.80) {
        adjustedTrend = pain.percentage > 20 ? 'decreasing' : 'stable';
      } else {
        adjustedTrend = pain.trendDirection;
      }
      
      return {
        ...pain,
        percentage: adjustedPercentage,
        totalMentions: adjustedMentions,
        monthsActive: adjustedMonthsActive,
        severity: adjustedSeverity,
        trendDirection: adjustedTrend,
      };
    });

    // Apply same scope filtering
    let scopedPrevData = prevData;
    if (scopeFilter !== 'all') {
      const selectedApp = mockApps.find(app => app.id === scopeFilter);
      if (selectedApp) {
        scopedPrevData = prevData.filter(pain => 
          pain.affectedApps.includes(selectedApp.name)
        );
      } else {
        const selectedJourney = mockJourneys.find(journey => journey.id === scopeFilter);
        if (selectedJourney) {
          if (selectedJourney.name.includes('Returns')) {
            scopedPrevData = prevData.filter(pain => 
              pain.affectedApps.some(app => ['1Returns', 'Order Up', 'Inventory Manager', 'Customer Portal'].includes(app))
            );
          } else if (selectedJourney.name.includes('Order') || selectedJourney.name.includes('Fulfillment')) {
            scopedPrevData = prevData.filter(pain => 
              pain.affectedApps.some(app => ['Order Up', 'Fulfillment Hub', 'Shipping Manager', 'Inventory Manager'].includes(app))
            );
          }
        }
      }
    }

    return {
      highSeverity: scopedPrevData.filter(p => p.severity === 'high').length,
      crossApp: scopedPrevData.filter(p => p.affectedApps.length > 1).length,
      avgMonths: scopedPrevData.length > 0 
        ? scopedPrevData.reduce((sum, p) => sum + p.monthsActive, 0) / scopedPrevData.length
        : 0,
      longStanding: scopedPrevData.filter(p => p.monthsActive >= 12).length,
    };
  };

  const prevStats = getPreviousPeriodStats();

  // Get time-adjusted pain data
  const getTimeAdjustedPainData = (): PainPoint[] => {
    return mockPainData.map(pain => {
      // Adjust numeric values based on time multiplier
      const adjustedPercentage = Math.round(pain.percentage * multiplier);
      const adjustedMentions = Math.round(pain.totalMentions * multiplier);
      
      // Adjust monthsActive based on multiplier (higher multiplier = longer duration)
      const adjustedMonthsActive = Math.max(1, Math.round(pain.monthsActive * (0.7 + multiplier * 0.3)));
      
      // Dynamically determine severity based on adjusted percentage
      let adjustedSeverity: 'high' | 'medium' | 'low';
      if (adjustedPercentage >= 25) {
        adjustedSeverity = 'high';
      } else if (adjustedPercentage >= 15) {
        adjustedSeverity = 'medium';
      } else {
        adjustedSeverity = 'low';
      }
      
      // Dynamically determine trend based on multiplier changes
      let adjustedTrend: 'increasing' | 'decreasing' | 'stable';
      if (multiplier > 1.10) {
        adjustedTrend = pain.percentage > 20 ? 'increasing' : 'stable';
      } else if (multiplier < 0.80) {
        adjustedTrend = pain.percentage > 20 ? 'decreasing' : 'stable';
      } else {
        adjustedTrend = pain.trendDirection;
      }
      
      return {
        ...pain,
        percentage: adjustedPercentage,
        totalMentions: adjustedMentions,
        monthsActive: adjustedMonthsActive,
        severity: adjustedSeverity,
        trendDirection: adjustedTrend,
      };
    });
  };

  // Filter data by scope (app or journey)
  const getScopedPainData = (): PainPoint[] => {
    const timeAdjustedData = getTimeAdjustedPainData();
    
    if (scopeFilter === 'all') {
      return timeAdjustedData;
    }

    // Check if it's an app
    const selectedApp = mockApps.find(app => app.id === scopeFilter);
    if (selectedApp) {
      return timeAdjustedData.filter(pain => 
        pain.affectedApps.includes(selectedApp.name)
      );
    }

    // Check if it's a journey
    const selectedJourney = mockJourneys.find(journey => journey.id === scopeFilter);
    if (selectedJourney) {
      // For journeys, we'll filter by apps involved in that journey
      // For now, we'll use a simple heuristic based on journey type
      if (selectedJourney.name.includes('Returns')) {
        return timeAdjustedData.filter(pain => 
          pain.affectedApps.some(app => ['1Returns', 'Order Up', 'Inventory Manager', 'Customer Portal'].includes(app))
        );
      } else if (selectedJourney.name.includes('Order') || selectedJourney.name.includes('Fulfillment')) {
        return timeAdjustedData.filter(pain => 
          pain.affectedApps.some(app => ['Order Up', 'Fulfillment Hub', 'Shipping Manager', 'Inventory Manager'].includes(app))
        );
      }
    }

    return timeAdjustedData;
  };

  // Sort by severity and percentage
  const getDisplayedPains = () => {
    let pains = getScopedPainData();
    
    pains.sort((a, b) => {
      const severityWeight = { high: 3, medium: 2, low: 1 };
      if (severityWeight[b.severity] !== severityWeight[a.severity]) {
        return severityWeight[b.severity] - severityWeight[a.severity];
      }
      return b.percentage - a.percentage;
    });

    return pains;
  };

  const displayedPains = getDisplayedPains();

  // Calculate summary statistics based on scoped data
  const scopedData = getScopedPainData();
  const highSeverityCount = scopedData.filter(p => p.severity === 'high').length;
  const crossAppPainsCount = scopedData.filter(p => p.affectedApps.length > 1).length;
  const avgMonthsActive = scopedData.length > 0 
    ? (scopedData.reduce((sum, p) => sum + p.monthsActive, 0) / scopedData.length).toFixed(1)
    : '0.0';
  const longStandingCount = scopedData.filter(p => p.monthsActive >= 12).length;

  // Generate time-series data for trend chart
  const generateTrendData = (pain: PainPoint) => {
    const segments: { label: string; value: number }[] = [];
    
    if (timePeriod.format === 'month') {
      // Show 4 weeks
      for (let i = 1; i <= 4; i++) {
        const weekLabel = `W${i}`;
        // Create variation in data with overall trend
        const baseValue = pain.totalMentions / 4;
        let variation = 1.0;
        
        if (pain.trendDirection === 'increasing') {
          variation = 0.7 + (i * 0.15); // Starts lower, increases
        } else if (pain.trendDirection === 'decreasing') {
          variation = 1.3 - (i * 0.15); // Starts higher, decreases
        } else {
          variation = 0.9 + (Math.random() * 0.2); // Stable with slight variation
        }
        
        segments.push({ label: weekLabel, value: Math.round(baseValue * variation) });
      }
    } else if (timePeriod.format === 'quarter') {
      // Show 3 months
      const quarterMonths = ['Jan', 'Feb', 'Mar'];
      const currentQuarter = timePeriod.period.includes('Q1') ? 0 : 
                            timePeriod.period.includes('Q2') ? 1 : 
                            timePeriod.period.includes('Q3') ? 2 : 3;
      const monthNames = [
        ['Jan', 'Feb', 'Mar'],
        ['Apr', 'May', 'Jun'],
        ['Jul', 'Aug', 'Sep'],
        ['Oct', 'Nov', 'Dec']
      ][currentQuarter];
      
      for (let i = 0; i < 3; i++) {
        const baseValue = pain.totalMentions / 3;
        let variation = 1.0;
        
        if (pain.trendDirection === 'increasing') {
          variation = 0.7 + (i * 0.2);
        } else if (pain.trendDirection === 'decreasing') {
          variation = 1.3 - (i * 0.2);
        } else {
          variation = 0.9 + (Math.random() * 0.2);
        }
        
        segments.push({ label: monthNames[i], value: Math.round(baseValue * variation) });
      }
    } else if (timePeriod.format === 'year') {
      // Show 4 quarters
      for (let i = 1; i <= 4; i++) {
        const quarterLabel = `Q${i}`;
        const baseValue = pain.totalMentions / 4;
        let variation = 1.0;
        
        if (pain.trendDirection === 'increasing') {
          variation = 0.7 + (i * 0.15);
        } else if (pain.trendDirection === 'decreasing') {
          variation = 1.3 - (i * 0.15);
        } else {
          variation = 0.9 + (Math.random() * 0.2);
        }
        
        segments.push({ label: quarterLabel, value: Math.round(baseValue * variation) });
      }
    }
    
    return segments;
  };

  const handlePainClick = (pain: PainPoint) => {
    setSelectedPainForDetail(pain);
    setDetailPanelOpen(true);
  };

  const closeDetailPanel = () => {
    setDetailPanelOpen(false);
    setTimeout(() => setSelectedPainForDetail(null), 300);
  };

  // Get top 10 for ranking and top 5 for trends
  const top10Pains = displayedPains.slice(0, 10);
  const top5Pains = displayedPains.slice(0, 5);

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
        title="Top Pains"
        subtitle="Recurring pain points across applications"
        showExportButton={true}
      />

      {/* Time Period Selection */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <TimeSelector 
            value={timePeriod} 
            onChange={onTimePeriodChange}
            variant="light"
          />
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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
                <SelectValue placeholder="All Apps & Journeys" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Apps & Journeys</SelectItem>
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase">Apps</div>
                {mockApps.map((app) => (
                  <SelectItem key={app.id} value={app.id}>
                    {app.name}
                  </SelectItem>
                ))}
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase border-t border-slate-200 mt-1">Journeys</div>
                {mockJourneys.map((journey) => (
                  <SelectItem key={journey.id} value={journey.id}>
                    {journey.name}
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
              <p className="text-slate-600">Top issues and resolution progress</p>
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
                    <span className="text-sm text-slate-600">by frequency</span>
                  </div>
                  
                  <div className="space-y-3">
                    {top10Pains.map((pain, index) => {
                      const SeverityIcon = pain.severity === 'high' ? AlertTriangle : pain.severity === 'medium' ? AlertCircle : Info;
                      const maxMentions = top10Pains[0].totalMentions;
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
                              {markMock(pain.title)}
                            </span>
                            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              {pain.affectedApps.length} {pain.affectedApps.length === 1 ? 'app' : 'apps'}
                            </span>
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
                            <span className="absolute right-2 top-1 text-sm font-semibold text-slate-900">
                              {pain.totalMentions}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Trends View (Line Chart) */}
              {(visualizationView === 'both' || visualizationView === 'trends') && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Top 5 Trends Over Time</h3>
                    <span className="text-sm text-slate-600">within {timePeriod.period}</span>
                  </div>
                  
                  {/* Chart Area */}
                  <div className="relative h-64 border border-slate-200 rounded-lg p-4">
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-4 bottom-4 w-12 pr-2 flex flex-col justify-between text-xs text-slate-600 text-right">
                      {[0, 1, 2, 3, 4].reverse().map((i) => {
                        const maxValue = Math.max(...top5Pains.flatMap(p => generateTrendData(p).map(d => d.value)));
                        const value = Math.round((maxValue / 4) * i);
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
                          const trendData = generateTrendData(pain);
                          const maxValue = Math.max(...top5Pains.flatMap(p => generateTrendData(p).map(d => d.value)));
                          const SeverityIcon = pain.severity === 'high' ? AlertTriangle : pain.severity === 'medium' ? AlertCircle : Info;
                          const color = pain.severity === 'high' ? '#dc2626' : 
                                       pain.severity === 'medium' ? '#ea580c' : 
                                       '#ca8a04';
                          
                          const points = trendData.map((d, i) => {
                            const x = (i / (trendData.length - 1)) * 400;
                            const y = 100 - ((d.value / maxValue) * 100);
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
                              {trendData.map((d, i) => {
                                const x = (i / (trendData.length - 1)) * 400;
                                const y = 100 - ((d.value / maxValue) * 100);
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
                        {top5Pains.length > 0 && generateTrendData(top5Pains[0]).map((segment, i) => (
                          <span key={i} className="text-center">{segment.label}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="space-y-1.5">
                    {top5Pains.map((pain, index) => {
                      const SeverityIcon = pain.severity === 'high' ? AlertTriangle : pain.severity === 'medium' ? AlertCircle : Info;
                      const color = pain.severity === 'high' ? 'bg-red-500' : 
                                   pain.severity === 'medium' ? 'bg-orange-500' : 
                                   'bg-yellow-500';
                      
                      return (
                        <button
                          key={pain.id}
                          onClick={() => handlePainClick(pain)}
                          className="flex items-center gap-2 w-full text-left hover:bg-slate-50 p-1.5 rounded transition-colors"
                        >
                          <div className={`w-3 h-3 rounded-full ${color} flex-shrink-0`} />
                          <SeverityIcon className={`size-3 flex-shrink-0 ${
                            pain.severity === 'high' ? 'text-red-600' : 
                            pain.severity === 'medium' ? 'text-orange-600' : 
                            'text-yellow-600'
                          }`} />
                          <span className="text-sm text-slate-900 truncate flex-1">{markMock(pain.title)}</span>
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
              const severityLabel = pain.severity === 'high' ? 'High Severity' : pain.severity === 'medium' ? 'Medium Severity' : 'Low Severity';
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
                        <h3 className="font-semibold text-slate-900 flex-1">{markMock(pain.title)}</h3>
                        <span className="px-3 py-1 rounded bg-slate-100 text-slate-900 font-semibold text-sm whitespace-nowrap self-start">
                          {pain.percentage}% of feedback
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-700 text-xs font-semibold">
                          <Clock className="size-3" />
                          Active {pain.monthsActive} months
                        </span>

                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-semibold ${severityColors}`}>
                          <SeverityIcon className="size-3" />
                          {severityLabel}
                        </span>
                        
                        {pain.affectedApps.length > 1 && (
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
                        </span>
                      </div>

                      <p className="text-slate-700 mb-3">{pain.description}</p>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                        <span className="text-slate-600 font-semibold">Affected Apps:</span>
                        <span className="text-slate-700">{pain.affectedApps.join(', ')}</span>
                      </div>
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
                    const pageNumbers = [];
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
                    <h3 className="text-sm text-slate-600 mb-2">High Severity</h3>
                    {(() => {
                      const delta = highSeverityCount - prevStats.highSeverity;
                      const isWorsening = delta > 0;
                      return delta !== 0 ? (
                        <div className={`flex items-center gap-1 text-xs font-semibold ${isWorsening ? 'text-red-600' : 'text-green-600'}`}>
                          {isWorsening ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                          <span>{Math.abs(delta)} from {previousPeriod.label}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                          <span>No change from {previousPeriod.label}</span>
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
                      const delta = crossAppPainsCount - prevStats.crossApp;
                      const isWorsening = delta > 0;
                      return delta !== 0 ? (
                        <div className={`flex items-center gap-1 text-xs font-semibold ${isWorsening ? 'text-red-600' : 'text-green-600'}`}>
                          {isWorsening ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                          <span>{Math.abs(delta)} from {previousPeriod.label}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                          <span>No change from {previousPeriod.label}</span>
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
                    <div className="text-2xl font-semibold text-slate-900 leading-none mb-0.5">{avgMonthsActive}</div>
                    <h3 className="text-sm text-slate-600 mb-2">Avg Duration (mo)</h3>
                    {(() => {
                      const currentAvg = parseFloat(avgMonthsActive);
                      const delta = currentAvg - prevStats.avgMonths;
                      const isWorsening = delta > 0;
                      return Math.abs(delta) >= 0.1 ? (
                        <div className={`flex items-center gap-1 text-xs font-semibold ${isWorsening ? 'text-red-600' : 'text-green-600'}`}>
                          {isWorsening ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                          <span>{Math.abs(delta).toFixed(1)}mo from {previousPeriod.label}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                          <span>No change from {previousPeriod.label}</span>
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
                    <div className="text-2xl font-semibold text-slate-900 leading-none mb-0.5">{longStandingCount}</div>
                    <h3 className="text-sm text-slate-600 mb-2">Chronic Issues</h3>
                    {(() => {
                      const delta = longStandingCount - prevStats.longStanding;
                      const isWorsening = delta > 0;
                      return delta !== 0 ? (
                        <div className={`flex items-center gap-1 text-xs font-semibold ${isWorsening ? 'text-red-600' : 'text-green-600'}`}>
                          {isWorsening ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                          <span>{Math.abs(delta)} from {previousPeriod.label}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                          <span>No change from {previousPeriod.label}</span>
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
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
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

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="text-sm text-slate-600 mb-1">Total Mentions</div>
                  <div className="text-2xl font-semibold text-slate-900">{selectedPainForDetail.totalMentions}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{selectedPainForDetail.percentage}% of feedback</div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="text-sm text-slate-600 mb-1">Duration</div>
                  <div className="text-2xl font-semibold text-slate-900">{selectedPainForDetail.monthsActive}</div>
                  <div className="text-xs text-slate-600 mt-0.5">months active</div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="text-sm text-slate-600 mb-1">Affected Apps</div>
                  <div className="text-2xl font-semibold text-slate-900">{selectedPainForDetail.affectedApps.length}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{selectedPainForDetail.affectedApps.length === 1 ? 'application' : 'applications'}</div>
                </div>
              </div>

              {/* Trend Chart */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Frequency Over Time</h3>
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="relative h-48">
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 bottom-8 w-12 pr-2 flex flex-col justify-between text-xs text-slate-600 text-right">
                      {[0, 1, 2, 3, 4].reverse().map((i) => {
                        const trendData = generateTrendData(selectedPainForDetail);
                        const maxValue = Math.max(...trendData.map(d => d.value));
                        const value = Math.round((maxValue / 4) * i);
                        return <span key={i}>{value}</span>;
                      })}
                    </div>
                    
                    {/* Chart */}
                    <div className="ml-14 h-full pb-8 pt-3">
                      <svg className="w-full h-full" viewBox="0 0 400 110" preserveAspectRatio="xMidYMid meet">
                        {/* Grid lines */}
                        {[0, 1, 2, 3, 4].map((i) => (
                          <line
                            key={i}
                            x1="0"
                            y1={10 + (i / 4) * 100}
                            x2="400"
                            y2={10 + (i / 4) * 100}
                            stroke="#e2e8f0"
                            strokeWidth="0.5"
                          />
                        ))}
                        
                        {/* Line */}
                        {(() => {
                          const trendData = generateTrendData(selectedPainForDetail);
                          const maxValue = Math.max(...trendData.map(d => d.value));
                          const color = selectedPainForDetail.severity === 'high' ? '#dc2626' : 
                                       selectedPainForDetail.severity === 'medium' ? '#ea580c' : 
                                       '#ca8a04';
                          
                          const points = trendData.map((d, i) => {
                            const x = (i / (trendData.length - 1)) * 400;
                            const y = 10 + (100 - ((d.value / maxValue) * 100));
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
                                const x = (i / (trendData.length - 1)) * 400;
                                const y = 10 + (100 - ((d.value / maxValue) * 100));
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
                                      y={y - 8}
                                      textAnchor="middle"
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
                        {generateTrendData(selectedPainForDetail).map((segment, i) => (
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
                      <span className="text-slate-900 text-sm">{markMock(app)}</span>
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