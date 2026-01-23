import { useState } from 'react';
import { ArrowLeft, FileDown, ChevronLeft, ChevronRight, ExternalLink, ArrowRight, ArrowDown } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card } from './ui/card';
import { mockJourneys, mockApps, getScoreColor, getScoreBgColor, getTrendIcon, getTrendColor, markMock } from '../data/mockData';
import type { TimePeriod } from '../App';
import type { TimePeriodData } from './TimeSelector';
import { TimeSelector } from './TimeSelector';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { ScoreDriversThemes, ThemeCategory } from './ScoreDriversThemes';
import { NavigationHeader } from './NavigationHeader';

interface JourneyDetailEnhancedProps {
  journeyId: string;
  timePeriod: TimePeriodData;
  onTimePeriodChange: (period: TimePeriodData) => void;
  onNavigateBack: () => void;
  onNavigateToApp: (appId: string) => void;
  onNavigateHome?: () => void;
  onNavigateAllApps?: () => void;
  onNavigateKeyJourneys?: () => void;
  onNavigateTopPains?: () => void;
  onNavigateAdmin?: () => void;
  onNavigateExport?: () => void;
}

type TrendView = 'overall' | 'by-app' | 'by-step';

export function JourneyDetailEnhanced({ 
  journeyId, 
  timePeriod, 
  onTimePeriodChange, 
  onNavigateBack,
  onNavigateToApp,
  onNavigateHome,
  onNavigateAllApps,
  onNavigateKeyJourneys,
  onNavigateTopPains,
  onNavigateAdmin,
  onNavigateExport
}: JourneyDetailEnhancedProps) {
  const [trendView, setTrendView] = useState<TrendView>('overall');
  const [showDetailedTable, setShowDetailedTable] = useState(false);
  const [primaryFocus, setPrimaryFocus] = useState<string>('overall');
  
  const journey = mockJourneys.find((j) => j.id === journeyId);

  if (!journey) {
    return <div>Journey not found</div>;
  }

  // Quarterly data
  const quarterlyData = [
    { period: "Q1 '25", score: 48 },
    { period: "Q2 '25", score: 56 },
    { period: "Q3 '25", score: 68 },
    { period: "Q4 '25", score: journey.overallScore },
  ];

  // Monthly data
  const monthlyData = [
    { period: 'Jan', score: 45 },
    { period: 'Feb', score: 47 },
    { period: 'Mar', score: 50 },
    { period: 'Apr', score: 52 },
    { period: 'May', score: 55 },
    { period: 'Jun', score: 58 },
    { period: 'Jul', score: 62 },
    { period: 'Aug', score: 66 },
    { period: 'Sep', score: 70 },
    { period: 'Oct', score: 73 },
    { period: 'Nov', score: journey.overallScore },
  ];

  const currentData = timePeriod.format === 'quarter' ? quarterlyData : monthlyData;

  // Mock data for app-level trends (monthly)
  const monthlyAppTrendData = [
    { period: 'Jan', overall: 45, '1Returns': 52, 'Inventory Manager': 48, 'Order Up': 35, 'Customer Portal': 42 },
    { period: 'Feb', overall: 47, '1Returns': 54, 'Inventory Manager': 50, 'Order Up': 37, 'Customer Portal': 44 },
    { period: 'Mar', overall: 50, '1Returns': 57, 'Inventory Manager': 53, 'Order Up': 40, 'Customer Portal': 47 },
    { period: 'Apr', overall: 52, '1Returns': 60, 'Inventory Manager': 56, 'Order Up': 42, 'Customer Portal': 50 },
    { period: 'May', overall: 55, '1Returns': 63, 'Inventory Manager': 59, 'Order Up': 45, 'Customer Portal': 53 },
    { period: 'Jun', overall: 58, '1Returns': 66, 'Inventory Manager': 62, 'Order Up': 48, 'Customer Portal': 56 },
    { period: 'Jul', overall: 62, '1Returns': 70, 'Inventory Manager': 66, 'Order Up': 52, 'Customer Portal': 60 },
    { period: 'Aug', overall: 66, '1Returns': 74, 'Inventory Manager': 71, 'Order Up': 57, 'Customer Portal': 64 },
    { period: 'Sep', overall: 70, '1Returns': 77, 'Inventory Manager': 75, 'Order Up': 62, 'Customer Portal': 66 },
    { period: 'Oct', overall: 73, '1Returns': 78, 'Inventory Manager': 79, 'Order Up': 64, 'Customer Portal': 67 },
    { period: 'Nov', overall: journey.overallScore, '1Returns': 79, 'Inventory Manager': 81, 'Order Up': 66, 'Customer Portal': 68 },
  ];

  // Mock data for app-level trends (quarterly)
  const quarterlyAppTrendData = [
    { period: "Q1 '25", overall: 48, '1Returns': 54, 'Inventory Manager': 50, 'Order Up': 37, 'Customer Portal': 44 },
    { period: "Q2 '25", overall: 56, '1Returns': 63, 'Inventory Manager': 59, 'Order Up': 45, 'Customer Portal': 53 },
    { period: "Q3 '25", overall: 68, '1Returns': 74, 'Inventory Manager': 71, 'Order Up': 57, 'Customer Portal': 64 },
    { period: "Q4 '25", overall: journey.overallScore, '1Returns': 79, 'Inventory Manager': 81, 'Order Up': 66, 'Customer Portal': 68 },
  ];

  // Mock data for step-level trends (monthly)
  const monthlyStepTrendData = [
    { period: 'Jan', overall: 45, 'Initiate Return': 58, 'Verify Eligibility': 54, 'Process Refund': 38, 'Update Customer Record': 35, 'Generate Return Label': 52, 'Confirm Receipt': 48 },
    { period: 'Feb', overall: 47, 'Initiate Return': 60, 'Verify Eligibility': 56, 'Process Refund': 40, 'Update Customer Record': 37, 'Generate Return Label': 54, 'Confirm Receipt': 50 },
    { period: 'Mar', overall: 50, 'Initiate Return': 62, 'Verify Eligibility': 58, 'Process Refund': 43, 'Update Customer Record': 40, 'Generate Return Label': 57, 'Confirm Receipt': 53 },
    { period: 'Apr', overall: 52, 'Initiate Return': 65, 'Verify Eligibility': 61, 'Process Refund': 46, 'Update Customer Record': 43, 'Generate Return Label': 60, 'Confirm Receipt': 56 },
    { period: 'May', overall: 55, 'Initiate Return': 68, 'Verify Eligibility': 64, 'Process Refund': 49, 'Update Customer Record': 46, 'Generate Return Label': 63, 'Confirm Receipt': 59 },
    { period: 'Jun', overall: 58, 'Initiate Return': 71, 'Verify Eligibility': 67, 'Process Refund': 52, 'Update Customer Record': 50, 'Generate Return Label': 66, 'Confirm Receipt': 62 },
    { period: 'Jul', overall: 62, 'Initiate Return': 74, 'Verify Eligibility': 70, 'Process Refund': 56, 'Update Customer Record': 54, 'Generate Return Label': 70, 'Confirm Receipt': 66 },
    { period: 'Aug', overall: 66, 'Initiate Return': 77, 'Verify Eligibility': 73, 'Process Refund': 60, 'Update Customer Record': 58, 'Generate Return Label': 73, 'Confirm Receipt': 70 },
    { period: 'Sep', overall: 70, 'Initiate Return': 79, 'Verify Eligibility': 76, 'Process Refund': 64, 'Update Customer Record': 62, 'Generate Return Label': 76, 'Confirm Receipt': 73 },
    { period: 'Oct', overall: 73, 'Initiate Return': 81, 'Verify Eligibility': 78, 'Process Refund': 68, 'Update Customer Record': 66, 'Generate Return Label': 78, 'Confirm Receipt': 75 },
    { period: 'Nov', overall: journey.overallScore, 'Initiate Return': 82, 'Verify Eligibility': 79, 'Process Refund': 71, 'Update Customer Record': 68, 'Generate Return Label': 79, 'Confirm Receipt': 76 },
  ];

  // Mock data for step-level trends (quarterly)
  const quarterlyStepTrendData = [
    { period: "Q1 '25", overall: 48, 'Initiate Return': 60, 'Verify Eligibility': 56, 'Process Refund': 40, 'Update Customer Record': 37, 'Generate Return Label': 54, 'Confirm Receipt': 50 },
    { period: "Q2 '25", overall: 56, 'Initiate Return': 68, 'Verify Eligibility': 64, 'Process Refund': 49, 'Update Customer Record': 46, 'Generate Return Label': 63, 'Confirm Receipt': 59 },
    { period: "Q3 '25", overall: 68, 'Initiate Return': 77, 'Verify Eligibility': 73, 'Process Refund': 60, 'Update Customer Record': 58, 'Generate Return Label': 73, 'Confirm Receipt': 70 },
    { period: "Q4 '25", overall: journey.overallScore, 'Initiate Return': 82, 'Verify Eligibility': 79, 'Process Refund': 71, 'Update Customer Record': 68, 'Generate Return Label': 79, 'Confirm Receipt': 76 },
  ];

  // Colorblind-friendly palette for multiple lines
  const lineColors = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1', '#f97316'];

  // Get the appropriate data and keys based on view
  const getTrendChartData = () => {
    if (trendView === 'by-app') {
      return timePeriod.format === 'quarter' ? quarterlyAppTrendData : monthlyAppTrendData;
    }
    if (trendView === 'by-step') {
      return timePeriod.format === 'quarter' ? quarterlyStepTrendData : monthlyStepTrendData;
    }
    return currentData;
  };

  const getTrendChartLines = () => {
    if (trendView === 'by-app') {
      return ['1Returns', 'Inventory Manager', 'Order Up', 'Customer Portal'];
    }
    if (trendView === 'by-step') {
      return ['Initiate Return', 'Verify Eligibility', 'Process Refund', 'Update Customer Record', 'Generate Return Label', 'Confirm Receipt'];
    }
    return [];
  };

  // Reset primary focus when changing views
  const handleViewChange = (newView: TrendView) => {
    setTrendView(newView);
    setPrimaryFocus('overall');
  };

  // Get line style based on focus
  const getLineStyle = (lineName: string) => {
    const isPrimary = lineName === primaryFocus || (trendView === 'overall' && lineName === 'score');
    return {
      strokeWidth: isPrimary ? 3 : 1.5,
      opacity: isPrimary ? 1 : 0.7,
    };
  };

  // Get dot style based on focus
  const getDotStyle = (lineName: string) => {
    const isPrimary = lineName === primaryFocus || (trendView === 'overall' && lineName === 'score');
    return {
      r: isPrimary ? 5 : 3,
      strokeWidth: isPrimary ? 0 : 2,
      fill: isPrimary ? undefined : '#fff', // undefined means use the line color as fill
    };
  };

  // Get color for a specific line
  const getLineColor = (lineName: string, index: number) => {
    if (lineName === 'overall' || lineName === 'score') return '#ea580c';
    return lineColors[index];
  };

  // Custom legend component
  const CustomLegend = ({ payload }: any) => {
    if (!payload || payload.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-4 justify-center mt-4">
        {payload.map((entry: any, index: number) => {
          const isFocused = entry.dataKey === primaryFocus || (trendView === 'overall' && entry.dataKey === 'score');
          const isOverall = entry.dataKey === 'overall' || entry.dataKey === 'score';
          
          return (
            <button
              key={entry.dataKey}
              onClick={() => setPrimaryFocus(entry.dataKey)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all ${
                isFocused 
                  ? 'bg-orange-100 ring-2 ring-orange-500' 
                  : 'hover:bg-slate-100'
              }`}
              title={`Click to compare others to ${entry.value}`}
            >
              <div 
                className="w-8 h-0.5 rounded"
                style={{ 
                  backgroundColor: entry.color,
                  height: isFocused ? '3px' : '2px',
                  opacity: isFocused ? 1 : 0.7
                }}
              />
              <span className={`text-sm ${isFocused ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                {entry.value}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  // Contributing apps
  const contributingApps = [
    { appId: '1', appName: markMock('1Returns'), score: 79, prevScore: 75, touchpoints: 3, description: markMock('Primary returns processing'), color: 'blue' },
    { appId: '5', appName: markMock('Inventory Manager'), score: 81, prevScore: 78, touchpoints: 2, description: markMock('Stock verification'), color: 'green' },
    { appId: '3', appName: markMock('Order Up'), score: 66, prevScore: 63, touchpoints: 2, description: markMock('Refund processing'), color: 'purple' },
    { appId: '6', appName: markMock('Customer Portal'), score: 68, prevScore: 65, touchpoints: 1, description: markMock('Customer record updates'), color: 'amber' },
    // Apps without scores (not being tracked)
    { appId: '12', appName: markMock('Shipping Manager'), score: null, prevScore: null, touchpoints: 1, description: markMock('Shipping label generation and tracking'), color: 'cyan' },
    { appId: '8', appName: markMock('Fulfillment Hub'), score: null, prevScore: null, touchpoints: 1, description: markMock('Warehouse receipt confirmation'), color: 'indigo' },
  ];

  // Touchpoint breakdown - scores only exist if the app is being tracked
  const touchpointData = [
    { step: 1, touchpoint: markMock('Initiate Return'), app: markMock('1Returns'), score: 82, prevScore: 78, appId: '1', color: 'blue', description: markMock('Customer starts return process through online portal') },
    { step: 2, touchpoint: markMock('Verify Eligibility'), app: markMock('1Returns'), score: 79, prevScore: 75, appId: '1', color: 'blue', description: markMock('System checks if product qualifies for return based on policy') },
    { step: 3, touchpoint: markMock('Process Refund'), app: markMock('Order Up'), score: 71, prevScore: 68, appId: '3', color: 'purple', description: markMock('Refund amount is calculated and initiated') },
    { step: 4, touchpoint: markMock('Update Customer Record'), app: markMock('Customer Portal'), score: 68, prevScore: 65, appId: '6', color: 'amber', description: markMock('Customer account is updated with return transaction details') },
    { step: 5, touchpoint: markMock('Generate Return Label'), app: markMock('1Returns'), score: 79, prevScore: 76, appId: '1', color: 'blue', description: markMock('Shipping label is created and sent to customer') },
    { step: 6, touchpoint: markMock('Track Return Shipment'), app: markMock('Shipping Manager'), score: null, prevScore: null, appId: '12', color: 'cyan', description: markMock('Package location is monitored during transit') },
    { step: 7, touchpoint: markMock('Confirm Receipt'), app: markMock('Fulfillment Hub'), score: null, prevScore: null, appId: '8', color: 'indigo', description: markMock('Returned item arrives at warehouse and is logged') },
    { step: 8, touchpoint: markMock('Close Return Case'), app: markMock('1Returns'), score: 77, prevScore: 74, appId: '1', color: 'blue', description: markMock('Return transaction is finalized and closed') },
  ];

  // Helper function to get border color class based on app color
  const getBorderColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'border-blue-400',
      green: 'border-green-400',
      purple: 'border-purple-400',
      amber: 'border-amber-400',
      cyan: 'border-cyan-400',
      indigo: 'border-indigo-400',
    };
    return colorMap[color] || 'border-slate-300';
  };

  const getBgColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-50',
      green: 'bg-green-50',
      purple: 'bg-purple-50',
      amber: 'bg-amber-50',
      cyan: 'bg-cyan-50',
      indigo: 'bg-indigo-50',
    };
    return colorMap[color] || 'bg-white';
  };

  const getHoverBorderColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'hover:border-blue-500',
      green: 'hover:border-green-500',
      purple: 'hover:border-purple-500',
      amber: 'hover:border-amber-500',
      cyan: 'hover:border-cyan-500',
      indigo: 'hover:border-indigo-500',
    };
    return colorMap[color] || 'hover:border-orange-400';
  };

  // Journey-specific feedback themes
  const feedbackThemes: ThemeCategory[] = [
    {
      title: markMock('Transition Delays Between Apps'),
      percentage: 28,
      type: 'negative',
      narratives: [
        markMock('Switching from 1Returns to Order Up for refund processing takes 30-45 seconds on average.'),
        markMock('Customer Portal updates require manual data re-entry from returns system.'),
      ],
      metadata: {
        monthsActive: 8,
        trendDirection: 'stable',
        crossAppCount: 4,
        status: 'unresolved',
      },
      exampleComments: [
        { text: markMock('The wait time between systems is frustrating, especially when the customer is standing there'), date: 'Nov 12, 2025', userRole: 'Store Associate', rating: 2 },
        { text: markMock('Why do I have to type the same information into three different screens?'), date: 'Nov 8, 2025', userRole: 'Customer Service', rating: 2 },
      ],
    },
    {
      title: markMock('Refund Processing Bottleneck'),
      percentage: 19,
      type: 'negative',
      narratives: [
        markMock('Order Up refund step scores below journey average, causing delays.'),
        markMock('System often requires manager approval for standard returns that should be automatic.'),
      ],
      metadata: {
        monthsActive: 5,
        trendDirection: 'increasing',
        trendPercentage: 12,
        status: 'unresolved',
      },
    },
    {
      title: markMock('Smooth Initiation Experience'),
      percentage: 24,
      type: 'positive',
      narratives: [
        markMock('1Returns initiation step rated highly for ease of use and speed.'),
        markMock('Receipt lookup generally works well at the start of the journey.'),
      ],
      metadata: {
        trendDirection: 'stable',
        status: 'stabilized',
      },
    },
  ];

  const periods = timePeriod.format === 'quarter' 
    ? ["Q1 '25", "Q2 '25", "Q3 '25", "Q4 '25"]
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  
  const currentPeriodIndex = periods.length - 1;

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
        title={journey.name}
        subtitle="End-to-end journey performance"
        showExportButton={true}
      />

      {/* Period Navigation - Moved to top */}
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
              <TimeSelector value={timePeriod} onChange={onTimePeriodChange} variant="light" />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Journey Summary */}
        <section className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {/* 1. Overall Score */}
            <Card className="p-6 border-slate-200">
              <h3 className="text-slate-600 mb-2">Overall Score</h3>
              <div className="flex items-baseline gap-2">
                <span className={`text-[40px] font-semibold ${getScoreColor(journey.overallScore)}`}>
                  {journey.overallScore}
                </span>
                <span className="text-slate-500">/100</span>
              </div>
            </Card>

            {/* 2. 3-Month Trend */}
            <Card className="p-6 border-slate-200">
              <h3 className="text-slate-600 mb-2">3-Month Trend</h3>
              <div className={`text-[28px] font-semibold ${getTrendColor(journey.trend)}`}>
                {getTrendIcon(journey.trend)} {journey.trendValue > 0 ? '+' : ''}{journey.trendValue} ({journey.trendPercentage > 0 ? '+' : ''}{journey.trendPercentage}%)
              </div>
            </Card>

            {/* 3. Touchpoints */}
            <Card className="p-6 border-slate-200">
              <h3 className="text-slate-600 mb-2">Touchpoints</h3>
              <div className="text-[40px] font-semibold text-slate-900">{journey.touchpoints}</div>
            </Card>

            {/* 4. Apps Involved */}
            <Card className="p-6 border-slate-200">
              <h3 className="text-slate-600 mb-2">Apps Involved</h3>
              <div className="text-[40px] font-semibold text-slate-900">{journey.appsInvolved}</div>
            </Card>
          </div>
        </section>

        {/* Experience Journey */}
        <section className="mb-8">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-slate-900">Experience Journey</h2>
                <p className="text-sm text-slate-500 italic font-light mt-0.5">
                  Tracking {touchpointData.filter(tp => tp.score !== null).length} out of {touchpointData.length} steps
                </p>
              </div>
              {/* Active/Inactive Status Badge */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  journey.id === '1' || journey.id === '2' // Mock: first two journeys are active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  <span className={`size-2 rounded-full ${
                    journey.id === '1' || journey.id === '2' 
                      ? 'bg-green-600' 
                      : 'bg-slate-400'
                  }`} />
                  {journey.id === '1' || journey.id === '2' ? (
                    <>
                      Collecting Data
                      <span className="text-slate-400 mx-0.5">·</span>
                      {journey.id === '1' ? 'Monthly' : 'Quarterly'}
                    </>
                  ) : (
                    <>Measured Jan – Jul 2024</>
                  )}
                </span>
              </div>
            </div>
          </div>
          
          {/* Journey Flow Visualization */}
          <Card className="p-6 border-slate-200 mb-6">
            {/* Layer 1: Overall Journey - Full width, no scroll */}
            <div className="mb-6">
              <div className="bg-orange-50 border border-orange-200 rounded-md px-6 py-3 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <span className="text-slate-900 font-semibold block mb-1">{journey.name}</span>
                  {journey.description && (
                    <span className="text-slate-600 text-sm block">{journey.description}</span>
                  )}
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className={`text-xl font-semibold ${getScoreColor(journey.overallScore)}`}>
                    {journey.overallScore}
                  </span>
                  {(() => {
                    // Calculate previous period score based on time period
                    const data = timePeriod.format === 'quarter' ? quarterlyData : monthlyData;
                    const currentScore = journey.overallScore;
                    const previousScore = data.length >= 2 ? data[data.length - 2].score : currentScore;
                    const diff = currentScore - previousScore;
                    const diffPercent = previousScore > 0 ? ((diff / previousScore) * 100).toFixed(0) : '0';
                    const timeLabel = timePeriod.format === 'quarter' ? 'QoQ' : timePeriod.format === 'year' ? 'YoY' : 'MoM';
                    
                    return (
                      <span className={`text-xs font-medium ${
                        diff > 0 ? 'text-green-700' : diff < 0 ? 'text-red-700' : 'text-slate-500'
                      }`}>
                        {diff > 0 ? '+' : ''}{diffPercent}% {timeLabel}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Layer 2 & 3: Steps and Apps - Scrollable with content peeking out on right */}
            <div className="relative -mr-6 pr-6">
              <div className="overflow-x-scroll pb-2">
                <div className="min-w-max pr-20">
                {(() => {
                // Pre-calculate widths for each step based on app span coverage
                const stepWidths: number[] = [];
                let currentIndex = 0;
                
                while (currentIndex < touchpointData.length) {
                  const currentTouchpoint = touchpointData[currentIndex];
                  
                  // Count consecutive touchpoints with the same app
                  let spanCount = 1;
                  while (
                    currentIndex + spanCount < touchpointData.length && 
                    touchpointData[currentIndex + spanCount].appId === currentTouchpoint.appId
                  ) {
                    spanCount++;
                  }
                  
                  // Calculate width: (120px * spanCount) + (12px gap * (spanCount - 1))
                  // Add extra width for longer app names - minimum 120px per step, but can expand
                  const baseWidth = spanCount * 120 + (spanCount - 1) * 12;
                  const appNameLength = currentTouchpoint.app.length;
                  // Add extra width if app name is long (more than 8 characters)
                  const extraWidth = appNameLength > 8 ? Math.min((appNameLength - 8) * 6, 40) : 0;
                  const totalWidth = baseWidth + extraWidth;
                  
                  // Calculate individual step width from total
                  const individualStepWidth = (totalWidth - (spanCount - 1) * 12) / spanCount;
                  
                  // Assign this width to all steps in this span
                  for (let i = 0; i < spanCount; i++) {
                    stepWidths[currentIndex + i] = individualStepWidth;
                  }
                  
                  currentIndex += spanCount;
                }

                return (
                  <>
                    {/* Layer 2: Touchpoints - With hover descriptions and time comparisons */}
                    <div className="mb-3">
                      <div className="flex gap-3 justify-start px-4">
                        {touchpointData.map((touchpoint, index) => {
                          const hasScore = touchpoint.score !== null;
                          const diff = hasScore ? touchpoint.score - touchpoint.prevScore : 0;
                          const diffPercent = hasScore && touchpoint.prevScore > 0 
                            ? ((diff / touchpoint.prevScore) * 100).toFixed(0)
                            : '0';
                          const timeLabel = timePeriod.format === 'quarter' ? 'QoQ' : timePeriod.format === 'year' ? 'YoY' : 'MoM';
                          
                          // Smart tooltip positioning to prevent clipping
                          const isFirstTwo = index < 2;
                          const isLastTwo = index >= touchpointData.length - 2;
                          const tooltipPositionClass = isFirstTwo 
                            ? 'left-0' 
                            : isLastTwo 
                            ? 'right-0' 
                            : 'left-1/2 -translate-x-1/2';
                          
                          return (
                            <div
                              key={touchpoint.step}
                              title={touchpoint.description}
                              style={{ width: `${stepWidths[index]}px` }}
                              className={`rounded px-3 py-2 flex-shrink-0 cursor-default relative group ${
                                hasScore 
                                  ? 'bg-white border border-slate-300' 
                                  : 'bg-slate-50 border border-dashed border-slate-300 opacity-50'
                              }`}
                            >
                              <div className="flex flex-col items-center">
                                <span className={`text-[10px] mb-1 ${hasScore ? 'text-slate-600' : 'text-slate-500'}`}>
                                  Step {touchpoint.step}
                                </span>
                                <span className={`font-medium text-[11px] mb-1 text-center leading-tight line-clamp-2 ${
                                  hasScore ? 'text-slate-900' : 'text-slate-500'
                                }`}>
                                  {touchpoint.touchpoint}
                                </span>
                                <div className="flex items-center gap-1">
                                  {hasScore ? (
                                    <span className={`text-lg font-semibold ${getScoreColor(touchpoint.score)}`}>
                                      {touchpoint.score}
                                    </span>
                                  ) : (
                                    <span className="text-sm font-medium text-slate-400">--</span>
                                  )}
                                </div>
                                {hasScore && (
                                  <span className={`text-[10px] font-medium ${
                                    diff > 0 ? 'text-green-700' : diff < 0 ? 'text-red-700' : 'text-slate-500'
                                  }`}>
                                    {diff > 0 ? '+' : ''}{diffPercent}% {timeLabel}
                                  </span>
                                )}
                              </div>
                              {/* Tooltip with smart positioning */}
                              <div className={`absolute ${tooltipPositionClass} bottom-full mb-2 hidden group-hover:block z-10 w-64`}>
                                <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                                  <div className="font-semibold mb-1">Step {touchpoint.step}: {touchpoint.touchpoint}</div>
                                  <div className="text-slate-300">{touchpoint.description}</div>
                                  {!hasScore && (
                                    <div className="mt-2 pt-2 border-t border-slate-700 text-slate-400 italic">
                                      App not currently being tracked
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Layer 3: Apps - With time comparisons instead of touchpoint count */}
                    <div>
                      <div className="flex gap-3 justify-start px-4 relative">
                        {(() => {
                          const appSpans: JSX.Element[] = [];
                          let currentIndex = 0;
                          
                          while (currentIndex < touchpointData.length) {
                            const currentTouchpoint = touchpointData[currentIndex];
                            const app = contributingApps.find(a => a.appId === currentTouchpoint.appId);
                            
                            // Count consecutive touchpoints with the same app
                            let spanCount = 1;
                            while (
                              currentIndex + spanCount < touchpointData.length && 
                              touchpointData[currentIndex + spanCount].appId === currentTouchpoint.appId
                            ) {
                              spanCount++;
                            }
                            
                            // Calculate width: sum of step widths + gaps
                            let width = 0;
                            for (let i = 0; i < spanCount; i++) {
                              width += stepWidths[currentIndex + i];
                            }
                            width += (spanCount - 1) * 12; // Add gaps between steps
                            
                            // Calculate time comparison for this app
                            const hasScore = app && app.score !== null;
                            const appDiff = hasScore && app.prevScore ? app.score - app.prevScore : 0;
                            const appDiffPercent = hasScore && app.prevScore > 0 
                              ? ((appDiff / app.prevScore) * 100).toFixed(0)
                              : '0';
                            const timeLabel = timePeriod.format === 'quarter' ? 'QoQ' : timePeriod.format === 'year' ? 'YoY' : 'MoM';
                            
                            appSpans.push(
                              <div
                                key={`span-${currentIndex}`}
                                style={{ width: `${width}px` }}
                                className={`rounded px-3 py-2 flex-shrink-0 cursor-default ${
                                  hasScore 
                                    ? 'bg-slate-50 border border-slate-300' 
                                    : 'bg-slate-100 border border-dashed border-slate-400 opacity-50'
                                }`}
                              >
                                <div className="flex flex-col items-center">
                                  <span className={`font-semibold text-[11px] mb-1 text-center leading-tight max-w-full px-1 ${
                                    hasScore ? 'text-slate-900' : 'text-slate-500'
                                  }`}>
                                    {currentTouchpoint.app}
                                  </span>
                                  {hasScore ? (
                                    <>
                                      <span className={`text-sm font-semibold ${getScoreColor(app.score)}`}>
                                        {app.score}
                                      </span>
                                      {app.prevScore && (
                                        <span className={`text-[10px] font-medium ${
                                          appDiff > 0 ? 'text-green-700' : appDiff < 0 ? 'text-red-700' : 'text-slate-500'
                                        }`}>
                                          {appDiff > 0 ? '+' : ''}{appDiffPercent}% {timeLabel}
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-sm font-medium text-slate-400">Not tracked</span>
                                  )}
                                </div>
                              </div>
                            );
                            
                            currentIndex += spanCount;
                          }
                          
                          return appSpans;
                        })()}
                      </div>
                    </div>
                  </>
                );
              })()}
                </div>
              </div>
            </div>
          </Card>
        </section>


        {/* Journey Score Trend */}
        <section className="mb-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-1">Journey Score Trend</h2>
            <p className="text-sm text-slate-600">
              Track overall journey performance over time. Toggle between Overall, By App, or By Step views to identify specific performance drivers. 
              The orange line represents the overall journey benchmark in all views.
            </p>
          </div>

          <Card className="p-6 border-slate-200">
            {/* View Toggle */}
            <div className="mb-4 flex items-center gap-1 border border-slate-300 rounded-md p-1 w-fit">
              <Button
                size="sm"
                variant={trendView === 'overall' ? 'default' : 'ghost'}
                onClick={() => handleViewChange('overall')}
                className={
                  trendView === 'overall'
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'hover:bg-slate-100'
                }
              >
                Overall
              </Button>
              <Button
                size="sm"
                variant={trendView === 'by-app' ? 'default' : 'ghost'}
                onClick={() => handleViewChange('by-app')}
                className={
                  trendView === 'by-app'
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'hover:bg-slate-100'
                }
              >
                By App
              </Button>
              <Button
                size="sm"
                variant={trendView === 'by-step' ? 'default' : 'ghost'}
                onClick={() => handleViewChange('by-step')}
                className={
                  trendView === 'by-step'
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'hover:bg-slate-100'
                }
              >
                By Step
              </Button>
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getTrendChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" stroke="#64748b" />
                <YAxis domain={[0, 100]} stroke="#64748b" />
                <Tooltip />
                <Legend content={<CustomLegend />} />
                {/* Overall line - dynamic styling based on focus */}
                {trendView === 'overall' ? (
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#ea580c" 
                    strokeWidth={getLineStyle('score').strokeWidth}
                    name="Journey Score" 
                    dot={getDotStyle('score')}
                  />
                ) : (
                  <Line 
                    type="monotone" 
                    dataKey="overall" 
                    stroke="#ea580c" 
                    strokeWidth={getLineStyle('overall').strokeWidth}
                    name="Overall Journey" 
                    dot={getDotStyle('overall')}
                  />
                )}
                {/* Individual lines based on view */}
                {getTrendChartLines().map((line, index) => (
                  <Line 
                    key={line} 
                    type="monotone" 
                    dataKey={line} 
                    stroke={getLineColor(line, index)} 
                    strokeWidth={getLineStyle(line).strokeWidth} 
                    name={line}
                    dot={getDotStyle(line)}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>

            {/* Detailed Table Toggle */}
            <div className="mt-6 border-t border-slate-200 pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetailedTable(!showDetailedTable)}
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              >
                {showDetailedTable ? '− Hide' : '+ View'} detailed table
              </Button>

              {showDetailedTable && (
                <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-slate-700 font-semibold">
                          {trendView === 'overall' ? 'Metric' : trendView === 'by-app' ? 'Application' : 'Step'}
                        </th>
                        {periods.map((period) => (
                          <th key={period} className="px-4 py-3 text-center text-slate-700 font-semibold">
                            {period}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {trendView === 'overall' ? (
                        <tr className="border-b border-slate-200">
                          <td className="px-4 py-3 font-semibold text-slate-900">Journey Score</td>
                          {currentData.map((data) => (
                            <td key={data.period} className="px-4 py-3 text-center text-slate-700">
                              {data.score}
                            </td>
                          ))}
                        </tr>
                      ) : (
                        <>
                          <tr className="border-b border-slate-200 bg-orange-50">
                            <td className="px-4 py-3 font-semibold text-slate-900">Overall Journey</td>
                            {getTrendChartData().map((data) => (
                              <td key={data.period} className="px-4 py-3 text-center font-semibold text-slate-900">
                                {data.overall}
                              </td>
                            ))}
                          </tr>
                          {getTrendChartLines().map((line) => (
                            <tr key={line} className="border-b border-slate-200 hover:bg-slate-50">
                              <td className="px-4 py-3 text-slate-900">{line}</td>
                              {getTrendChartData().map((data) => (
                                <td key={data.period} className="px-4 py-3 text-center text-slate-700">
                                  {data[line as keyof typeof data]}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* Journey-Specific Feedback Themes */}
        <section className="mb-8">
          <ScoreDriversThemes 
            themes={feedbackThemes} 
            density="standard"
            title="JOURNEY FEEDBACK THEMES"
            subtitle="Cross-app experience insights"
          />
        </section>
      </div>
    </div>
  );
}