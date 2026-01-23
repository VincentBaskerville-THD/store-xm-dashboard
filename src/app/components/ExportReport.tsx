import React, { useEffect, useRef, useState } from 'react';
import { FileDown, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { NavigationHeader } from './NavigationHeader';
import { getScoreColor } from '../data/mockData';
import coverLogo from '../../assets/71bf50b4d7c1892ebf535bcf9bb7a78918ae678b.png';
import hdLogoOrange from '../../assets/3d611e29ea932fa20dc7525d047ecf91f647d45e.png';
import { supabase } from '../lib/supabaseClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface ExportReportProps {
  onNavigateBack: () => void;
  onNavigateHome?: () => void;
  onNavigateAllApps?: () => void;
  onNavigateKeyJourneys?: () => void;
  onNavigateTopPains?: () => void;
  onNavigateAdmin?: () => void;
}

type ReportSection = 'scores' | 'journeys' | 'pains';
type TimePeriod = 'monthly' | 'quarterly' | 'annual';
type SortOrder = 'alphabetical' | 'score-desc' | 'score-asc' | 'trend';

interface ExportConfig {
  sections: {
    scores: boolean;
    journeys: boolean;
    pains: boolean;
  };
  scoresConfig: {
    selectedApps: string[];
    timePeriod: TimePeriod;
    selectedMonth: string | null;
    includeDetailPages: boolean;
    includeFeedbackThemes: boolean;
    groupByMetricsSystem: boolean;
    sortOrder: SortOrder;
  };
  journeysConfig: {
    selectedJourneys: string[];
    timePeriod: TimePeriod;
    includeStepBreakdown: boolean;
    includeContributingApps: boolean;
    sortOrder: SortOrder;
  };
  painsConfig: {
    categoryFilters: {
      negative: boolean;
      positive: boolean;
      mixed: boolean;
    };
    timePeriod: TimePeriod;
    minPercentage: number;
    maxThemesPerCategory: number;
    includeExampleComments: boolean;
    filterByApps: boolean;
  };
  exportFormat: 'pdf' | 'csv';
  reportTitle: string;
  reportAuthor: string;
  sectionOrder: ReportSection[];
}

type AppMetricsRow = {
  app_id: string;
  app_name: string | null;
  period: string;
  period_label: string | null;
  sort_order: number | null;
  overall_score: number | null;
  mom_pct_change?: number | null;
  qoq_pct_change?: number | null;
  yoy_pct_change?: number | null;
  ease_of_use_avg: number | null;
  usefulness_avg: number | null;
  ease_of_use_topbox_pct?: number | null;
  usefulness_topbox_pct?: number | null;
  response_count: number | null;
  resolved_metrics_system: string | null;
};

type ThemeObservationRow = {
  id: number;
  theme_id: string | null;
  percent_of_feedback: number | null;
  narrative: string | null;
  bullets: string[] | null;
  app_id: string | null;
  period: string | null;
};

type FeedbackTheme = {
  category: string;
  percentage: number;
  items: string[];
};

type AppQuarterRow = {
  app_id: string;
  period: string;
  period_label: string | null;
  sort_order: number | null;
  overall_score: number | null;
  ease_of_use_avg: number | null;
  usefulness_avg: number | null;
  ease_of_use_topbox_pct?: number | null;
  usefulness_topbox_pct?: number | null;
};

const normalizeMetricsSystem = (value: string | null): 'pendo' | 'medallia' =>
  value?.toLowerCase().includes('medallia') ? 'medallia' : 'pendo';

const getTrendFromChange = (value: number): 'up' | 'down' | 'stable' =>
  value > 0 ? 'up' : value < 0 ? 'down' : 'stable';

const getQuarterCodeFromMonth = (periodCode?: string | null) => {
  const match = periodCode?.match(/^FY(\d{2})-(\d{2})$/i);
  if (!match) return null;
  const fiscalYear = match[1];
  const month = Number(match[2]);
  if (Number.isNaN(month) || month < 1 || month > 12) return null;
  const quarter = Math.ceil(month / 3);
  return `FY${fiscalYear}-Q${quarter}`;
};

const getCompletedQuarterCodeFromMonth = (periodCode?: string | null) => {
  const match = periodCode?.match(/^FY(\d{2})-(\d{2})$/i);
  if (!match) return null;
  const fiscalYear = match[1];
  const month = Number(match[2]);
  if (Number.isNaN(month) || month < 1 || month > 12) return null;
  const fy = Number(fiscalYear);

  // Fiscal year starts in Feb; only use quarters that are fully complete
  let quarter: number;
  let yearForQuarter = fy;

  if (month === 1) {
    quarter = 4;
  } else if (month <= 3) {
    quarter = 4;
    yearForQuarter = fy - 1;
  } else if (month <= 6) {
    quarter = 1;
  } else if (month <= 9) {
    quarter = 2;
  } else {
    quarter = 3;
  }

  if (yearForQuarter < 0) return null;
  return `FY${String(yearForQuarter).padStart(2, '0')}-Q${quarter}`;
};

const buildQuarterWindow = (quarterCode?: string | null) => {
  const match = quarterCode?.match(/^FY(\d{2})-Q([1-4])$/i);
  if (!match) return null;
  const fy = Number(match[1]);
  const quarter = Number(match[2]);
  if (Number.isNaN(fy) || Number.isNaN(quarter)) return null;

  const window: Array<{ period: string; label: string }> = [];
  const endIndex = fy * 4 + (quarter - 1);
  for (let offset = 3; offset >= 0; offset -= 1) {
    const index = endIndex - offset;
    const windowFy = Math.floor(index / 4);
    const windowQuarter = (index % 4) + 1;
    const period = `FY${String(windowFy).padStart(2, '0')}-Q${windowQuarter}`;
    window.push({
      period,
      label: formatQuarterLabel(undefined, period),
    });
  }
  return window;
};

const getQuarterKeyFromPeriod = (period?: string | null) => {
  const match = period?.match(/^FY(\d{2})-Q([1-4])$/i);
  if (!match) return null;
  const fy = Number(match[1]);
  const quarter = Number(match[2]);
  if (Number.isNaN(fy) || Number.isNaN(quarter)) return null;
  const calendarYear = 2000 + fy - 1;
  return `${calendarYear}-Q${quarter}`;
};

const getQuarterKeyFromLabel = (label?: string | null) => {
  if (!label) return null;
  const match = label.match(/Q([1-4]).*?(\\d{2,4})/i);
  if (!match) return null;
  const quarter = Number(match[1]);
  const year = match[2].length === 2 ? Number(`20${match[2]}`) : Number(match[2]);
  if (Number.isNaN(year) || Number.isNaN(quarter)) return null;
  return `${year}-Q${quarter}`;
};

const buildQuarterKeyWindow = (quarterCode?: string | null) => {
  const match = quarterCode?.match(/^FY(\d{2})-Q([1-4])$/i);
  if (!match) return null;
  const fy = Number(match[1]);
  const quarter = Number(match[2]);
  if (Number.isNaN(fy) || Number.isNaN(quarter)) return null;
  const calendarYear = fy - 1;
  const endIndex = calendarYear * 4 + (quarter - 1);
  const window: string[] = [];
  for (let offset = 3; offset >= 0; offset -= 1) {
    const index = endIndex - offset;
    const year = Math.floor(index / 4);
    const q = (index % 4) + 1;
    window.push(`${year}-Q${q}`);
  }
  return window;
};

const getQuarterKeyFromMonthPeriod = (period?: string | null) => {
  const match = period?.match(/^FY(\d{2})-(\d{2})$/i);
  if (!match) return null;
  const fy = Number(match[1]);
  const month = Number(match[2]);
  if (Number.isNaN(fy) || Number.isNaN(month)) return null;
  const calendarYear = 2000 + fy - 1;
  const quarter = Math.ceil(month / 3);
  return `${calendarYear}-Q${quarter}`;
};

const getMonthPeriodsForQuarterKey = (quarterKey: string) => {
  const match = quarterKey.match(/^(\\d{4})-Q([1-4])$/);
  if (!match) return [];
  const calendarYear = Number(match[1]);
  const quarter = Number(match[2]);
  if (Number.isNaN(calendarYear) || Number.isNaN(quarter)) return [];
  const fiscalYear = calendarYear + 1;
  const fySuffix = String(fiscalYear).slice(2).padStart(2, '0');
  const monthStart = (quarter - 1) * 3 + 1;
  return [0, 1, 2].map((offset) => {
    const month = String(monthStart + offset).padStart(2, '0');
    return `FY${fySuffix}-${month}`;
  });
};

