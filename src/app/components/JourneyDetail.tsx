import { ArrowLeft, FileDown } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card } from './ui/card';
import { mockJourneys, mockApps, getScoreColor, getScoreBgColor } from '../data/mockData';
import type { TimePeriod } from '../App';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useState } from 'react';

interface JourneyDetailProps {
  journeyId: string;
  timePeriod: TimePeriod;
  onTimePeriodChange: (period: TimePeriod) => void;
  onNavigateBack: () => void;
}

type TrendView = 'overall' | 'by-app' | 'by-step';

export function JourneyDetail({ journeyId, timePeriod, onTimePeriodChange, onNavigateBack }: JourneyDetailProps) {
  const [trendView, setTrendView] = useState<TrendView>('overall');
  const [showDetailedTable, setShowDetailedTable] = useState(false);
  
  const journey = mockJourneys.find((j) => j.id === journeyId);

  if (!journey) {
    return <div>Journey not found</div>;
  }

  const temporalData = [
    { month: 'May', score: journey.overallScore - 6 },
    { month: 'Jun', score: journey.overallScore - 4 },
    { month: 'Jul', score: journey.overallScore - 3 },
    { month: 'Aug', score: journey.overallScore - 2 },
    { month: 'Sep', score: journey.overallScore - 1 },
    { month: 'Oct', score: journey.overallScore },
    { month: 'Nov', score: journey.overallScore },
  ];

  // Mock data for app-level trends
  const appTrendData = [
    { month: 'May', overall: journey.overallScore - 6, '1Returns': 74, 'Inventory Manager': 67, 'Order Up': 65, 'Customer Portal': 62 },
    { month: 'Jun', overall: journey.overallScore - 4, '1Returns': 76, 'Inventory Manager': 69, 'Order Up': 66, 'Customer Portal': 64 },
    { month: 'Jul', overall: journey.overallScore - 3, '1Returns': 77, 'Inventory Manager': 70, 'Order Up': 67, 'Customer Portal': 66 },
    { month: 'Aug', overall: journey.overallScore - 2, '1Returns': 78, 'Inventory Manager': 72, 'Order Up': 68, 'Customer Portal': 67 },
    { month: 'Sep', overall: journey.overallScore - 1, '1Returns': 79, 'Inventory Manager': 73, 'Order Up': 69, 'Customer Portal': 68 },
    { month: 'Oct', overall: journey.overallScore, '1Returns': 80, 'Inventory Manager': 74, 'Order Up': 70, 'Customer Portal': 69 },
    { month: 'Nov', overall: journey.overallScore, '1Returns': 81, 'Inventory Manager': 75, 'Order Up': 70, 'Customer Portal': 70 },
  ];

  // Mock data for step-level trends
  const stepTrendData = [
    { month: 'May', overall: journey.overallScore - 6, 'Initiate Return': 78, 'Verify Product': 71, 'Process Refund': 65, 'Update Customer Record': 62, 'Generate Return Label': 75, 'Confirm Receipt': 72 },
    { month: 'Jun', overall: journey.overallScore - 4, 'Initiate Return': 79, 'Verify Product': 72, 'Process Refund': 67, 'Update Customer Record': 64, 'Generate Return Label': 76, 'Confirm Receipt': 73 },
    { month: 'Jul', overall: journey.overallScore - 3, 'Initiate Return': 80, 'Verify Product': 73, 'Process Refund': 68, 'Update Customer Record': 65, 'Generate Return Label': 77, 'Confirm Receipt': 74 },
    { month: 'Aug', overall: journey.overallScore - 2, 'Initiate Return': 81, 'Verify Product': 74, 'Process Refund': 69, 'Update Customer Record': 66, 'Generate Return Label': 78, 'Confirm Receipt': 75 },
    { month: 'Sep', overall: journey.overallScore - 1, 'Initiate Return': 81, 'Verify Product': 74, 'Process Refund': 70, 'Update Customer Record': 67, 'Generate Return Label': 78, 'Confirm Receipt': 75 },
    { month: 'Oct', overall: journey.overallScore, 'Initiate Return': 82, 'Verify Product': 75, 'Process Refund': 71, 'Update Customer Record': 68, 'Generate Return Label': 79, 'Confirm Receipt': 76 },
    { month: 'Nov', overall: journey.overallScore, 'Initiate Return': 82, 'Verify Product': 75, 'Process Refund': 71, 'Update Customer Record': 68, 'Generate Return Label': 79, 'Confirm Receipt': 76 },
  ];

  // Colorblind-friendly palette for multiple lines
  const appColors = ['#ea580c', '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1'];
  const stepColors = ['#ea580c', '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1'];

  // Get the appropriate data and keys based on view
  const getChartData = () => {
    if (trendView === 'by-app') return appTrendData;
    if (trendView === 'by-step') return stepTrendData;
    return temporalData;
  };

  const getChartLines = () => {
    if (trendView === 'by-app') {
      return ['1Returns', 'Inventory Manager', 'Order Up', 'Customer Portal'];
    }
    if (trendView === 'by-step') {
      return ['Initiate Return', 'Verify Product', 'Process Refund', 'Update Customer Record', 'Generate Return Label', 'Confirm Receipt'];
    }
    return [];
  };

  const touchpointData = [
    { touchpoint: 'Initiate Return', score: 82, app: '1Returns' },
    { touchpoint: 'Verify Product', score: 75, app: 'Inventory Manager' },
    { touchpoint: 'Process Refund', score: 71, app: 'Order Up' },
    { touchpoint: 'Update Customer Record', score: 68, app: 'Customer Portal' },
    { touchpoint: 'Generate Return Label', score: 79, app: '1Returns' },
    { touchpoint: 'Track Return Shipment', score: 73, app: 'Shipping Manager' },
    { touchpoint: 'Confirm Receipt', score: 76, app: 'Fulfillment Hub' },
    { touchpoint: 'Close Return Case', score: 77, app: '1Returns' },
  ];

  const involvedApps = ['1Returns', 'Inventory Manager', 'Order Up', 'Customer Portal'];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onNavigateBack} className="text-white hover:bg-slate-800">
                <ArrowLeft className="size-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="font-semibold">{journey.name}</h1>
                <p className="text-slate-300 mt-1">Journey performance detail</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Select value={timePeriod} onValueChange={(value) => onTimePeriodChange(value as TimePeriod)}>
                <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="November 2025">November 2025</SelectItem>
                  <SelectItem value="October 2025">October 2025</SelectItem>
                  <SelectItem value="Q4 2025">Q4 2025</SelectItem>
                  <SelectItem value="Q3 2025">Q3 2025</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
                <FileDown className="size-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-8 py-8">
        {/* Journey Summary */}
        <section className="mb-8">
          <div className="grid grid-cols-4 gap-6">
            <Card className="p-6 border-slate-200">
              <h3 className="text-slate-600 mb-2">Overall Score</h3>
              <div className="flex items-baseline gap-2">
                <span className={`text-[40px] font-semibold ${getScoreColor(journey.overallScore)}`}>
                  {journey.overallScore}
                </span>
                <span className="text-slate-500">/100</span>
              </div>
            </Card>

            <Card className="p-6 border-slate-200">
              <h3 className="text-slate-600 mb-2">Touchpoints</h3>
              <div className="text-[40px] font-semibold text-slate-900">{journey.touchpoints}</div>
            </Card>

            <Card className="p-6 border-slate-200">
              <h3 className="text-slate-600 mb-2">Apps Involved</h3>
              <div className="text-[40px] font-semibold text-slate-900">{journey.appsInvolved}</div>
            </Card>

            <Card className="p-6 border-slate-200">
              <h3 className="text-slate-600 mb-2">Completion Rate</h3>
              <div className="text-[40px] font-semibold text-slate-900">87%</div>
            </Card>
          </div>
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
                onClick={() => setTrendView('overall')}
                className={`${
                  trendView === 'overall'
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'hover:bg-slate-100'
                }`}
              >
                Overall
              </Button>
              <Button
                size="sm"
                variant={trendView === 'by-app' ? 'default' : 'ghost'}
                onClick={() => setTrendView('by-app')}
                className={`${
                  trendView === 'by-app'
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'hover:bg-slate-100'
                }`}
              >
                By App
              </Button>
              <Button
                size="sm"
                variant={trendView === 'by-step' ? 'default' : 'ghost'}
                onClick={() => setTrendView('by-step')}
                className={`${
                  trendView === 'by-step'
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'hover:bg-slate-100'
                }`}
              >
                By Step
              </Button>
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis domain={[0, 100]} stroke="#64748b" />
                <Tooltip />
                <Legend />
                {/* Overall line - always shown, thicker */}
                {trendView === 'overall' ? (
                  <Line type="monotone" dataKey="score" stroke="#ea580c" strokeWidth={3} name="Journey Score" />
                ) : (
                  <Line type="monotone" dataKey="overall" stroke="#ea580c" strokeWidth={3} name="Overall Journey" />
                )}
                {/* Individual lines based on view */}
                {getChartLines().map((line, index) => (
                  <Line 
                    key={line} 
                    type="monotone" 
                    dataKey={line} 
                    stroke={trendView === 'by-app' ? appColors[index + 1] : stepColors[index + 1]} 
                    strokeWidth={1.5} 
                    name={line} 
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
                        <th className="px-4 py-3 text-center text-slate-700 font-semibold">May</th>
                        <th className="px-4 py-3 text-center text-slate-700 font-semibold">Jun</th>
                        <th className="px-4 py-3 text-center text-slate-700 font-semibold">Jul</th>
                        <th className="px-4 py-3 text-center text-slate-700 font-semibold">Aug</th>
                        <th className="px-4 py-3 text-center text-slate-700 font-semibold">Sep</th>
                        <th className="px-4 py-3 text-center text-slate-700 font-semibold">Oct</th>
                        <th className="px-4 py-3 text-center text-slate-700 font-semibold">Nov</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trendView === 'overall' ? (
                        <tr className="border-b border-slate-200">
                          <td className="px-4 py-3 font-semibold text-slate-900">Journey Score</td>
                          {temporalData.map((data) => (
                            <td key={data.month} className="px-4 py-3 text-center text-slate-700">
                              {data.score}
                            </td>
                          ))}
                        </tr>
                      ) : (
                        <>
                          <tr className="border-b border-slate-200 bg-orange-50">
                            <td className="px-4 py-3 font-semibold text-slate-900">Overall Journey</td>
                            {(trendView === 'by-app' ? appTrendData : stepTrendData).map((data) => (
                              <td key={data.month} className="px-4 py-3 text-center font-semibold text-slate-900">
                                {data.overall}
                              </td>
                            ))}
                          </tr>
                          {getChartLines().map((line) => (
                            <tr key={line} className="border-b border-slate-200 hover:bg-slate-50">
                              <td className="px-4 py-3 text-slate-900">{line}</td>
                              {(trendView === 'by-app' ? appTrendData : stepTrendData).map((data) => (
                                <td key={data.month} className="px-4 py-3 text-center text-slate-700">
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

        {/* Touchpoint Breakdown */}
        <section className="mb-8">
          <h2 className="text-slate-900 mb-4">Touchpoint Breakdown</h2>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-slate-700">Step</th>
                  <th className="px-6 py-3 text-left text-slate-700">Touchpoint</th>
                  <th className="px-6 py-3 text-left text-slate-700">Application</th>
                  <th className="px-6 py-3 text-center text-slate-700">Score</th>
                </tr>
              </thead>
              <tbody>
                {touchpointData.map((touchpoint, index) => (
                  <tr key={index} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-700">{index + 1}</td>
                    <td className="px-6 py-4 text-slate-900">{touchpoint.touchpoint}</td>
                    <td className="px-6 py-4 text-slate-700">{touchpoint.app}</td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center px-3 py-1 rounded ${getScoreBgColor(touchpoint.score)} ${getScoreColor(touchpoint.score)} font-semibold`}
                      >
                        {touchpoint.score}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Apps Involved */}
        <section className="mb-8">
          <h2 className="text-slate-900 mb-4">Applications in This Journey</h2>
          <div className="grid grid-cols-4 gap-4">
            {involvedApps.map((appName) => {
              const appData = mockApps.find((a) => a.name === appName);
              return (
                <Card key={appName} className="p-4 border-slate-200">
                  <div className="font-semibold text-slate-900 mb-2">{appName}</div>
                  {appData && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600">Score:</span>
                      <span className={`font-semibold ${getScoreColor(appData.overallScore)}`}>
                        {appData.overallScore}
                      </span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </section>

        {/* Pain Points */}
        <section className="mb-8">
          <h2 className="text-slate-900 mb-4">Pain Points & Improvements</h2>
          <div className="space-y-4">
            <Card className="p-4 border-orange-200 bg-orange-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-orange-900">Process Refund step scoring below average</div>
                  <div className="text-orange-700 mt-1">Score: 71 (Portfolio avg: 74)</div>
                </div>
                <div className="text-orange-900">23 complaints</div>
              </div>
            </Card>
            <Card className="p-4 border-orange-200 bg-orange-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-orange-900">Update Customer Record transition slow</div>
                  <div className="text-orange-700 mt-1">Average time: 45 seconds</div>
                </div>
                <div className="text-orange-900">18 complaints</div>
              </div>
            </Card>
            <Card className="p-4 border-green-200 bg-green-50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-green-900">Initiate Return praised for ease of use</div>
                  <div className="text-green-700 mt-1">Score: 82 (Top performer)</div>
                </div>
                <div className="text-green-900">34 mentions</div>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}