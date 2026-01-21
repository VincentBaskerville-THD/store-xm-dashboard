import { ArrowLeft, FileDown } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { mockJourneys, getScoreColor, getScoreBgColor, getTrendIcon, getTrendColor } from '../data/mockData';
import type { TimePeriodData } from './TimeSelector';
import { TimeSelector } from './TimeSelector';
import { NavigationHeader } from './NavigationHeader';

interface AllJourneysViewProps {
  timePeriod: TimePeriodData;
  onTimePeriodChange: (period: TimePeriodData) => void;
  onNavigateToJourney: (journeyId: string) => void;
  onNavigateBack: () => void;
  onNavigateHome?: () => void;
  onNavigateAllApps?: () => void;
  onNavigateKeyJourneys?: () => void;
  onNavigateTopPains?: () => void;
}

export function AllJourneysView({
  timePeriod,
  onTimePeriodChange,
  onNavigateToJourney,
  onNavigateBack,
  onNavigateHome,
  onNavigateAllApps,
  onNavigateKeyJourneys,
  onNavigateTopPains,
}: AllJourneysViewProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <NavigationHeader
        currentView="key-journeys"
        onNavigateHome={onNavigateHome || onNavigateBack}
        onNavigateAllApps={onNavigateAllApps || onNavigateBack}
        onNavigateKeyJourneys={onNavigateKeyJourneys || (() => {})}
        onNavigateTopPains={onNavigateTopPains || onNavigateBack}
        title="All Journeys"
        subtitle="End-to-end journey performance"
        showExportButton={true}
      />


      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <section className="mb-8">
          <h2 className="text-slate-900 mb-4">Journey Performance Table</h2>
          
          {/* Desktop Table */}
          <div className="hidden lg:block border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-slate-700">Journey Name</th>
                  <th className="px-6 py-3 text-center text-slate-700">Overall Score</th>
                  <th className="px-6 py-3 text-center text-slate-700">3-Month Trend</th>
                  <th className="px-6 py-3 text-center text-slate-700"># Touchpoints</th>
                  <th className="px-6 py-3 text-center text-slate-700">Apps Involved</th>
                </tr>
              </thead>
              <tbody>
                {mockJourneys.map((journey) => (
                  <tr
                    key={journey.id}
                    className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer"
                    onClick={() => onNavigateToJourney(journey.id)}
                  >
                    <td className="px-6 py-4 text-slate-900">{journey.name}</td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center px-3 py-1 rounded ${getScoreBgColor(journey.overallScore)} ${getScoreColor(journey.overallScore)} font-semibold`}
                      >
                        {journey.overallScore}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-center font-semibold ${getTrendColor(journey.trend)}`}>
                      {getTrendIcon(journey.trend)} {journey.trendValue > 0 ? '+' : ''}{journey.trendValue} ({journey.trendPercentage > 0 ? '+' : ''}{journey.trendPercentage}%)
                    </td>
                    <td className="px-6 py-4 text-center text-slate-700">{journey.touchpoints}</td>
                    <td className="px-6 py-4 text-center text-slate-700">{journey.appsInvolved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Cards */}
          <div className="lg:hidden space-y-4">
            {mockJourneys.map((journey) => (
              <div
                key={journey.id}
                className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 cursor-pointer"
                onClick={() => onNavigateToJourney(journey.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-slate-900 font-medium flex-1 pr-2">{journey.name}</h3>
                  <span
                    className={`inline-flex items-center justify-center px-3 py-1 rounded ${getScoreBgColor(journey.overallScore)} ${getScoreColor(journey.overallScore)} font-semibold text-sm`}
                  >
                    {journey.overallScore}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Touchpoints:</span>
                    <span className="ml-2 text-slate-900 font-medium">{journey.touchpoints}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Apps:</span>
                    <span className="ml-2 text-slate-900 font-medium">{journey.appsInvolved}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Trend:</span>
                    <span className={`ml-2 font-semibold ${getTrendColor(journey.trend)}`}>
                      {getTrendIcon(journey.trend)} {journey.trendValue > 0 ? '+' : ''}{journey.trendValue} ({journey.trendPercentage > 0 ? '+' : ''}{journey.trendPercentage}%)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}