const formatQuarterLabel = (label?: string | null, period?: string) => {
  if (label) {
    const parts = label.split(' ');
    if (parts.length >= 2 && /^\d{4}$/.test(parts[1])) {
      return `${parts[0]} '${parts[1].slice(2)}`;
    }
    return label;
  }
  const fyMatch = period?.match(/FY(\d{2})-Q([1-4])/i);
  if (fyMatch) {
    const fyYear = Number(fyMatch[1]);
    if (Number.isNaN(fyYear)) return `Q${fyMatch[2]} '${fyMatch[1]}`;
    const calendarYear = fyYear - 1;
    return `Q${fyMatch[2]} '${String(calendarYear).padStart(2, '0')}`;
  }
  const match = period?.match(/Q([1-4]).*?(\\d{2,4})/i);
  if (match) {
    const year = match[2].length === 2 ? `20${match[2]}` : match[2];
    return `Q${match[1]} '${year.slice(2)}`;
  }
  return period ?? '';
};

// Home Depot brand colors
const HD_ORANGE = '#F96302';
const HD_DARK_GRAY = '#2D2D2D';

// PDF Page Templates
function CoverPage() {
  return (
    <div className="relative w-full aspect-[16/9] bg-black flex items-center justify-center">
      <img src={coverLogo} alt="Enterprise UX" className="w-[280px]" />
      
      {/* Home Depot Logo - bottom right */}
      <div className="absolute bottom-6 right-6">
        <img src={hdLogoOrange} alt="The Home Depot" className="h-10" />
      </div>
    </div>
  );
}

function TitlePage({ title, author, date }: { title: string; author: string; date: string }) {
  const titleLines = title.split('\n');
  return (
    <div className="relative w-full aspect-[16/9] bg-white flex title-page">
      {/* Left side - Title */}
      <div className="w-[46%] flex flex-col justify-center px-16 title-left">
        <div className="mb-6">
          <div className="w-16 h-1 bg-[#F96302] mb-6"></div>
          <h1 className="text-4xl font-normal leading-tight mb-2">
            {titleLines.map((line, index) => (
              <span
                key={`${line}-${index}`}
                className={`block ${line.includes('(XM)') ? 'whitespace-nowrap' : ''}`}
              >
                {line}
              </span>
            ))}
          </h1>
        </div>
        
        <div className="absolute bottom-12 left-16">
          <p className="text-lg font-normal mb-1">{author}</p>
          <p className="text-base text-gray-600">{date}</p>
        </div>
      </div>
      
      {/* Right side - Orange background */}
      <div className="w-[54%] bg-[#F96302] title-right"></div>
      
      {/* Home Depot Logo - bottom right */}
      <div className="absolute bottom-4 right-4">
        <img src={hdLogoOrange} alt="The Home Depot" className="h-12" />
      </div>
    </div>
  );
}

function DividerPage({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="relative w-full aspect-[16/9] bg-white flex flex-col">
      {/* Top - Orange background */}
      <div className="h-[52%] bg-[#F96302]"></div>
      
      {/* Bottom - Title */}
      <div className="h-[48%] flex flex-col items-center justify-center bg-white">
        <div className="w-24 h-1 bg-[#F96302] mb-8"></div>
        <h1 className="text-4xl font-bold mb-2">{title}</h1>
        <p className="text-xl text-gray-500">{subtitle}</p>
      </div>
      
      {/* Home Depot Logo - bottom right */}
      <div className="absolute bottom-4 right-4">
        <img src={hdLogoOrange} alt="The Home Depot" className="h-12" />
      </div>
    </div>
  );
}

