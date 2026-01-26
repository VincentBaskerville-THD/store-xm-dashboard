// Preview overlay for new/updated theme submissions.
// Lets admins compare "new-only" vs "full-context" before saving.
import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { X, Save, AlertCircle } from 'lucide-react';

interface ThemeFormData {
  title: string;
  percentage: number;
  type: 'positive' | 'negative' | 'neutral';
  descriptionBullets: string[];
  exampleComments: string[];
  monthsActive?: number;
  trendDirection?: 'increasing' | 'decreasing' | 'stable';
  trendPercentage?: number;
  crossAppCount?: number;
  isNew?: boolean;
  status?: 'unresolved' | 'improving' | 'stabilized' | 'resolved-monitoring';
  manualOverrides: {
    monthsActive?: boolean;
    trendDirection?: boolean;
    trendPercentage?: boolean;
    crossAppCount?: boolean;
    isNew?: boolean;
  };
}

interface AdminThemesPreviewProps {
  themes: ThemeFormData[];
  contextThemes: ThemeFormData[];
  contextInfo: {
    apps: string;
    journey: string;
    timePeriod: string;
  };
  onClose: () => void;
  onSubmit: () => void;
}

export function AdminThemesPreview({ 
  themes, 
  contextThemes,
  contextInfo,
  onClose, 
  onSubmit 
}: AdminThemesPreviewProps) {
  const [previewMode, setPreviewMode] = useState<'new-only' | 'full-context'>('new-only');
  
  // Switch between showing only new themes or merging with existing context.
  const displayThemes = previewMode === 'new-only' ? themes : [...themes, ...contextThemes];

  const getThemeColor = (type: 'positive' | 'negative' | 'neutral') => {
    if (type === 'positive') return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', icon: '—' };
    if (type === 'negative') return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', icon: '—' };
    return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', icon: '—' };
  };

  const getPersistenceLabel = (monthsActive?: number): { label: string; color: string; bgColor: string } => {
    if (!monthsActive) return { label: 'New', color: 'text-slate-700', bgColor: 'bg-slate-50' };
    if (monthsActive >= 6) return { label: 'Chronic', color: 'text-red-900', bgColor: 'bg-red-50' };
    if (monthsActive >= 3) return { label: 'Recurring', color: 'text-orange-900', bgColor: 'bg-orange-50' };
    return { label: 'Emerging', color: 'text-amber-900', bgColor: 'bg-amber-50' };
  };

  const getStatusBadge = (status?: 'unresolved' | 'improving' | 'stabilized' | 'resolved-monitoring', type?: 'positive' | 'negative' | 'neutral') => {
    if (type === 'positive' && !status) {
      return { label: 'Stabilized', color: 'text-green-800', bgColor: 'bg-green-100' };
    }
    if (!status) {
      return { label: 'Unresolved', color: 'text-red-800', bgColor: 'bg-red-100' };
    }
    switch (status) {
      case 'unresolved':
        return { label: 'Unresolved', color: 'text-red-800', bgColor: 'bg-red-100' };
      case 'improving':
        return { label: 'Improving', color: 'text-blue-800', bgColor: 'bg-blue-100' };
      case 'stabilized':
        return { label: 'Stabilized', color: 'text-green-800', bgColor: 'bg-green-100' };
      case 'resolved-monitoring':
        return { label: 'Resolved — Monitoring', color: 'text-emerald-800', bgColor: 'bg-emerald-100' };
      default:
        return { label: 'Under Review', color: 'text-slate-800', bgColor: 'bg-slate-100' };
    }
  };

  // Calculate priority indicators for new themes only.
  const newChronicCount = themes.filter(t => t.type === 'negative' && (t.monthsActive ?? 0) >= 6).length;
  const newUnresolvedCount = themes.filter(t => t.type === 'negative' && (!t.status || t.status === 'unresolved')).length;
  const newUnresolvedCrossAppCount = themes.filter(t => t.type === 'negative' && (!t.status || t.status === 'unresolved') && (t.crossAppCount ?? 0) > 1).length;
  const newPersistentFeedbackPercent = themes.filter(t => t.type === 'negative' && (t.monthsActive ?? 0) >= 3).reduce((sum, t) => sum + t.percentage, 0);
  const newNewPatternsCount = themes.filter(t => t.isNew).length;
  const newImprovingCount = themes.filter(t => t.status === 'improving').length;

  // Calculate priority indicators for existing themes only (for comparison)
  const existingChronicCount = contextThemes.filter(t => t.type === 'negative' && (t.monthsActive ?? 0) >= 6).length;
  const existingUnresolvedCount = contextThemes.filter(t => t.type === 'negative' && (!t.status || t.status === 'unresolved')).length;
  const existingUnresolvedCrossAppCount = contextThemes.filter(t => t.type === 'negative' && (!t.status || t.status === 'unresolved') && (t.crossAppCount ?? 0) > 1).length;
  const existingPersistentFeedbackPercent = contextThemes.filter(t => t.type === 'negative' && (t.monthsActive ?? 0) >= 3).reduce((sum, t) => sum + t.percentage, 0);
  const existingNewPatternsCount = contextThemes.filter(t => t.isNew).length;
  const existingImprovingCount = contextThemes.filter(t => t.status === 'improving').length;

  // Calculate priority indicators for combined (full context)
  const chronicCount = displayThemes.filter(t => t.type === 'negative' && (t.monthsActive ?? 0) >= 6).length;
  const unresolvedCount = displayThemes.filter(t => t.type === 'negative' && (!t.status || t.status === 'unresolved')).length;
  const unresolvedCrossAppCount = displayThemes.filter(t => t.type === 'negative' && (!t.status || t.status === 'unresolved') && (t.crossAppCount ?? 0) > 1).length;
  const persistentFeedbackPercent = displayThemes.filter(t => t.type === 'negative' && (t.monthsActive ?? 0) >= 3).reduce((sum, t) => sum + t.percentage, 0);
  const newPatternsCount = displayThemes.filter(t => t.isNew).length;
  const improvingCount = displayThemes.filter(t => t.status === 'improving').length;

  // Helper to render delta indicator
  const DeltaIndicator = ({ current, previous }: { current: number; previous: number }) => {
    const delta = current - previous;
    if (delta === 0) return null;
    
    return (
      <span className={`text-xs font-semibold ml-1 ${delta > 0 ? 'text-blue-700' : 'text-green-700'}`}>
        {delta > 0 ? `+${delta}` : delta}
      </span>
    );
  };

  // Helper to render indicator card
  const IndicatorCard = ({ 
    value, 
    label, 
    previousValue, 
    showDelta 
  }: { 
    value: number; 
    label: string; 
    previousValue?: number; 
    showDelta?: boolean;
  }) => {
    const hasImpact = previousValue !== undefined && value !== previousValue;
    
    return (
      <Card className={`p-4 border-0 shadow-sm ${hasImpact && showDelta ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-white'}`}>
        <div className="flex items-center gap-2">
          <div className="text-[28px] font-semibold text-slate-900 leading-none">
            {value}
            {showDelta && previousValue !== undefined && (
              <DeltaIndicator current={value} previous={previousValue} />
            )}
          </div>
          <div className="text-slate-700 leading-tight text-sm">
            {label}
          </div>
        </div>
        {hasImpact && showDelta && (
          <div className="mt-2 text-xs text-blue-700">
            {value > previousValue ? 'Increased' : 'Decreased'} from {previousValue}
          </div>
        )}
      </Card>
    );
  };

  // Determine which metric tiles to show based on preview mode.
  const showNewOnly = previewMode === 'new-only';
  const showFullContext = previewMode === 'full-context';

  // Generate narrative summary
  const generateNarrativeSummary = (): string => {
    const chronicIssues = displayThemes.filter(t => t.type === 'negative' && (t.monthsActive ?? 0) >= 6);
    const unresolvedIssues = displayThemes.filter(t => t.type === 'negative' && (!t.status || t.status === 'unresolved'));
    
    if (chronicIssues.length > 0) {
      const topChronic = chronicIssues[0];
      const persistenceMonths = topChronic.monthsActive || 0;
      return `${chronicIssues.length} chronic issue${chronicIssues.length > 1 ? 's' : ''} remain${chronicIssues.length === 1 ? 's' : ''} unresolved this period, with "${topChronic.title}" persisting for ${persistenceMonths} consecutive months and representing ${topChronic.percentage}% of feedback. These long-standing pain points require immediate prioritization.`;
    }
    
    if (unresolvedIssues.length > 0) {
      const totalUnresolvedPercentage = unresolvedIssues.reduce((sum, t) => sum + t.percentage, 0);
      return `${unresolvedIssues.length} unresolved issue${unresolvedIssues.length > 1 ? 's' : ''} dominate this period's feedback (${totalUnresolvedPercentage}% combined), indicating persistent pain points that need attention to prevent them from becoming chronic concerns.`;
    }
    
    return `Feedback this period shows a balanced mix of themes with no dominant chronic issues, though continued monitoring is recommended to catch emerging patterns early.`;
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <Card 
        className="max-w-[90vw] w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Preview Submission</h2>
            <p className="text-sm text-slate-600 mt-1">Review how themes will appear in the dashboard</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>
        
        <div className="space-y-6">
          {/* Context */}
          <div className="p-4 bg-slate-50 rounded border border-slate-200">
            <h3 className="font-semibold text-sm text-slate-700 mb-2">Target Context</h3>
            <div className="text-sm space-y-1 text-slate-600">
              <p><strong className="text-slate-900">Apps:</strong> {contextInfo.apps || 'None'}</p>
              <p><strong className="text-slate-900">Journey:</strong> {contextInfo.journey || 'None'}</p>
              <p><strong className="text-slate-900">Time Period:</strong> {contextInfo.timePeriod}</p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setPreviewMode('new-only')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                previewMode === 'new-only'
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              New Themes Only ({themes.length})
            </button>
            <button
              onClick={() => setPreviewMode('full-context')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                previewMode === 'full-context'
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Full Context ({themes.length + contextThemes.length} total)
            </button>
          </div>

          {previewMode === 'full-context' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
              <p><strong>Full Context View:</strong> Showing your {themes.length} new theme{themes.length !== 1 ? 's' : ''} alongside {contextThemes.length} existing theme{contextThemes.length !== 1 ? 's' : ''} from this app/journey to preview the complete dashboard experience.</p>
            </div>
          )}

          {/* Dashboard-Style Layout */}
          <div className="border-t pt-6">
            <h3 className="text-slate-900 font-semibold mb-1">TOP FEEDBACK THEMES</h3>
            <p className="text-slate-600 text-sm mb-6">AI Supported Summary</p>

            {/* Narrative Summary */}
            <div className="mb-6 p-4 bg-slate-50 border-l-4 border-orange-600 rounded">
              <div className="flex items-start gap-3">
                <AlertCircle className="size-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="text-slate-900 leading-relaxed text-sm">{generateNarrativeSummary()}</p>
              </div>
            </div>

            {/* Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Right Column - Priority Indicators (appears first on mobile) */}
              <div className="lg:col-span-4 lg:order-2 space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-slate-700 font-semibold text-sm">Priority Indicators</div>
                  {showNewOnly && (
                    <span className="text-xs text-slate-500 italic">From new themes</span>
                  )}
                </div>
                
                {/* Show indicators based on mode */}
                {showNewOnly ? (
                  // New Themes Only Mode - show only new theme metrics
                  <>
                    {newChronicCount > 0 && (
                      <IndicatorCard
                        value={newChronicCount}
                        label={`chronic issue${newChronicCount !== 1 ? 's' : ''} requiring immediate attention`}
                      />
                    )}
                    {newUnresolvedCount > 0 && (
                      <IndicatorCard
                        value={newUnresolvedCount}
                        label={`unresolved pain point${newUnresolvedCount !== 1 ? 's' : ''} this period`}
                      />
                    )}
                    {newUnresolvedCrossAppCount > 0 && (
                      <IndicatorCard
                        value={newUnresolvedCrossAppCount}
                        label={`unresolved cross-app issue${newUnresolvedCrossAppCount !== 1 ? 's' : ''}`}
                      />
                    )}
                    {newPersistentFeedbackPercent > 0 && (
                      <IndicatorCard
                        value={newPersistentFeedbackPercent}
                        label="of feedback tied to recurring or chronic issues"
                      />
                    )}
                    {newNewPatternsCount > 0 && (
                      <IndicatorCard
                        value={newNewPatternsCount}
                        label={`emerging pattern${newNewPatternsCount !== 1 ? 's' : ''} detected`}
                      />
                    )}
                    {newImprovingCount > 0 && (
                      <IndicatorCard
                        value={newImprovingCount}
                        label={`issue${newImprovingCount !== 1 ? 's' : ''} showing improvement`}
                      />
                    )}
                    {newChronicCount === 0 && newUnresolvedCount === 0 && newUnresolvedCrossAppCount === 0 && 
                     newPersistentFeedbackPercent === 0 && newNewPatternsCount === 0 && newImprovingCount === 0 && (
                      <Card className="p-4 border-0 bg-slate-50 shadow-sm">
                        <p className="text-sm text-slate-600 italic">No priority indicators from new themes</p>
                      </Card>
                    )}
                  </>
                ) : (
                  // Full Context Mode - show combined metrics with deltas
                  <>
                    {chronicCount > 0 && (
                      <IndicatorCard
                        value={chronicCount}
                        label={`chronic issue${chronicCount !== 1 ? 's' : ''} requiring immediate attention`}
                        previousValue={existingChronicCount}
                        showDelta={showFullContext}
                      />
                    )}
                    {unresolvedCount > 0 && (
                      <IndicatorCard
                        value={unresolvedCount}
                        label={`unresolved pain point${unresolvedCount !== 1 ? 's' : ''} this period`}
                        previousValue={existingUnresolvedCount}
                        showDelta={showFullContext}
                      />
                    )}
                    {unresolvedCrossAppCount > 0 && (
                      <IndicatorCard
                        value={unresolvedCrossAppCount}
                        label={`unresolved cross-app issue${unresolvedCrossAppCount !== 1 ? 's' : ''}`}
                        previousValue={existingUnresolvedCrossAppCount}
                        showDelta={showFullContext}
                      />
                    )}
                    {persistentFeedbackPercent > 0 && (
                      <IndicatorCard
                        value={persistentFeedbackPercent}
                        label="of feedback tied to recurring or chronic issues"
                        previousValue={existingPersistentFeedbackPercent}
                        showDelta={showFullContext}
                      />
                    )}
                    {newPatternsCount > 0 && (
                      <IndicatorCard
                        value={newPatternsCount}
                        label={`emerging pattern${newPatternsCount !== 1 ? 's' : ''} detected`}
                        previousValue={existingNewPatternsCount}
                        showDelta={showFullContext}
                      />
                    )}
                    {improvingCount > 0 && (
                      <IndicatorCard
                        value={improvingCount}
                        label={`issue${improvingCount !== 1 ? 's' : ''} showing improvement`}
                        previousValue={existingImprovingCount}
                        showDelta={showFullContext}
                      />
                    )}
                  </>
                )}
              </div>

              {/* Left Column - Theme Cards (appears second on mobile) */}
              <div className="lg:col-span-8 lg:order-1 space-y-3">
                {displayThemes.map((theme, index) => {
                  const colors = getThemeColor(theme.type);
                  const persistence = getPersistenceLabel(theme.monthsActive);
                  const status = getStatusBadge(theme.status, theme.type);
                  const isNewTheme = index < themes.length; // First N themes are the new ones
                  
                  return (
                    <Card key={index} className={`p-4 border-0 ${isNewTheme && previewMode === 'full-context' ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-slate-50'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {isNewTheme && previewMode === 'full-context' && (
                            <div className="mb-2">
                              <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">NEW SUBMISSION</span>
                            </div>
                          )}
                          <div className="flex items-start sm:items-center flex-col sm:flex-row gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-1">
                              <span className={`text-xl ${colors.text}`}>{colors.icon}</span>
                              <h4 className="font-semibold text-slate-900">
                                {theme.title}
                              </h4>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-sm font-semibold ${colors.text} whitespace-nowrap`}>
                              {theme.percentage}%
                            </span>
                          </div>
                          
                          {/* Persistence and Status Badges */}
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded font-semibold text-xs ${persistence.color} ${persistence.bgColor}`}>
                              {persistence.label}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded font-semibold text-xs ${status.color} ${status.bgColor}`}>
                              {status.label}
                            </span>
                          </div>

                          {/* Metadata badges */}
                          <div className="flex flex-wrap items-center gap-2">
                            {theme.monthsActive && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                                Active {theme.monthsActive} months
                                {theme.manualOverrides.monthsActive && (
                                  <AlertCircle className="inline-block ml-1 size-3 text-amber-600" title="Manually overridden" />
                                )}
                              </span>
                            )}
                            {theme.crossAppCount && theme.crossAppCount > 1 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-xs">
                                {theme.crossAppCount} apps affected
                                {theme.manualOverrides.crossAppCount && (
                                  <AlertCircle className="inline-block ml-1 size-3 text-amber-600" title="Manually overridden" />
                                )}
                              </span>
                            )}
                            {theme.trendDirection === 'increasing' && theme.trendPercentage !== undefined && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-800 text-xs">
                                ↑ {theme.trendPercentage}% vs last period
                                {theme.manualOverrides.trendDirection && (
                                  <AlertCircle className="inline-block ml-1 size-3 text-amber-600" title="Manually overridden" />
                                )}
                              </span>
                            )}
                            {theme.trendDirection === 'decreasing' && theme.trendPercentage !== undefined && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs">
                                ↓ {Math.abs(theme.trendPercentage)}% vs last period
                                {theme.manualOverrides.trendDirection && (
                                  <AlertCircle className="inline-block ml-1 size-3 text-amber-600" title="Manually overridden" />
                                )}
                              </span>
                            )}
                            {theme.trendDirection === 'stable' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                                Stable vs last period
                                {theme.manualOverrides.trendDirection && (
                                  <AlertCircle className="inline-block ml-1 size-3 text-amber-600" title="Manually overridden" />
                                )}
                              </span>
                            )}
                            {theme.isNew && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs">
                                New this period
                                {theme.manualOverrides.isNew && (
                                  <AlertCircle className="inline-block ml-1 size-3 text-amber-600" title="Manually overridden" />
                                )}
                              </span>
                            )}
                          </div>

                          <ul className="mt-3 space-y-1 text-slate-700 list-none">
                            {theme.descriptionBullets.filter(b => b.trim()).map((bullet, i) => (
                              <li key={i} className="flex gap-2 text-sm">
                                <span className="text-slate-400 select-none">•</span>
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                          
                          {theme.exampleComments.filter(c => c.trim()).length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <p className="text-xs font-semibold text-slate-600 mb-2">Example Comments:</p>
                              <ul className="space-y-1.5">
                                {theme.exampleComments.filter(c => c.trim()).map((comment, i) => (
                                  <li key={i} className="text-sm text-slate-600 italic pl-3 border-l-2 border-slate-300">
                                    "{comment}"
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Back to Edit
          </Button>
          <Button onClick={onSubmit} style={{ backgroundColor: '#ff6900' }} className="text-white hover:opacity-90">
            <Save className="size-4 mr-2" />
            Confirm & Submit
          </Button>
        </div>
      </Card>
    </div>
  );
}