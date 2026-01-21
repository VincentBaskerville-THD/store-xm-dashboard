import { ArrowLeft, FileDown } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card } from './ui/card';
import type { TimePeriod } from '../App';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TimeSeriesViewProps {
  timePeriod: TimePeriod;
  onTimePeriodChange: (period: TimePeriod) => void;
  onNavigateBack: () => void;
}

export function TimeSeriesView({ timePeriod, onTimePeriodChange, onNavigateBack }: TimeSeriesViewProps) {
  const monthlyData = [
    { period: 'May 2025', portfolioScore: 68, goodApps: 6, fairApps: 7, needsImprovementApps: 3 },
    { period: 'Jun 2025', portfolioScore: 69, goodApps: 7, fairApps: 6, needsImprovementApps: 3 },
    { period: 'Jul 2025', portfolioScore: 70, goodApps: 7, fairApps: 7, needsImprovementApps: 2 },
    { period: 'Aug 2025', portfolioScore: 71, goodApps: 7, fairApps: 7, needsImprovementApps: 2 },
    { period: 'Sep 2025', portfolioScore: 72, goodApps: 7, fairApps: 7, needsImprovementApps: 2 },
    { period: 'Oct 2025', portfolioScore: 71, goodApps: 7, fairApps: 7, needsImprovementApps: 2 },
    { period: 'Nov 2025', portfolioScore: 74, goodApps: 8, fairApps: 5, needsImprovementApps: 3 },
  ];

  const quarterlyData = [
    { period: 'Q1 2024', portfolioScore: 63 },
    { period: 'Q2 2024', portfolioScore: 65 },
    { period: 'Q3 2024', portfolioScore: 66 },
    { period: 'Q4 2024', portfolioScore: 67 },
    { period: 'Q1 2025', portfolioScore: 68 },
    { period: 'Q2 2025', portfolioScore: 69 },
    { period: 'Q3 2025', portfolioScore: 71 },
    { period: 'Q4 2025', portfolioScore: 74 },
  ];

  const yearlyData = [
    { period: '2021', portfolioScore: 58 },
    { period: '2022', portfolioScore: 61 },
    { period: '2023', portfolioScore: 64 },
    { period: '2024', portfolioScore: 66 },
    { period: '2025', portfolioScore: 71 },
  ];

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
                <h1 className="font-semibold">Time Series Analysis</h1>
                <p className="text-slate-300 mt-1">Portfolio performance across time periods</p>
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
        {/* Monthly Trend */}
        <section className="mb-8">
          <Card className="p-6 border-slate-200">
            <h2 className="text-slate-900 mb-4">Monthly Portfolio Score Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" stroke="#64748b" />
                <YAxis domain={[0, 100]} stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="portfolioScore" stroke="#ea580c" strokeWidth={2} name="Portfolio Score" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </section>

        {/* App Distribution Over Time */}
        <section className="mb-8">
          <Card className="p-6 border-slate-200">
            <h2 className="text-slate-900 mb-4">App Distribution by Performance Band (Monthly)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="goodApps" stroke="#16a34a" strokeWidth={2} name="Good (≥65)" />
                <Line type="monotone" dataKey="fairApps" stroke="#ca8a04" strokeWidth={2} name="Fair (50-64)" />
                <Line
                  type="monotone"
                  dataKey="needsImprovementApps"
                  stroke="#ea580c"
                  strokeWidth={2}
                  name="Needs Improvement (<50)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </section>

        {/* Quarterly Comparison */}
        <section className="mb-8">
          <Card className="p-6 border-slate-200">
            <h2 className="text-slate-900 mb-4">Quarterly Portfolio Score Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={quarterlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" stroke="#64748b" />
                <YAxis domain={[0, 100]} stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="portfolioScore" stroke="#ea580c" strokeWidth={2} name="Portfolio Score" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </section>

        {/* Yearly Comparison */}
        <section className="mb-8">
          <Card className="p-6 border-slate-200">
            <h2 className="text-slate-900 mb-4">Yearly Portfolio Score Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={yearlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" stroke="#64748b" />
                <YAxis domain={[0, 100]} stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="portfolioScore" stroke="#ea580c" strokeWidth={2} name="Portfolio Score" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </section>

        {/* Period Comparison Table */}
        <section className="mb-8">
          <h2 className="text-slate-900 mb-4">Period-over-Period Comparison</h2>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-slate-700">Period</th>
                  <th className="px-6 py-3 text-center text-slate-700">Portfolio Score</th>
                  <th className="px-6 py-3 text-center text-slate-700">Change</th>
                  <th className="px-6 py-3 text-center text-slate-700">Good Apps</th>
                  <th className="px-6 py-3 text-center text-slate-700">Fair Apps</th>
                  <th className="px-6 py-3 text-center text-slate-700">Needs Improvement</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((data, index) => (
                  <tr key={data.period} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-900">{data.period}</td>
                    <td className="px-6 py-4 text-center text-slate-900 font-semibold">{data.portfolioScore}</td>
                    <td className="px-6 py-4 text-center">
                      {index > 0 ? (
                        <span
                          className={
                            data.portfolioScore > monthlyData[index - 1].portfolioScore
                              ? 'text-green-600'
                              : data.portfolioScore < monthlyData[index - 1].portfolioScore
                                ? 'text-red-600'
                                : 'text-gray-600'
                          }
                        >
                          {data.portfolioScore > monthlyData[index - 1].portfolioScore ? '+' : ''}
                          {data.portfolioScore - monthlyData[index - 1].portfolioScore}
                        </span>
                      ) : (
                        <span className="text-gray-600">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-700">{data.goodApps}</td>
                    <td className="px-6 py-4 text-center text-slate-700">{data.fairApps}</td>
                    <td className="px-6 py-4 text-center text-slate-700">{data.needsImprovementApps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}