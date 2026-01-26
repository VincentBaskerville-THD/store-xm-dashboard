// All-apps time grid: interactive matrix of scores by period.
// Uses mock data to illustrate filtering, drill-in details, and role-based views.
import { useState } from 'react';
import { ArrowLeft, FileDown, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card } from './ui/card';
import { mockApps, getScoreColor, getScoreBgColor } from '../data/mockData';
import type { TimePeriod } from '../App';
import type { TimePeriodData } from './TimeSelector';
import { TimeSelector } from './TimeSelector';

interface AllAppsTimeGridProps {
  timePeriod: TimePeriodData;
  onTimePeriodChange: (period: TimePeriodData) => void;
  onNavigateBack: () => void;
  onNavigateToApp: (appId: string) => void;
  role: 'executive' | 'practitioner';
}

type TimeLens = 'month' | 'quarter' | 'year';
type CellDetailLevel = 'score-only' | 'score-change' | 'score-change-responses' | 'full';

interface CellData {
  appId: string;
  period: string;
  score: number;
  change: number;
  responses: number;
  easeOfUse: number;
  usefulness: number;
}

interface DriverData {
  driver: string;
  score: number;
  change: number;
}

interface FeedbackTheme {
  type: 'positive' | 'negative';
  text: string;
  mentions: number;
}

