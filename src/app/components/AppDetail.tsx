import { ArrowLeft, FileDown } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card } from './ui/card';
import { mockApps, getScoreColor, getScoreBgColor, getTrendIcon, getTrendColor } from '../data/mockData';
import type { TimePeriod } from '../App';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface AppDetailProps {
  appId: string;
  timePeriod: TimePeriod;
  onTimePeriodChange: (period: TimePeriod) => void;
  onNavigateBack: () => void;
}

export function AppDetail({ appId, timePeriod, onTimePeriodChange, onNavigateBack }: AppDetailProps) {
  const app = mockApps.find((a) => a.id === appId);

  if (!app) {
    return <div>App not found</div>;
  }

  // Mock temporal data
  const temporalData = [
    { month: 'May', score: 72, easeOfUse: 3.6, usefulness: 3.8, responses: 198 },
    { month: 'Jun', score: 73, easeOfUse: 3.7, usefulness: 3.8, responses: 215 },
    { month: 'Jul', score: 74, easeOfUse: 3.7, usefulness: 3.9, responses: 223 },
    { month: 'Aug', score: app.overallScore - 8, easeOfUse: 3.8, usefulness: 4.0, responses: 234 },
    { month: 'Sep', score: app.overallScore - 5, easeOfUse: 3.9, usefulness: 4.1, responses: 245 },
    { month: 'Oct', score: app.overallScore - app.scoreMoM, easeOfUse: app.easeOfUse - 0.1, usefulness: app.usefulness - 0.1, responses: app.responses - 20 },
    { month: 'Nov', score: app.overallScore, easeOfUse: app.easeOfUse, usefulness: app.usefulness, responses: app.responses },
  ];

  const driverData = [
    { driver: 'Ease of Use', score: app.easeOfUse, portfolioAvg: 3.7 },
    { driver: 'Usefulness', score: app.usefulness, portfolioAvg: 3.9 },
    { driver: 'Performance', score: 4.0, portfolioAvg: 3.8 },
    { driver: 'Reliability', score: 3.9, portfolioAvg: 3.6 },
  ];

  const feedbackThemes = [
    { theme: 'Positive: Intuitive interface', count: 45, sentiment: 'positive' },
    { theme: 'Positive: Fast performance', count: 38, sentiment: 'positive' },
    { theme: 'Improvement: Better mobile support', count: 23, sentiment: 'negative' },
    { theme: 'Improvement: More training resources', count: 18, sentiment: 'negative' },
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
                <h1 className="font-semibold">{app.name}</h1>
                <p className="text-slate-300 mt-1">Application performance detail</p>
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
        {/* Current Score Summary */}
        <section className="mb-8">
          <div className="grid grid-cols-4 gap-6">
            <Card className="p-6 border-slate-200">
              <h3 className="text-slate-600 mb-2">Overall Score</h3>
              <div className="flex items-baseline gap-2">
                <span className={`text-[40px] font-semibold ${getScoreColor(app.overallScore)}`}>{app.overallScore}</span>
                <span className="text-slate-500">/100</span>
              </div>
              <div className={`mt-2 ${getTrendColor(app.trend)}`}>
                {app.scoreMoM > 0 ? '+' : ''}{app.scoreMoM} pts MoM {getTrendIcon(app.trend)}
              </div>
            </Card>

            <Card className="p-6 border-slate-200">
              <h3 className="text-slate-600 mb-2">Ease of Use</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-[40px] font-semibold text-slate-900">{app.easeOfUse.toFixed(1)}</span>
                <span className="text-slate-500">/5.0</span>
              </div>
              <div className="text-slate-600 mt-2">Portfolio avg: 3.7</div>
            </Card>

            <Card className="p-6 border-slate-200">
              <h3 className="text-slate-600 mb-2">Usefulness</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-[40px] font-semibold text-slate-900">{app.usefulness.toFixed(1)}</span>
                <span className="text-slate-500">/5.0</span>
              </div>
              <div className="text-slate-600 mt-2">Portfolio avg: 3.9</div>
            </Card>

            <Card className="p-6 border-slate-200">
              <h3 className="text-slate-600 mb-2">Responses</h3>
              <div className="text-[40px] font-semibold text-slate-900">{app.responses}</div>
              <div className="text-slate-600 mt-2">Last 30 days</div>
            </Card>
          </div>
        </section>

        {/* Score Trend Over Time */}
        <section className="mb-8">
          <Card className="p-6 border-slate-200">
            <h2 className="text-slate-900 mb-4">Score Trend (Last 7 Months)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={temporalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis domain={[0, 100]} stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="#ea580c" strokeWidth={2} name="Overall Score" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </section>

        {/* Driver Breakdown */}
        <section className="mb-8">
          <Card className="p-6 border-slate-200">
            <h2 className="text-slate-900 mb-4">Score Drivers vs Portfolio Average</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={driverData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="driver" stroke="#64748b" />
                <YAxis domain={[0, 5]} stroke="#64748b" />
                <Tooltip />
                <Legend />
                <Bar dataKey="score" fill="#ea580c" name={`${app.name}`} />
                <Bar dataKey="portfolioAvg" fill="#94a3b8" name="Portfolio Average" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </section>

        {/* Feedback Themes */}
        <section className="mb-8">
          <h2 className="text-slate-900 mb-4">Feedback Themes</h2>
          <div className="grid grid-cols-2 gap-4">
            {feedbackThemes.map((theme, index) => (
              <Card
                key={index}
                className={`p-4 ${theme.sentiment === 'positive' ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}
              >
                <div className="flex items-center justify-between">
                  <div className={theme.sentiment === 'positive' ? 'text-green-900' : 'text-orange-900'}>
                    {theme.theme}
                  </div>
                  <div className={`font-semibold ${theme.sentiment === 'positive' ? 'text-green-700' : 'text-orange-700'}`}>
                    {theme.count} mentions
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Response Distribution Over Time */}
        <section className="mb-8">
          <Card className="p-6 border-slate-200">
            <h2 className="text-slate-900 mb-4">Response Volume (Last 7 Months)</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={temporalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="responses" fill="#3b82f6" name="Responses" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </section>
      </div>
    </div>
  );
}