function PortfolioTablePage({ 
  title, 
  month, 
  apps, 
  metricsSystem,
  highlights 
}: { 
  title: string; 
  month: string; 
  apps: any[]; 
  metricsSystem: 'Pendo' | 'Medallia';
  highlights: {
    goodCount: number;
    total: number;
    improvementCount: number;
    flatCount: number;
    declineCount: number;
  };
}) {
  return (
    <div className="relative w-full aspect-[16/9] bg-white flex">
      {/* Left Sidebar */}
      <div className="w-[20.5%] bg-[#2D2D2D] text-white px-6 py-5 flex flex-col">
        <h2 className="text-2xl font-bold mb-0.5">{title}</h2>
        <p className="text-xl font-bold mb-4">{month}</p>
        
        <div className="mb-3">
          <h3 className="text-sm font-bold mb-2 tracking-wide">HIGHLIGHTS</h3>
          
          <div className="mb-3">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-[#F96302] text-3xl font-bold">
                {Math.round((highlights.goodCount / highlights.total) * 100)}%
              </span>
              <span className="text-sm">({highlights.goodCount}/{highlights.total})</span>
            </div>
            <p className="text-sm leading-tight">
              of our experiences are <span className="font-bold">at-least 'Good'</span>; Scores <span className="italic">over 65 pts</span>
            </p>
          </div>
          
          <div className="mb-3">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-[#F96302] text-3xl font-bold">
                {Math.round((highlights.improvementCount / highlights.total) * 100)}%
              </span>
              <span className="text-sm">({highlights.improvementCount}/{highlights.total})</span>
            </div>
            <p className="text-sm leading-tight">
              of our experiences <span className="font-bold">'Needs Improvement'</span>; Scores <span className="italic">under 50pts</span>
            </p>
          </div>
          
          <div className="mb-3">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-[#F96302] text-3xl font-bold">
                {Math.round((highlights.flatCount / highlights.total) * 100)}%
              </span>
              <span className="text-sm">({highlights.flatCount}/{highlights.total})</span>
            </div>
            <p className="text-sm leading-tight">
              <span className="italic">almost all of our experiences are flat over the last 3 quarters</span> <span className="font-bold">{highlights.flatCount} ({highlights.total})</span> — are trending up <span className="font-bold">6% ({highlights.declineCount})</span> — is trending down
            </p>
          </div>
        </div>
        
        <div className="mt-auto text-xs">
          <p className="mb-1">*Based on <a href="https://portal.homedepot.com/sites/experiencemeasurement/SitePages/UX-Lite.aspx" target="_blank" rel="noopener noreferrer" className="text-[#F96302] italic hover:underline">UX-Lite Metric</a></p>
          <p className="italic"><a href="https://portal.homedepot.com/sites/experiencemeasurement/SitePages/UX-Lite.aspx" target="_blank" rel="noopener noreferrer" className="hover:underline">Metric Calculation</a></p>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 px-6 py-4">
        <p className="text-gray-500 italic text-base mb-1">Captured with {metricsSystem}</p>
        
        {/* Table */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="text-left py-1 pr-4 font-bold text-xs">Application</th>
              <th className="text-left py-1 px-3 font-bold text-xs">Overall Score*</th>
              <th className="text-left py-1 px-3 font-bold text-xs">Score MoM</th>
              <th className="text-left py-1 px-3 font-bold text-xs">Ease of Use</th>
              <th className="text-left py-1 px-3 font-bold text-xs">Usefulness</th>
              <th className="text-left py-1 px-3 font-bold text-xs">Responses</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((app, index) => (
              <tr key={app.id} className={index < apps.length - 1 ? 'border-b border-gray-200' : ''}>
                <td className="py-1 pr-4 text-sm">{app.name}</td>
                <td className={`py-1 px-3 font-bold text-base ${
                  app.overallScore >= 65 ? 'text-[#F96302]' : 
                  app.overallScore >= 50 ? 'text-[#F96302]' : 
                  'text-red-600'
                }`}>
                  {app.overallScore}
                </td>
                <td className={`py-1 px-3 font-bold text-sm ${
                  app.scoreMoM > 0 ? 'text-green-600' : 
                  app.scoreMoM < 0 ? 'text-red-600' : 
                  'text-gray-600'
                }`}>
                  {app.scoreMoM > 0 ? '+' : ''}{app.scoreMoM}%
                </td>
                <td className="py-1 px-3 text-sm">{app.easeOfUse.toFixed(1)}</td>
                <td className="py-1 px-3 text-sm">{app.usefulness.toFixed(1)}</td>
                <td className="py-1 px-3 text-sm">{app.responses.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <p className="text-green-600 text-xs italic mt-2">
          *Growth is compared to a previous month's data captured with {metricsSystem}
        </p>
      </div>
      
      {/* Home Depot Logo - bottom right */}
      <div className="absolute bottom-4 right-4">
        <img src={hdLogoOrange} alt="The Home Depot" className="h-12" />
      </div>
    </div>
  );
}

function AppDetailPage({
  app,
  selectedMonth,
  quarterSeries,
  topBox,
  quarterLabels,
  isQuarterLoading,
  monthLabelToCode,
}: {
  app: any;
  selectedMonth: string;
  quarterSeries: AppQuarterRow[];
  topBox: { ease: number | null; usefulness: number | null };
  quarterLabels: Array<{ period: string; label: string }>;
  isQuarterLoading: boolean;
  monthLabelToCode: Record<string, string>;
}) {
  const [feedbackThemes, setFeedbackThemes] = useState<FeedbackTheme[]>([]);
  const [themesLoading, setThemesLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const periodCode = monthLabelToCode[selectedMonth] ?? selectedMonth;

    if (!app?.id || !periodCode) {
      setFeedbackThemes([]);
      return () => {
        isMounted = false;
      };
    }

    const loadThemes = async () => {
      setThemesLoading(true);
      const { data, error } = await supabase
        .from('pain_observations')
        .select('id, theme_id, percent_of_feedback, narrative, bullets, app_id, period')
        .eq('app_id', app.id)
        .eq('period', periodCode)
        .order('percent_of_feedback', { ascending: false })
        .limit(6);

      if (!isMounted) return;

      if (error) {
        setFeedbackThemes([]);
        setThemesLoading(false);
        return;
      }

      const rows = (Array.isArray(data) ? data : []) as ThemeObservationRow[];
      const themeIds = rows
        .map((row) => row.theme_id)
        .filter((themeId): themeId is string => Boolean(themeId));

      let titleMap: Record<string, string> = {};
      if (themeIds.length > 0) {
        const { data: themeRows } = await supabase
          .from('themes')
          .select('id,title')
          .in('id', themeIds);

        if (Array.isArray(themeRows)) {
          titleMap = themeRows.reduce((acc, row) => {
            if (row?.id) acc[row.id] = row.title ?? 'Untitled Theme';
            return acc;
          }, {} as Record<string, string>);
        }
      }

      const mapped = rows.map((row) => {
        const bullets = Array.isArray(row.bullets) ? row.bullets.filter(Boolean) : [];
        const items = bullets.length > 0 ? bullets : row.narrative ? [row.narrative] : [];
        return {
          category: titleMap[row.theme_id ?? ''] ?? 'Untitled Theme',
          percentage: row.percent_of_feedback ?? 0,
          items,
        };
      });

      setFeedbackThemes(mapped);
      setThemesLoading(false);
    };

    void loadThemes();

    return () => {
      isMounted = false;
    };
  }, [app?.id, monthLabelToCode, selectedMonth]);

  const showQuarterLoading = isQuarterLoading && quarterSeries.length === 0;
  const fallbackQuarterLabel = formatQuarterLabel(undefined, undefined) || 'Q4';
  const baseLabels =
    quarterLabels.length === 4
      ? quarterLabels
      : quarterSeries.slice(-4).map((row) => ({
          period: row.period,
          label: formatQuarterLabel(row.period_label, row.period),
        }));
  const quarterLabelMap = new Map(
    quarterSeries.map((row) => [formatQuarterLabel(row.period_label, row.period), row])
  );
  const quarterPeriodMap = new Map(quarterSeries.map((row) => [row.period, row]));
  const mappedFromLabels =
    baseLabels.length > 0
      ? baseLabels.map((label) => {
          const row = quarterLabelMap.get(label.label) ?? quarterPeriodMap.get(label.period);
          return {
            quarter: label.label,
            overallScore: row?.overall_score ?? null,
            easeOfUseMean: row?.ease_of_use_avg ?? null,
            usefulnessMean: row?.usefulness_avg ?? null,
          };
        })
      : [];

  const hasAnyValues = mappedFromLabels.some(
    (row) => row.overallScore !== null || row.easeOfUseMean !== null || row.usefulnessMean !== null
  );
  const fallbackFromSeries =
    quarterSeries.length > 0
      ? quarterSeries.slice(-4).map((row) => ({
          quarter: formatQuarterLabel(row.period_label, row.period),
          overallScore: row.overall_score ?? null,
          easeOfUseMean: row.ease_of_use_avg ?? null,
          usefulnessMean: row.usefulness_avg ?? null,
        }))
      : [];

  const quarterlyData =
    mappedFromLabels.length > 0 && hasAnyValues
      ? mappedFromLabels
      : fallbackFromSeries.length > 0
        ? fallbackFromSeries
        : [
            {
              quarter: fallbackQuarterLabel,
              overallScore: app.overallScore,
              easeOfUseMean: app.easeOfUse,
              usefulnessMean: app.usefulness,
            },
          ];

  const easeOfUseTopBox = topBox.ease;
  const usefulnessTopBox = topBox.usefulness;


  // Chart dimensions - adjusted for tighter fit
  const chartWidth = 320;
  const chartHeight = 150;
  const chartPadding = { top: 15, right: 25, bottom: 35, left: 50 };

  // Overall Score Chart (with Target line at 80)
  const renderOverallScoreChart = () => {
    const maxScore = 100;
    const minScore = 0;
    const targetScore = 80;
    const dataPoints = quarterlyData;

    const xStep =
      (chartWidth - chartPadding.left - chartPadding.right) / Math.max(dataPoints.length - 1, 1);
    const yScale = (score: number) => {
      const range = chartHeight - chartPadding.top - chartPadding.bottom;
      return chartPadding.top + range - ((score - minScore) / (maxScore - minScore)) * range;
    };

    const targetY = yScale(targetScore);

    return (
      <div className="flex flex-col items-center">
        <h3 className="text-lg font-bold mb-0 text-center">Overall Score</h3>
        <svg width={chartWidth} height={chartHeight} className="bg-white">
          {/* Lighter grid lines - horizontal (4 lines: 0, 40, 80, 100) */}
          {[0, 40, 80, 100].map(val => {
            const y = yScale(val);
            return (
              <line 
                key={val}
                x1={chartPadding.left} 
                y1={y} 
                x2={chartWidth - chartPadding.right} 
                y2={y} 
                stroke="#e5e7eb" 
                strokeWidth="0.5"
              />
            );
          })}
          
          {/* Lighter grid lines - vertical (8 lines including edges) */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
            const x = chartPadding.left + (i * (chartWidth - chartPadding.left - chartPadding.right) / 7);
            return (
              <line 
                key={i}
                x1={x} 
                y1={chartPadding.top} 
                x2={x} 
                y2={chartHeight - chartPadding.bottom} 
                stroke="#e5e7eb" 
                strokeWidth="0.5"
              />
            );
          })}
          
          {/* Border only */}
          <rect 
            x={chartPadding.left} 
            y={chartPadding.top} 
            width={chartWidth - chartPadding.left - chartPadding.right} 
            height={chartHeight - chartPadding.top - chartPadding.bottom}
            fill="none"
            stroke="#333"
            strokeWidth="1"
          />
          
          {/* Target line (teal/cyan) */}
          <line 
            x1={chartPadding.left} 
            y1={targetY} 
            x2={chartWidth - chartPadding.right} 
            y2={targetY} 
            stroke="#5eead4" 
            strokeWidth="1.5"
          />
          <text x={chartPadding.left + 5} y={targetY - 5} fontSize="12" fill="#333" fontStyle="italic">Target</text>
          
          {/* Data line */}
          <polyline
            points={dataPoints
              .map((d, i) => {
                if (d.overallScore === null) return null;
              const x = chartPadding.left + i * xStep;
              const y = yScale(d.overallScore);
              return `${x},${y}`;
              })
              .filter(Boolean)
              .join(' ')}
            fill="none"
            stroke="#F96302"
            strokeWidth="2.5"
          />
          
          {/* Data points with values */}
          {dataPoints.map((d, i) => {
            const x = chartPadding.left + i * xStep;
            if (d.overallScore === null) return null;
            const y = yScale(d.overallScore);
            const showLabel = i === dataPoints.length - 1 || i < 3;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="5" fill="#F96302" />
                {showLabel && (
                  <text x={x} y={y - 12} fontSize="18" textAnchor="middle" fontWeight="bold" fill="#333">{d.overallScore}</text>
                )}
              </g>
            );
          })}
          
          {/* X-axis labels */}
          {dataPoints.map((d, i) => {
            const x = chartPadding.left + i * xStep;
            return (
              <text key={i} x={x} y={chartHeight - chartPadding.bottom + 22} fontSize="12" textAnchor="middle" fill="#666">{d.quarter}</text>
            );
          })}
          
          {/* Y-axis labels */}
          {[0, 20, 40, 60, 80, 100].map(val => {
            const y = yScale(val);
            return (
              <text key={val} x={chartPadding.left - 10} y={y + 4} fontSize="12" textAnchor="end" fill="#666">{val}</text>
            );
          })}
        </svg>
      </div>
    );
  };

  // Mean Score Chart (for Ease of Use and Usefulness)
  const renderMeanScoreChart = (dataKey: 'easeOfUseMean' | 'usefulnessMean', title: string) => {
    const maxScore = 5;
    const minScore = 1;
    const dataPoints = quarterlyData;

    const xStep =
      (chartWidth - chartPadding.left - chartPadding.right) / Math.max(dataPoints.length - 1, 1);
    const yScale = (score: number) => {
      const range = chartHeight - chartPadding.top - chartPadding.bottom;
      return chartPadding.top + range - ((score - minScore) / (maxScore - minScore)) * range;
    };

    return (
      <div className="flex flex-col items-center">
        <h3 className="text-lg font-bold mb-1 text-center">{title}</h3>
        <svg width={chartWidth} height={chartHeight} className="bg-white">
          {/* Lighter grid lines - horizontal (4 lines at 1, 2, 3, 4, 5) */}
          {[1, 2, 3, 4, 5].map(val => {
            const y = yScale(val);
            return (
              <line 
                key={val}
                x1={chartPadding.left} 
                y1={y} 
                x2={chartWidth - chartPadding.right} 
                y2={y} 
                stroke="#e5e7eb" 
                strokeWidth="0.5"
              />
            );
          })}
          
          {/* Lighter grid lines - vertical (8 lines) */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
            const x = chartPadding.left + (i * (chartWidth - chartPadding.left - chartPadding.right) / 7);
            return (
              <line 
                key={i}
                x1={x} 
                y1={chartPadding.top} 
                x2={x} 
                y2={chartHeight - chartPadding.bottom} 
                stroke="#e5e7eb" 
                strokeWidth="0.5"
              />
            );
          })}
          
          {/* Border only */}
          <rect 
            x={chartPadding.left} 
            y={chartPadding.top} 
            width={chartWidth - chartPadding.left - chartPadding.right} 
            height={chartHeight - chartPadding.top - chartPadding.bottom}
            fill="none"
            stroke="#333"
            strokeWidth="1"
          />
          
          {/* Data line - GRAY color for mean charts */}
          <polyline
            points={dataPoints
              .map((d, i) => {
                const value = d[dataKey];
                if (value === null) return null;
              const x = chartPadding.left + i * xStep;
                const y = yScale(value);
              return `${x},${y}`;
              })
              .filter(Boolean)
              .join(' ')}
            fill="none"
            stroke="#6b7280"
            strokeWidth="2.5"
          />
          
          {/* Data points with values */}
          {dataPoints.map((d, i) => {
            const x = chartPadding.left + i * xStep;
            const value = d[dataKey];
            if (value === null) return null;
            const y = yScale(value);
            const showLabel = i === dataPoints.length - 1 || i < 3;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="5" fill="#F96302" />
                {showLabel && (
                  <text x={x} y={y - 12} fontSize="18" textAnchor="middle" fontWeight="bold" fill="#333">{value.toFixed(1)}</text>
                )}
              </g>
            );
          })}
          
          {/* X-axis labels */}
          {dataPoints.map((d, i) => {
            const x = chartPadding.left + i * xStep;
            return (
              <text key={i} x={x} y={chartHeight - chartPadding.bottom + 22} fontSize="12" textAnchor="middle" fill="#666">{d.quarter}</text>
            );
          })}
          
          {/* Y-axis labels */}
          {[1, 2, 3, 4, 5].map(val => {
            const y = yScale(val);
            return (
              <text key={val} x={chartPadding.left - 10} y={y + 4} fontSize="12" textAnchor="end" fill="#666">{val}</text>
            );
          })}
          
          {/* Y-axis label */}
          <text 
            x={18} 
            y={chartHeight / 2} 
            fontSize="11" 
            textAnchor="middle"
            fill="#666"
            transform={`rotate(-90, 18, ${chartHeight / 2})`}
          >
            Mean (1-5)
          </text>
        </svg>
      </div>
    );
  };

  return (
    <div className="relative w-full aspect-[16/9] bg-white flex">
      {/* Left Sidebar - 17% width */}
      <div className="w-[17%] bg-[#2D2D2D] text-white px-5 py-5 flex flex-col items-center text-center">
        <h2 className="text-[22px] font-bold mb-2 leading-tight">{app.name}</h2>
        <p className="text-lg font-bold mb-6">{selectedMonth}</p>
        
        <div className="mb-6">
          <p className="text-[11px] text-white mb-2">Overall Score*</p>
          <p className="text-5xl font-bold leading-none">
            <span className="text-[#F96302]">{app.overallScore}</span>
            <span className="text-gray-400 text-2xl">/100</span>
          </p>
        </div>
        
        <div className="space-y-6 mb-6 w-full">
          <div>
            <p className="text-4xl font-bold leading-none mb-2">
              <span className="text-[#F96302]">
                {easeOfUseTopBox === null ? '--' : `${easeOfUseTopBox}%`}
              </span>
            </p>
            <p className="text-sm leading-snug mb-1">
              find this product
            </p>
            <p className="text-base leading-snug mb-2">
              <span className="text-[#F96302] font-bold">easy to use</span>
            </p>
            <p className="text-2xl font-bold">
              {app.easeOfUse.toFixed(1)}
              <span className="text-gray-400 text-sm font-normal">/5</span>
            </p>
          </div>
          
          <div>
            <p className="text-4xl font-bold leading-none mb-2">
              <span className="text-[#F96302]">
                {usefulnessTopBox === null ? '--' : `${usefulnessTopBox}%`}
              </span>
            </p>
            <p className="text-sm leading-snug mb-1">
              find this product
            </p>
            <p className="text-base leading-snug mb-2">
              <span className="text-[#F96302] font-bold">useful</span>
            </p>
            <p className="text-2xl font-bold">
              {app.usefulness.toFixed(1)}
              <span className="text-gray-400 text-sm font-normal">/5</span>
            </p>
          </div>
          
          <div className="pt-1">
            <p className="text-sm text-gray-400">{app.responses.toLocaleString()} Responses</p>
          </div>
        </div>
        
        <div className="mt-auto text-[10px] text-gray-400">
          <p className="mb-0.5">*Based on <a href="https://portal.homedepot.com/sites/experiencemeasurement/SitePages/UX-Lite.aspx" target="_blank" rel="noopener noreferrer" className="text-[#F96302] hover:underline">UX-Lite Metric</a></p>
          <p><a href="https://portal.homedepot.com/sites/experiencemeasurement/SitePages/UX-Lite.aspx" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Metric Calculation</a></p>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Middle - Charts (45% of remaining width) */}
        <div className="relative w-[45%] px-6 pt-[18px] pb-3 flex flex-col gap-3 justify-start">
          {showQuarterLoading && (
            <div className="absolute left-6 top-2 text-xs text-slate-500">
              Loading quarterly trends…
            </div>
          )}
          {/* Overall Score Chart */}
          <div>
            {renderOverallScoreChart()}
          </div>
          
          {/* Easy to Use Chart */}
          <div>
            {renderMeanScoreChart('easeOfUseMean', 'Ease of Use')}
          </div>
          
          {/* Usefulness Chart */}
          <div>
            {renderMeanScoreChart('usefulnessMean', 'Usefulness')}
          </div>
        </div>
        
        {/* Right - Feedback Themes (55% of remaining width) */}
        <div className="w-[55%] px-8 py-6 border-l border-gray-200">
          <div className="mb-6">
            <h3 className="text-xl font-bold tracking-wide text-center mb-1">DECEMBER FEEDBACK THEMES</h3>
            <p className="text-xs text-gray-500 text-center">
              AI Supported Summary
              {(app.isKTLO || app.noUX) && (
                <span>
                  {' | '}
                  {app.isKTLO && app.noUX ? 'KTLO & No UX' : app.isKTLO ? 'KTLO' : 'No UX'}
                </span>
              )}
            </p>
          </div>
          
          <div className="space-y-4">
            {feedbackThemes.map((theme, index) => (
              <div key={index}>
                {/* Category Header - Orange bar on left with inline percentage */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1 h-5 bg-[#F96302] rounded-sm"></div>
                  <h4 className="text-base font-bold flex-1">
                    {theme.category} <span className="font-bold">({theme.percentage}%)</span>
                  </h4>
                </div>
                
                {/* Bullet points with orange rectangle bullets */}
                <ul className="space-y-1.5 ml-5">
                  {theme.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="text-sm leading-relaxed flex items-start gap-2">
                      <span className="w-2 h-2 bg-[#F96302] rounded-sm mt-1.5 flex-shrink-0"></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Home Depot Logo - bottom right */}
      <div className="absolute bottom-4 right-4">
        <img src={hdLogoOrange} alt="The Home Depot" className="h-12" />
      </div>
    </div>
  );
}

export function ExportReport({
  onNavigateBack,
  onNavigateHome,
  onNavigateAllApps,
  onNavigateKeyJourneys,
  onNavigateTopPains,
  onNavigateAdmin,
}: ExportReportProps) {
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [config, setConfig] = useState<ExportConfig>({
    sections: {
      scores: true,
      journeys: false,
      pains: false,
    },
    scoresConfig: {
      selectedApps: [],
      timePeriod: 'monthly',
      selectedMonth: null,
      includeDetailPages: true,
      includeFeedbackThemes: true,
      groupByMetricsSystem: true,
      sortOrder: 'alphabetical',
    },
    journeysConfig: {
      selectedJourneys: [],
      timePeriod: 'monthly',
      includeStepBreakdown: true,
      includeContributingApps: true,
      sortOrder: 'alphabetical',
    },
    painsConfig: {
      categoryFilters: {
        negative: true,
        positive: true,
        mixed: true,
      },
      timePeriod: 'monthly',
      minPercentage: 5,
      maxThemesPerCategory: 10,
      includeExampleComments: true,
      filterByApps: false,
    },
    exportFormat: 'pdf',
    reportTitle: 'Store Systems\\nExperience Metrics (XM)',
    reportAuthor: 'Vincent Baskerville',
    sectionOrder: ['scores', 'journeys', 'pains'],
  });

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    scores: true,
    journeys: false,
    pains: false,
  });

  const [exportApps, setExportApps] = useState<
    Array<{
      id: string;
      name: string;
      overallScore: number;
      scoreMoM: number;
      easeOfUse: number;
      usefulness: number;
      responses: number;
      trend: 'up' | 'down' | 'stable';
      metricsSystem: 'pendo' | 'medallia';
      isKTLO?: boolean;
      noUX?: boolean;
    }>
  >([]);
  const [metricsPeriodLabel, setMetricsPeriodLabel] = useState<string | null>(null);
  const [isMetricsLoading, setIsMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [hasCustomAppSelection, setHasCustomAppSelection] = useState(false);
  const [appQuarterSeries, setAppQuarterSeries] = useState<Record<string, AppQuarterRow[]>>({});
  const [appTopBox, setAppTopBox] = useState<Record<string, { ease: number | null; usefulness: number | null }>>({});
  const [quarterLabels, setQuarterLabels] = useState<Array<{ period: string; label: string }>>([]);
  const [isQuarterLoading, setIsQuarterLoading] = useState(false);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [monthLabelToCode, setMonthLabelToCode] = useState<Record<string, string>>({});
  const [hasInitializedMonth, setHasInitializedMonth] = useState(false);

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const toggleSection = (section: string) => {
    if (section === 'journeys' || section === 'pains') return;
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const updateConfig = (updates: Partial<ExportConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const updateScoresConfig = (updates: Partial<ExportConfig['scoresConfig']>) => {
    setConfig(prev => ({
      ...prev,
      scoresConfig: { ...prev.scoresConfig, ...updates },
    }));
  };

  const toggleApp = (appId: string) => {
    setHasCustomAppSelection(true);
    const currentApps = config.scoresConfig.selectedApps;
    const newApps = currentApps.includes(appId)
      ? currentApps.filter(id => id !== appId)
      : [...currentApps, appId];
    updateScoresConfig({ selectedApps: newApps });
  };

  const toggleAllApps = () => {
    setHasCustomAppSelection(true);
    const allSelected = config.scoresConfig.selectedApps.length === exportApps.length;
    updateScoresConfig({ selectedApps: allSelected ? [] : exportApps.map(app => app.id) });
  };

  useEffect(() => {
    let isMounted = true;
    const loadAvailableMonths = async () => {
      const { data, error } = await supabase
        .from('v_app_metrics_trends')
        .select('period, period_label, sort_order')
        .order('sort_order', { ascending: false });

      if (!isMounted) return;

      if (error) {
        setAvailableMonths([]);
        setMonthLabelToCode({});
        return;
      }

      const nextLabels: string[] = [];
      const labelMap: Record<string, string> = {};

      (data ?? []).forEach((row) => {
        if (!row.period) return;
        const label = row.period_label ?? row.period;
        if (!labelMap[label]) {
          nextLabels.push(label);
          labelMap[label] = row.period;
        }
      });

      setAvailableMonths(nextLabels);
      setMonthLabelToCode(labelMap);

      if (!hasInitializedMonth && nextLabels.length > 0) {
        updateScoresConfig({ selectedMonth: nextLabels[0] });
        setHasInitializedMonth(true);
      }
    };

    loadAvailableMonths();

    const loadExportApps = async () => {
      setIsMetricsLoading(true);
      setMetricsError(null);

      const viewName = 'v_app_metrics_trends';
      const selectedLabel = config.scoresConfig.selectedMonth;
      const selectedPeriodCode = selectedLabel ? monthLabelToCode[selectedLabel] : undefined;

      if (!selectedLabel || !selectedPeriodCode) {
        setExportApps([]);
        setMetricsPeriodLabel(null);
        setIsMetricsLoading(false);
        return;
      }

      const baseSelect =
        'app_id, app_name, period, period_label, sort_order, overall_score, mom_pct_change, qoq_pct_change, yoy_pct_change, ease_of_use_avg, usefulness_avg, ease_of_use_topbox_pct, usefulness_topbox_pct, response_count, resolved_metrics_system';

      const buildQuery = (field: 'period' | 'period_label', value: string) =>
        supabase.from(viewName).select(baseSelect).eq(field, value).order('app_name', { ascending: true });

      let { data: rows, error: rowsError } = await buildQuery('period', selectedPeriodCode);

      if (!rowsError && (!rows || rows.length === 0)) {
        const retry = await buildQuery('period_label', selectedLabel);
        if (!retry.error && retry.data && retry.data.length > 0) {
          rows = retry.data;
        } else if (retry.error && !rowsError) {
          rowsError = retry.error;
        }
      }

      if (!isMounted) return;

      if (rowsError) {
        setMetricsError(rowsError.message ?? 'Failed to load app metrics.');
        setExportApps([]);
        setMetricsPeriodLabel(null);
        setIsMetricsLoading(false);
        return;
      }

      const appIds = Array.from(new Set((rows ?? []).map((row: AppMetricsRow) => row.app_id)));
      let appFlags: Record<string, { isKTLO: boolean; noUX: boolean }> = {};

      if (appIds.length > 0) {
        const { data: appFlagRows, error: appFlagsError } = await supabase
          .from('apps')
          .select('id,is_ktlo,no_ux')
          .in('id', appIds);

        if (appFlagsError) {
          console.warn('Failed to load app flags:', appFlagsError.message);
        } else if (Array.isArray(appFlagRows)) {
          appFlags = appFlagRows.reduce((acc, row) => {
            acc[row.id] = {
              isKTLO: Boolean(row.is_ktlo),
              noUX: Boolean(row.no_ux),
            };
            return acc;
          }, {} as Record<string, { isKTLO: boolean; noUX: boolean }>);
        }
      }

      const mappedApps = (rows ?? []).map((row: AppMetricsRow) => {
        const changeValue = Number(row.mom_pct_change ?? 0);
        const flags = appFlags[row.app_id];

        return {
          id: row.app_id,
          name: row.app_name ?? row.app_id ?? 'Unknown',
          overallScore: row.overall_score ?? 0,
          scoreMoM: changeValue,
          easeOfUse: Number(row.ease_of_use_avg ?? 0),
          usefulness: Number(row.usefulness_avg ?? 0),
          responses: row.response_count ?? 0,
          trend: getTrendFromChange(changeValue),
          metricsSystem: normalizeMetricsSystem(row.resolved_metrics_system),
          isKTLO: flags?.isKTLO ?? false,
          noUX: flags?.noUX ?? false,
        };
      });

      const topBoxMap: Record<string, { ease: number | null; usefulness: number | null }> = {};
      (rows ?? []).forEach((row: AppMetricsRow) => {
        topBoxMap[row.app_id] = {
          ease: row.ease_of_use_topbox_pct ?? null,
          usefulness: row.usefulness_topbox_pct ?? null,
        };
      });

      setExportApps(mappedApps);
      setAppTopBox(topBoxMap);
      setMetricsPeriodLabel(selectedLabel);
      setIsMetricsLoading(false);

      if (!hasCustomAppSelection) {
        updateScoresConfig({ selectedApps: mappedApps.map(app => app.id) });
      }
    };

    loadExportApps();

    return () => {
      isMounted = false;
    };
  }, [
    config.scoresConfig.selectedMonth,
    config.scoresConfig.timePeriod,
    hasCustomAppSelection,
    hasInitializedMonth,
    monthLabelToCode,
  ]);

  useEffect(() => {
    const baseWidth = 1100;
    const padding = 64;

    const updateScale = () => {
      const panelWidth = previewPanelRef.current?.clientWidth ?? 0;
      if (!panelWidth) return;
      const nextScale = (panelWidth - padding) / baseWidth;
      setPreviewScale(Number.isFinite(nextScale) && nextScale > 0 ? Math.min(1, nextScale) : 1);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
    };
  }, []);


  useEffect(() => {
    let isMounted = true;
    const selectedIds =
      config.scoresConfig.selectedApps.length > 0
        ? config.scoresConfig.selectedApps
        : exportApps.map(app => app.id);

    if (selectedIds.length === 0) {
      setAppQuarterSeries({});
      setAppTopBox({});
      setIsQuarterLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadQuarterSeries = async () => {
      setIsQuarterLoading(true);
      const selectedMonthLabel = config.scoresConfig.selectedMonth;
      const selectedMonthCode = selectedMonthLabel ? monthLabelToCode[selectedMonthLabel] : null;
      if (!selectedMonthCode) {
        setIsQuarterLoading(false);
        return;
      }
      const targetQuarterCode =
        getQuarterCodeFromMonth(selectedMonthCode) ?? getCompletedQuarterCodeFromMonth(selectedMonthCode);
      if (!targetQuarterCode) {
        setQuarterLabels([]);
        setAppQuarterSeries({});
        setIsQuarterLoading(false);
        return;
      }

      let windowPeriods: string[] = [];
      let windowLabels: string[] = [];
      const computedWindow = buildQuarterWindow(targetQuarterCode);
      if (computedWindow && computedWindow.length === 4) {
        windowPeriods = computedWindow.map((item) => item.period);
        windowLabels = computedWindow.map((item) => item.label);
        setQuarterLabels(computedWindow);
      } else {
        setQuarterLabels([]);
      }
      if (windowPeriods.length === 0) {
        const { data: periodRows, error: periodError } = await supabase
          .from('v_app_quarter_metrics')
          .select('period, period_label, sort_order')
          .order('sort_order', { ascending: true });

        if (!isMounted) return;

        if (periodError) {
          setQuarterLabels([]);
        } else {
        const periodList = (periodRows ?? []).filter((row) => row.period);
        const keyToPeriod = new Map<string, { period: string; label: string; sortOrder: number }>();
        periodList.forEach((row) => {
          const keyFromLabel = getQuarterKeyFromLabel(row.period_label);
          const keyFromPeriod = getQuarterKeyFromPeriod(row.period);
          const key = keyFromLabel ?? keyFromPeriod;
          if (!key) return;
          const sortOrder = row.sort_order ?? 0;
          const label = formatQuarterLabel(row.period_label, row.period);
          const existing = keyToPeriod.get(key);
          if (!existing || sortOrder > existing.sortOrder) {
            keyToPeriod.set(key, { period: row.period, label, sortOrder });
          }
        });

        const windowKeys = buildQuarterKeyWindow(targetQuarterCode);
        if (windowKeys && windowKeys.length === 4) {
          const resolvedWindow = windowKeys.map((key) => {
            const resolved = keyToPeriod.get(key);
            const fallbackPeriod = key.replace(/(\\d{4})-Q([1-4])/, (_, year, q) => `FY${String(Number(year) + 1).slice(2)}-Q${q}`);
            return {
              period: resolved?.period ?? fallbackPeriod,
              label: resolved?.label ?? formatQuarterLabel(undefined, fallbackPeriod),
            };
          });
          if (windowPeriods.length === 0) {
            windowPeriods = resolvedWindow.map((item) => item.period);
            windowLabels = resolvedWindow.map((item) => item.label);
          }
          setQuarterLabels(resolvedWindow);
        } else {
          const uniquePeriods = new Map<string, { period: string; label: string; sortOrder: number }>();
          periodList.forEach((row) => {
            const sortOrder = row.sort_order ?? 0;
            const label = formatQuarterLabel(row.period_label, row.period);
            const existing = uniquePeriods.get(row.period);
            if (!existing || sortOrder > existing.sortOrder) {
              uniquePeriods.set(row.period, { period: row.period, label, sortOrder });
            }
          });
          const orderedPeriods = Array.from(uniquePeriods.values()).sort((a, b) => a.sortOrder - b.sortOrder);
          const labelByPeriod = new Map(orderedPeriods.map((item) => [item.period, item.label]));
          const endIndex =
            targetQuarterCode && orderedPeriods.length > 0
              ? orderedPeriods.findIndex((item) => item.period === targetQuarterCode)
              : -1;
          const resolvedEndIndex = endIndex >= 0 ? endIndex : orderedPeriods.length - 1;
          const windowStart = Math.max(0, resolvedEndIndex - 3);
          const window = orderedPeriods.slice(windowStart, resolvedEndIndex + 1).map((item) => ({
            period: item.period,
            label: item.label,
          }));
          const resolvedWindow = window.map((item) => ({
            period: item.period,
            label: labelByPeriod.get(item.period) ?? item.label,
          }));
          if (windowPeriods.length === 0) {
            windowPeriods = resolvedWindow.map((item) => item.period);
            windowLabels = resolvedWindow.map((item) => item.label);
          }
          setQuarterLabels(resolvedWindow);
        }
        }
      }

      const quarterQuery = supabase
        .from('v_app_quarter_metrics')
        .select(
          'app_id, period, period_label, sort_order, overall_score, ease_of_use_avg, usefulness_avg, ease_of_use_topbox_pct, usefulness_topbox_pct'
        )
        .in('app_id', selectedIds)
        .order('sort_order', { ascending: true });
      const { data, error } = await quarterQuery;

      if (!isMounted) return;

      if (error) {
        setAppQuarterSeries({});
        setAppTopBox({});
        setIsQuarterLoading(false);
        return;
      }

      const grouped = new Map<string, AppQuarterRow[]>();
      (data ?? []).forEach((row) => {
        const existing = grouped.get(row.app_id) ?? [];
        existing.push(row as AppQuarterRow);
        grouped.set(row.app_id, existing);
      });

      const windowKeyList = buildQuarterKeyWindow(targetQuarterCode) ?? [];
      const windowKeySet = new Set(windowKeyList);
      const windowKeyToPeriod = new Map<string, string>();
      const windowKeyToLabel = new Map<string, string>();
      quarterLabels.forEach((item) => {
        const key = getQuarterKeyFromPeriod(item.period);
        if (key) {
          windowKeyToPeriod.set(key, item.period);
          windowKeyToLabel.set(key, item.label);
        }
      });

      let monthlyAggregates: Record<
        string,
        Record<string, { count: number; overall: number; ease: number; use: number }>
      > = {};
      if (windowKeyList.length > 0) {
        const monthPeriods = Array.from(
          new Set(windowKeyList.flatMap((key) => getMonthPeriodsForQuarterKey(key)))
        );
        if (monthPeriods.length > 0) {
          const { data: monthRows } = await supabase
            .from('v_app_metrics_trends')
            .select('app_id, period, overall_score, ease_of_use_avg, usefulness_avg')
            .in('app_id', selectedIds)
            .in('period', monthPeriods);

          (monthRows ?? []).forEach((row: { app_id: string; period: string; overall_score: number | null; ease_of_use_avg: number | null; usefulness_avg: number | null }) => {
            const key = getQuarterKeyFromMonthPeriod(row.period);
            if (!key || !windowKeySet.has(key)) return;
            const appAgg = (monthlyAggregates[row.app_id] ??= {});
            const agg = (appAgg[key] ??= { count: 0, overall: 0, ease: 0, use: 0 });
            const overall = row.overall_score ?? 0;
            const ease = row.ease_of_use_avg ?? 0;
            const use = row.usefulness_avg ?? 0;
            agg.count += 1;
            agg.overall += overall;
            agg.ease += ease;
            agg.use += use;
          });

          // Debugging removed.
        }
      }

      const series: Record<string, AppQuarterRow[]> = {};
      const windowSet = new Set(windowPeriods);
      const windowLabelSet = new Set(windowLabels);
      grouped.forEach((rows, appId) => {
        const sorted = [...rows].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        let windowRows = sorted;

        if (windowKeySet.size > 0) {
          const byKey = new Map<string, AppQuarterRow>();
          sorted.forEach((row) => {
            const key = getQuarterKeyFromPeriod(row.period) ?? getQuarterKeyFromLabel(row.period_label);
            if (key) {
              byKey.set(key, row);
            }
          });
          windowRows = windowKeyList.map((key) => {
            const existing = byKey.get(key);
            if (existing) return existing;
            const agg = monthlyAggregates[appId]?.[key];
            if (!agg || agg.count === 0) return null;
            const period = windowKeyToPeriod.get(key) ?? '';
            const label = windowKeyToLabel.get(key) ?? '';
            return {
              app_id: appId,
              period,
              period_label: label,
              sort_order: null,
              overall_score: agg.overall / agg.count,
              ease_of_use_avg: agg.ease / agg.count,
              usefulness_avg: agg.use / agg.count,
            } as AppQuarterRow;
          }).filter(Boolean) as AppQuarterRow[];
        } else if (windowSet.size > 0) {
          windowRows = sorted.filter((row) => windowSet.has(row.period));
        } else if (windowLabelSet.size > 0) {
          windowRows = sorted.filter((row) => windowLabelSet.has(formatQuarterLabel(row.period_label, row.period)));
        }

        if ((windowKeySet.size > 0 || windowSet.size > 0 || windowLabelSet.size > 0) && windowRows.length === 0) {
          windowRows = sorted.slice(-4);
        }
        series[appId] = windowRows;
      });

      setAppQuarterSeries(series);
      // Debugging removed.
      setIsQuarterLoading(false);
    };

    loadQuarterSeries();

    return () => {
      isMounted = false;
    };
  }, [config.scoresConfig.selectedApps, config.scoresConfig.selectedMonth, monthLabelToCode]);

  // Get current month/year for display
  const currentDate = new Date();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const shortMonthName = currentDate.toLocaleString('default', { month: 'short' });
  const year = currentDate.getFullYear();
  const formattedDate = `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${year}`;
  const currentMonthLabel = `${monthName} ${year}`;
  const reportPeriodLabel = metricsPeriodLabel ?? `${monthName} ${year}`;
  const reportPeriodShortLabel = (() => {
    if (!metricsPeriodLabel) return `${shortMonthName} '${year.toString().slice(2)}`;
    const parts = metricsPeriodLabel.split(' ');
    if (parts.length >= 2 && /^\d{4}$/.test(parts[1])) {
      return `${parts[0].slice(0, 3)} '${parts[1].slice(2)}`;
    }
    return metricsPeriodLabel;
  })();

  // Calculate stats for preview
  const selectedAppsData = exportApps.filter(app => config.scoresConfig.selectedApps.includes(app.id));
  
  // Group apps by metrics system if needed
  const pendoApps = selectedAppsData.filter(app => app.metricsSystem === 'pendo');
  const medalliaApps = selectedAppsData.filter(app => app.metricsSystem === 'medallia');

  // Calculate highlights for each group
  const calculateHighlights = (apps: typeof selectedAppsData) => ({
    goodCount: apps.filter(app => app.overallScore >= 65).length,
    total: apps.length,
    improvementCount: apps.filter(app => app.overallScore < 50).length,
    flatCount: apps.filter(app => Math.abs(app.scoreMoM) <= 2).length,
    declineCount: apps.filter(app => app.scoreMoM < -2).length,
  });

  const reportHighlights = calculateHighlights(selectedAppsData);

  // Sort apps based on config
  const sortApps = (apps: typeof selectedAppsData) => {
    const sorted = [...apps];
    switch (config.scoresConfig.sortOrder) {
      case 'alphabetical':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'score-desc':
        return sorted.sort((a, b) => b.overallScore - a.overallScore);
      case 'score-asc':
        return sorted.sort((a, b) => a.overallScore - b.overallScore);
      case 'trend':
        return sorted.sort((a, b) => b.scoreMoM - a.scoreMoM);
      default:
        return sorted;
    }
  };

  const handleExport = () => {
    if (config.exportFormat === 'pdf') {
      window.print();
      return;
    }

    const headers = [
      'App Name',
      'Overall Score',
      'Score MoM',
      'Ease of Use',
      'Usefulness',
      'Responses',
      'Metrics System',
      'Period',
    ];
    const rows = selectedAppsData.map((app) => [
      app.name,
      app.overallScore,
      app.scoreMoM,
      app.easeOfUse,
      app.usefulness,
      app.responses,
      app.metricsSystem,
      reportPeriodLabel,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `export-report-${reportPeriodLabel.replace(/\s+/g, '-').toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        @media screen {
          .export-preview-panel .export-page {
            width: 1100px;
            height: auto;
          }
          .export-preview-panel .export-slide {
            width: 100%;
            height: auto;
          }
        }
        @media print {
          @page {
            size: landscape;
            margin: 0;
          }
          body {
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0;
          }
          .export-app-header {
            display: none !important;
          }
          .export-config-panel {
            display: none !important;
          }
          .export-preview-panel {
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
            zoom: 1 !important;
          }
          .export-preview-panel h3 {
            display: none !important;
          }
          .export-page {
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            width: 11in;
            height: 8.5in;
            overflow: hidden;
            break-after: page;
            page-break-after: always;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .export-slide {
            width: 100%;
            height: auto;
            max-width: 100%;
            max-height: 100%;
            transform: scale(0.9);
            transform-origin: center;
          }
          .export-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
          .title-page .title-left {
            width: 52% !important;
            padding-right: 2rem !important;
          }
          .title-page .title-right {
            width: 48% !important;
          }
        }
      `}</style>
      <div className="export-app-header">
      <NavigationHeader
        currentView="other"
        onNavigateHome={onNavigateHome || onNavigateBack}
        onNavigateAllApps={onNavigateAllApps || onNavigateBack}
        onNavigateKeyJourneys={onNavigateKeyJourneys || onNavigateBack}
        onNavigateTopPains={onNavigateTopPains || onNavigateBack}
        onNavigateAdmin={onNavigateAdmin}
        title="Export Report"
        subtitle="Configure and download custom reports"
        showExportButton={false}
      />
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Configuration Panel */}
        <div className="export-config-panel w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Report Configuration</h2>

            {/* Month Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Month</label>
              <Select
                value={config.scoresConfig.selectedMonth ?? ''}
                onValueChange={(value) => updateScoresConfig({ selectedMonth: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.length === 0 && (
                    <SelectItem value="no-data" disabled>
                      No months available
                    </SelectItem>
                  )}
                  {availableMonths.map((label) => (
                    <SelectItem key={label} value={label}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Advanced Settings Toggle */}
            <div className="mb-6">
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                {showAdvancedSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                <span>Advanced Settings</span>
              </button>
            </div>

            {/* Advanced Settings Content */}
            {showAdvancedSettings && (
              <div className="mb-6 space-y-4">
                {/* Sections */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Report Sections</h3>
                  
                  {/* Portfolio Scores Section */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={config.sections.scores}
                          onChange={(e) => updateConfig({ sections: { ...config.sections, scores: e.target.checked } })}
                          className="rounded"
                        />
                        <span className="text-sm font-medium">Portfolio Scores</span>
                      </label>
                      <button
                        onClick={() => toggleSection('scores')}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {expandedSections.scores ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>

                    {expandedSections.scores && config.sections.scores && (
                      <div className="ml-6 space-y-3 text-sm">
                        {/* App Selection */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium">
                              Applications ({config.scoresConfig.selectedApps.length}/{exportApps.length})
                            </label>
                            <button
                              onClick={toggleAllApps}
                              className="text-xs text-orange-600 hover:text-orange-700"
                            >
                              {config.scoresConfig.selectedApps.length === exportApps.length ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          {metricsError && (
                            <div className="mb-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                              Supabase error: {metricsError}
                            </div>
                          )}
                          {!metricsError && isMetricsLoading && exportApps.length === 0 && (
                            <div className="mb-2 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600">
                              Loading apps from Supabase…
                            </div>
                          )}
                          {!metricsError && !isMetricsLoading && exportApps.length === 0 && (
                            <div className="mb-2 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600">
                              No apps found for the selected period.
                            </div>
                          )}
                          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded p-2 space-y-1">
                            {exportApps.map(app => (
                              <label key={app.id} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={config.scoresConfig.selectedApps.includes(app.id)}
                                  onChange={() => toggleApp(app.id)}
                                  className="rounded"
                                />
                                <span className="text-xs">{app.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Include Score Driver Slides */}
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={config.scoresConfig.includeDetailPages}
                            onChange={(e) => updateScoresConfig({ includeDetailPages: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-xs">Include Score Driver Slides</span>
                        </label>

                        {/* Export Format */}
                        <div>
                          <label className="block text-xs font-medium mb-2">Export Format</label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateConfig({ exportFormat: 'pdf' })}
                              className={`flex-1 px-3 py-1.5 text-xs rounded border ${
                                config.exportFormat === 'pdf'
                                  ? 'bg-orange-50 border-orange-500 text-orange-700'
                                  : 'bg-white border-gray-300 text-gray-700'
                              }`}
                            >
                              PDF
                            </button>
                            <button
                              onClick={() => updateConfig({ exportFormat: 'csv' })}
                              className={`flex-1 px-3 py-1.5 text-xs rounded border ${
                                config.exportFormat === 'csv'
                                  ? 'bg-orange-50 border-orange-500 text-orange-700'
                                  : 'bg-white border-gray-300 text-gray-700'
                              }`}
                            >
                              CSV
                            </button>
                          </div>
                          
                          {/* CSV Explanation */}
                          {config.exportFormat === 'csv' && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-[10px]">
                              <p className="font-medium text-blue-900 mb-1">CSV Export includes:</p>
                              <ul className="text-blue-800 space-y-0.5 ml-2">
                                <li>• Application names and scores</li>
                                <li>• Ease of Use & Usefulness ratings</li>
                                <li>• Response counts and trends</li>
                                <li>• Month-over-month comparisons</li>
                                <li>• Metrics system information</li>
                              </ul>
                              <p className="text-blue-700 mt-1.5 italic">Perfect for analysis in Excel or data tools</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Journeys Section - Coming Soon */}
                  <div className="mb-4 opacity-50">
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={false}
                          disabled
                          className="rounded"
                        />
                        <span className="text-sm font-medium">Key Journeys</span>
                        <span className="text-xs text-gray-500">(Coming Soon)</span>
                      </label>
                    </div>
                  </div>

                  {/* Top Pains Section - Coming Soon */}
                  <div className="mb-4 opacity-50">
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={false}
                          disabled
                          className="rounded"
                        />
                        <span className="text-sm font-medium">Top Pains</span>
                        <span className="text-xs text-gray-500">(Coming Soon)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Export Button */}
            <Button
              onClick={handleExport}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Download size={16} className="mr-2" />
              Export {config.exportFormat.toUpperCase()}
            </Button>
          </div>
        </div>

        {/* Right Preview Panel - Landscape Pages */}
        <div
          ref={previewPanelRef}
          className="export-preview-panel flex-1 bg-gray-100 overflow-y-auto p-8"
          style={{ zoom: previewScale }}
        >
          <div className="max-w-6xl mx-auto space-y-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Report Preview</h3>
            
            {/* Cover Page */}
            <div className="export-page bg-white shadow-lg rounded-sm overflow-hidden">
              <div className="export-slide">
              <CoverPage />
              </div>
            </div>

            {/* Title Page */}
            <div className="export-page bg-white shadow-lg rounded-sm overflow-hidden">
              <div className="export-slide">
              <TitlePage 
                  title={`${reportPeriodLabel}\n${config.reportTitle.replace(/\\n/g, '\n')}`}
                author={config.reportAuthor}
                date={formattedDate}
              />
              </div>
            </div>

            {/* Portfolio Scores Section */}
            {config.sections.scores && (
              <>
                {/* Pendo Portfolio Table */}
                {pendoApps.length > 0 && (
                  <div className="export-page bg-white shadow-lg rounded-sm overflow-hidden">
                    <div className="export-slide">
                    <PortfolioTablePage
                      title="Store Systems"
                        month={reportPeriodShortLabel}
                      apps={sortApps(pendoApps)}
                      metricsSystem="Pendo"
                        highlights={reportHighlights}
                    />
                    </div>
                  </div>
                )}

                {/* Medallia Portfolio Table */}
                {medalliaApps.length > 0 && (
                  <div className="export-page bg-white shadow-lg rounded-sm overflow-hidden">
                    <div className="export-slide">
                    <PortfolioTablePage
                      title="Store Systems"
                        month={reportPeriodShortLabel}
                      apps={sortApps(medalliaApps)}
                      metricsSystem="Medallia"
                        highlights={reportHighlights}
                    />
                    </div>
                  </div>
                )}

                {/* Individual App Detail Pages */}
                {config.scoresConfig.includeDetailPages && (
                  <>
                    {/* Pendo Apps Detail Pages */}
                    {pendoApps.length > 0 && (
                      <>
                        <div className="export-page bg-white shadow-lg rounded-sm overflow-hidden">
                          <div className="export-slide">
                          <DividerPage title="Score Drivers" subtitle="Captured w/ Pendo" />
                          </div>
                        </div>
                        
                        {sortApps(pendoApps).map(app => (
                          <div key={app.id} className="export-page bg-white shadow-lg rounded-sm overflow-hidden">
                            <div className="export-slide">
                              <AppDetailPage
                                app={app}
                                selectedMonth={reportPeriodLabel}
                                quarterSeries={appQuarterSeries[app.id] ?? []}
                                topBox={appTopBox[app.id] ?? { ease: null, usefulness: null }}
                                quarterLabels={quarterLabels}
                                isQuarterLoading={isQuarterLoading}
                                monthLabelToCode={monthLabelToCode}
                              />
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Medallia Apps Detail Pages */}
                    {medalliaApps.length > 0 && (
                      <>
                        <div className="export-page bg-white shadow-lg rounded-sm overflow-hidden">
                          <div className="export-slide">
                          <DividerPage title="Score Drivers" subtitle="Captured w/ Medallia" />
                          </div>
                        </div>
                        
                        {sortApps(medalliaApps).map(app => (
                          <div key={app.id} className="export-page bg-white shadow-lg rounded-sm overflow-hidden">
                            <div className="export-slide">
                              <AppDetailPage
                                app={app}
                                selectedMonth={reportPeriodLabel}
                                quarterSeries={appQuarterSeries[app.id] ?? []}
                                topBox={appTopBox[app.id] ?? { ease: null, usefulness: null }}
                                quarterLabels={quarterLabels}
                                isQuarterLoading={isQuarterLoading}
                                monthLabelToCode={monthLabelToCode}
                              />
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}