export function AllAppsTimeGrid({ timePeriod, onTimePeriodChange, onNavigateBack, onNavigateToApp, role }: AllAppsTimeGridProps) {
  const [timeLens, setTimeLens] = useState<TimeLens>('month');
  const [selectedCell, setSelectedCell] = useState<CellData | null>(null);
  const [cellDetailLevel, setCellDetailLevel] = useState<CellDetailLevel>('score-change');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'good' | 'fair' | 'needs-improvement'>('all');

  // Mock data generator for cells (placeholder for future real metrics).
  const generateCellData = (appId: string, period: string): CellData => {
    const app = mockApps.find((a) => a.id === appId)!;
    const randomVariation = Math.floor(Math.random() * 10) - 5;
    return {
      appId,
      period,
      score: Math.max(0, Math.min(100, app.overallScore + randomVariation)),
      change: Math.floor(Math.random() * 10) - 3,
      responses: app.responses + Math.floor(Math.random() * 50) - 25,
      easeOfUse: app.easeOfUse + (Math.random() * 0.4 - 0.2),
      usefulness: app.usefulness + (Math.random() * 0.4 - 0.2),
    };
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const quarters = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];
  const years = ['2021', '2022', '2023', '2024', '2025'];

  const getMonthsInQuarter = (quarterIndex: number) => {
    return months.slice(quarterIndex * 3, quarterIndex * 3 + 3);
  };

  // Apply score filter in practitioner mode to keep the grid focused.
  const filteredApps = mockApps.filter((app) => {
    if (scoreFilter === 'good') return app.overallScore >= 65;
    if (scoreFilter === 'fair') return app.overallScore >= 50 && app.overallScore < 65;
    if (scoreFilter === 'needs-improvement') return app.overallScore < 50;
    return true;
  });

  // Clicking a cell populates the right-side detail drawer.
  const handleCellClick = (appId: string, period: string) => {
    const cellData = generateCellData(appId, period);
    setSelectedCell(cellData);
  };

  const getDriversForCell = (cellData: CellData): DriverData[] => {
    return [
      { driver: 'Ease of Use', score: cellData.easeOfUse, change: Math.random() * 0.6 - 0.3 },
      { driver: 'Usefulness', score: cellData.usefulness, change: Math.random() * 0.6 - 0.3 },
      { driver: 'Performance', score: 4.0 + Math.random() * 0.4 - 0.2, change: Math.random() * 0.4 - 0.2 },
      { driver: 'Reliability', score: 3.9 + Math.random() * 0.4 - 0.2, change: Math.random() * 0.4 - 0.2 },
    ];
  };

  const getFeedbackThemes = (): FeedbackTheme[] => {
    return [
      { type: 'positive', text: 'Faster load times', mentions: 23 },
      { type: 'positive', text: 'Intuitive navigation', mentions: 18 },
      { type: 'negative', text: 'Mobile bugs', mentions: 12 },
      { type: 'negative', text: 'Missing features', mentions: 8 },
    ];
  };

  const navigateToPreviousPeriod = () => {
    if (!selectedCell) return;
    const currentIndex = months.indexOf(selectedCell.period);
    if (currentIndex > 0) {
      const newPeriod = months[currentIndex - 1];
      setSelectedCell(generateCellData(selectedCell.appId, newPeriod));
    }
  };

  const navigateToNextPeriod = () => {
    if (!selectedCell) return;
    const currentIndex = months.indexOf(selectedCell.period);
    if (currentIndex < months.length - 1) {
      const newPeriod = months[currentIndex + 1];
      setSelectedCell(generateCellData(selectedCell.appId, newPeriod));
    }
  };

  const isExecutive = role === 'executive';

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto max-w-[1600px] px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onNavigateBack} className="text-white hover:bg-slate-800">
                <ArrowLeft className="size-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="font-semibold">All Apps Over Time</h1>
                <p className="text-slate-300 mt-1">
                  {isExecutive ? 'Executive overview' : 'Detailed practitioner view'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
                <FileDown className="size-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-8 py-8">
        {/* Time Lens Toggle */}
        <section className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant={timeLens === 'month' ? 'default' : 'outline'}
                onClick={() => setTimeLens('month')}
                className={timeLens === 'month' ? 'bg-orange-600 hover:bg-orange-700' : ''}
              >
                Month
              </Button>
              <Button
                variant={timeLens === 'quarter' ? 'default' : 'outline'}
                onClick={() => setTimeLens('quarter')}
                className={timeLens === 'quarter' ? 'bg-orange-600 hover:bg-orange-700' : ''}
              >
                Quarter
              </Button>
              <Button
                variant={timeLens === 'year' ? 'default' : 'outline'}
                onClick={() => setTimeLens('year')}
                className={timeLens === 'year' ? 'bg-orange-600 hover:bg-orange-700' : ''}
              >
                Year
              </Button>
            </div>

            {!isExecutive && (
              <div className="flex gap-4">
                <Select value={scoreFilter} onValueChange={(value: any) => setScoreFilter(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Apps</SelectItem>
                    <SelectItem value="good">Good (≥65)</SelectItem>
                    <SelectItem value="fair">Fair (50-64)</SelectItem>
                    <SelectItem value="needs-improvement">Needs Improvement (&lt;50)</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={cellDetailLevel} onValueChange={(value: any) => setCellDetailLevel(value)}>
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score-only">Score Only</SelectItem>
                    <SelectItem value="score-change">Score + Change</SelectItem>
                    <SelectItem value="score-change-responses">Score + Change + Responses</SelectItem>
                    <SelectItem value="full">Full Detail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </section>

        {/* Summary Stats Row */}
        <section className="mb-6">
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4 border-slate-200">
              <div className="text-slate-600 mb-1">Portfolio Avg (Current)</div>
              <div className="text-slate-900 font-semibold">74</div>
            </Card>
            <Card className="p-4 border-slate-200">
              <div className="text-slate-600 mb-1">Apps Trending Up</div>
              <div className="text-green-600 font-semibold">12/16 (75%)</div>
            </Card>
            <Card className="p-4 border-slate-200">
              <div className="text-slate-600 mb-1">Apps Trending Down</div>
              <div className="text-red-600 font-semibold">3/16 (19%)</div>
            </Card>
            <Card className="p-4 border-slate-200">
              <div className="text-slate-600 mb-1">Avg Responses/Period</div>
              <div className="text-slate-900 font-semibold">287</div>
            </Card>
          </div>
        </section>

        {/* Time Grid Table */}
        <section className="mb-8">
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-slate-100">
                  {timeLens === 'month' && (
                    <>
                      {/* Quarter headers */}
                      <tr>
                        <th className="px-4 py-2 text-left border-r border-slate-300 bg-slate-100 sticky left-0 z-10">
                          Application
                        </th>
                        {[0, 1, 2, 3].map((qIndex) => (
                          <th
                            key={qIndex}
                            colSpan={3}
                            className={`px-4 py-2 text-center border-r border-slate-300 ${
                              qIndex % 2 === 0 ? 'bg-slate-200' : 'bg-slate-150'
                            }`}
                          >
                            Q{qIndex + 1} 2025
                          </th>
                        ))}
                      </tr>
                      {/* Month headers */}
                      <tr>
                        <th className="px-4 py-2 border-r border-slate-300 bg-slate-100 sticky left-0 z-10"></th>
                        {[0, 1, 2, 3].map((qIndex) =>
                          getMonthsInQuarter(qIndex).map((month, mIndex) => (
                            <th
                              key={`${qIndex}-${mIndex}`}
                              className={`px-3 py-2 text-center border-l border-slate-200 text-slate-700 ${
                                qIndex % 2 === 0 ? 'bg-slate-100' : 'bg-white'
                              }`}
                            >
                              {month}
                            </th>
                          ))
                        )}
                      </tr>
                    </>
                  )}
                  {timeLens === 'quarter' && (
                    <tr>
                      <th className="px-4 py-2 text-left border-r border-slate-300 bg-slate-100 sticky left-0 z-10">
                        Application
                      </th>
                      {quarters.map((quarter) => (
                        <th key={quarter} className="px-4 py-2 text-center border-l border-slate-200 text-slate-700">
                          {quarter}
                        </th>
                      ))}
                    </tr>
                  )}
                  {timeLens === 'year' && (
                    <tr>
                      <th className="px-4 py-2 text-left border-r border-slate-300 bg-slate-100 sticky left-0 z-10">
                        Application
                      </th>
                      {years.map((year) => (
                        <th key={year} className="px-4 py-2 text-center border-l border-slate-200 text-slate-700">
                          {year}
                        </th>
                      ))}
                    </tr>
                  )}
                </thead>
                <tbody>
                  {filteredApps.map((app, appIndex) => (
                    <tr key={app.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 border-r border-slate-300 text-slate-900 font-semibold bg-white sticky left-0 z-10">
                        {app.name}
                      </td>

                      {timeLens === 'month' &&
                        [0, 1, 2, 3].map((qIndex) =>
                          getMonthsInQuarter(qIndex).map((month, mIndex) => {
                            const cellData = generateCellData(app.id, month);
                            return (
                              <td
                                key={`${qIndex}-${mIndex}`}
                                className={`px-2 py-3 text-center border-l border-slate-200 cursor-pointer hover:bg-orange-50 ${
                                  qIndex % 2 === 0 ? 'bg-slate-50' : 'bg-white'
                                }`}
                                onClick={() => handleCellClick(app.id, month)}
                              >
                                <div className="flex flex-col items-center gap-1">
                                  <span
                                    className={`inline-flex items-center justify-center px-2 py-1 rounded text-sm font-semibold ${getScoreBgColor(cellData.score)} ${getScoreColor(cellData.score)}`}
                                  >
                                    {cellData.score}
                                  </span>
                                  {(cellDetailLevel === 'score-change' ||
                                    cellDetailLevel === 'score-change-responses' ||
                                    cellDetailLevel === 'full') && (
                                    <span
                                      className={`text-xs ${
                                        cellData.change > 0
                                          ? 'text-green-600'
                                          : cellData.change < 0
                                            ? 'text-red-600'
                                            : 'text-gray-600'
                                      }`}
                                    >
                                      {cellData.change > 0 ? '+' : ''}
                                      {cellData.change} {cellData.change > 0 ? '↑' : cellData.change < 0 ? '↓' : '→'}
                                    </span>
                                  )}
                                  {(cellDetailLevel === 'score-change-responses' || cellDetailLevel === 'full') && (
                                    <span className="text-xs text-slate-500">{cellData.responses} resp</span>
                                  )}
                                  {cellDetailLevel === 'full' && (
                                    <div className="text-xs text-slate-600 mt-1">
                                      <div>EU: {cellData.easeOfUse.toFixed(1)}</div>
                                      <div>UF: {cellData.usefulness.toFixed(1)}</div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })
                        )}

                      {timeLens === 'quarter' &&
                        quarters.map((quarter) => {
                          const cellData = generateCellData(app.id, quarter);
                          return (
                            <td
                              key={quarter}
                              className="px-3 py-3 text-center border-l border-slate-200 cursor-pointer hover:bg-orange-50"
                              onClick={() => handleCellClick(app.id, quarter)}
                            >
                              <div className="flex flex-col items-center gap-1">
                                <span
                                  className={`inline-flex items-center justify-center px-3 py-1 rounded font-semibold ${getScoreBgColor(cellData.score)} ${getScoreColor(cellData.score)}`}
                                >
                                  {cellData.score}
                                </span>
                                {!isExecutive && (
                                  <>
                                    <span
                                      className={`${
                                        cellData.change > 0
                                          ? 'text-green-600'
                                          : cellData.change < 0
                                            ? 'text-red-600'
                                            : 'text-gray-600'
                                      }`}
                                    >
                                      {cellData.change > 0 ? '+' : ''}
                                      {cellData.change} {cellData.change > 0 ? '↑' : cellData.change < 0 ? '↓' : '→'}
                                    </span>
                                    <span className="text-slate-500">{cellData.responses} resp</span>
                                  </>
                                )}
                              </div>
                            </td>
                          );
                        })}

                      {timeLens === 'year' &&
                        years.map((year) => {
                          const cellData = generateCellData(app.id, year);
                          return (
                            <td
                              key={year}
                              className="px-3 py-3 text-center border-l border-slate-200 cursor-pointer hover:bg-orange-50"
                              onClick={() => handleCellClick(app.id, year)}
                            >
                              <div className="flex flex-col items-center gap-1">
                                <span
                                  className={`inline-flex items-center justify-center px-3 py-1 rounded font-semibold ${getScoreBgColor(cellData.score)} ${getScoreColor(cellData.score)}`}
                                >
                                  {cellData.score}
                                </span>
                                {!isExecutive && (
                                  <>
                                    <span
                                      className={`${
                                        cellData.change > 0
                                          ? 'text-green-600'
                                          : cellData.change < 0
                                            ? 'text-red-600'
                                            : 'text-gray-600'
                                      }`}
                                    >
                                      {cellData.change > 0 ? '+' : ''}
                                      {cellData.change} {cellData.change > 0 ? '↑' : cellData.change < 0 ? '↓' : '→'}
                                    </span>
                                    <span className="text-slate-500">{cellData.responses} resp</span>
                                  </>
                                )}
                              </div>
                            </td>
                          );
                        })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* Side Panel */}
      {selectedCell && (
        <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-2xl border-l border-slate-200 z-50 overflow-y-auto">
          <div className="sticky top-0 bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">
                {mockApps.find((a) => a.id === selectedCell.appId)?.name} — {selectedCell.period}
              </h2>
              <p className="text-slate-300 mt-1">Score drivers and feedback</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedCell(null)} className="text-white">
              <X className="size-4" />
            </Button>
          </div>

          <div className="p-6 space-y-6">
            {/* Score Summary */}
            <section>
              <h3 className="text-slate-900 mb-3">Overall Score</h3>
              <div className="flex items-baseline gap-3">
                <span className={`text-[48px] font-semibold ${getScoreColor(selectedCell.score)}`}>
                  {selectedCell.score}
                </span>
                <span className="text-slate-500">/100</span>
              </div>
              <div
                className={`mt-2 ${
                  selectedCell.change > 0 ? 'text-green-600' : selectedCell.change < 0 ? 'text-red-600' : 'text-gray-600'
                }`}
              >
                {selectedCell.change > 0 ? '+' : ''}
                {selectedCell.change} pts vs previous period
              </div>
              <div className="text-slate-600 mt-1">{selectedCell.responses} responses</div>
            </section>

            {/* Period Navigation */}
            <section className="flex gap-2">
              <Button variant="outline" size="sm" onClick={navigateToPreviousPeriod} className="flex-1">
                <ChevronLeft className="size-4 mr-1" />
                Previous Period
              </Button>
              <Button variant="outline" size="sm" onClick={navigateToNextPeriod} className="flex-1">
                Next Period
                <ChevronRight className="size-4 ml-1" />
              </Button>
            </section>

            {/* Score Drivers */}
            <section>
              <h3 className="text-slate-900 mb-3">Score Drivers</h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-slate-700">Driver</th>
                      <th className="px-4 py-2 text-center text-slate-700">Score</th>
                      <th className="px-4 py-2 text-center text-slate-700">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getDriversForCell(selectedCell).map((driver, index) => (
                      <tr key={index} className="border-b border-slate-200">
                        <td className="px-4 py-3 text-slate-900">{driver.driver}</td>
                        <td className="px-4 py-3 text-center text-slate-900 font-semibold">
                          {driver.score.toFixed(1)}
                        </td>
                        <td
                          className={`px-4 py-3 text-center ${
                            driver.change > 0 ? 'text-green-600' : driver.change < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}
                        >
                          {driver.change > 0 ? '+' : ''}
                          {driver.change.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Feedback Themes */}
            <section>
              <h3 className="text-slate-900 mb-3">
                {isExecutive ? 'Top Feedback Themes' : 'Feedback Themes (Categorized)'}
              </h3>
              <div className="space-y-3">
                {getFeedbackThemes()
                  .slice(0, isExecutive ? 3 : 4)
                  .map((theme, index) => (
                    <Card
                      key={index}
                      className={`p-3 ${
                        theme.type === 'positive'
                          ? 'border-green-200 bg-green-50'
                          : 'border-orange-200 bg-orange-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={theme.type === 'positive' ? 'text-green-900' : 'text-orange-900'}>
                            {theme.type === 'positive' ? '🟢' : '🔴'}
                          </span>
                          <span
                            className={`font-semibold ${
                              theme.type === 'positive' ? 'text-green-900' : 'text-orange-900'
                            }`}
                          >
                            {theme.text}
                          </span>
                        </div>
                        <span
                          className={`${theme.type === 'positive' ? 'text-green-700' : 'text-orange-700'}`}
                        >
                          {theme.mentions} mentions
                        </span>
                      </div>
                    </Card>
                  ))}
              </div>
            </section>

            {!isExecutive && (
              <section>
                <h3 className="text-slate-900 mb-3">Response Distribution</h3>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const percentage = rating === 5 ? 45 : rating === 4 ? 30 : rating === 3 ? 15 : rating === 2 ? 7 : 3;
                    return (
                      <div key={rating} className="flex items-center gap-3">
                        <span className="text-slate-700 w-12">{rating} star{rating !== 1 ? 's' : ''}</span>
                        <div className="flex-1 bg-slate-200 rounded-full h-6">
                          <div
                            className="bg-orange-500 h-6 rounded-full flex items-center justify-end pr-2"
                            style={{ width: `${percentage}%` }}
                          >
                            <span className="text-white text-xs font-semibold">{percentage}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}