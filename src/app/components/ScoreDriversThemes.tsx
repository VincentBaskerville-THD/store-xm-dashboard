import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Card } from './ui/card';

export type ThemeCategory = {
  title: string;
  percentage: number | null;
  type: 'positive' | 'negative' | 'neutral';
  narratives: string[];
  exampleComments?: Comment[];
  metadata?: ThemeMetadata;
};

type Comment = {
  text: string;
  date: string;
  userRole?: string;
  rating?: number;
};

type ThemeMetadata = {
  monthsActive?: number;
  trendDirection?: 'increasing' | 'decreasing' | 'stable';
  trendPercentage?: number;
  crossAppCount?: number;
  isNew?: boolean;
  status?: 'unresolved' | 'improving' | 'stabilized' | 'resolved-monitoring';
};

export type DensityLevel = 'compact' | 'standard' | 'expanded';

interface ScoreDriversThemesProps {
  themes: ThemeCategory[];
  density?: DensityLevel;
  title?: string;
  subtitle?: string;
  hideThemeCards?: boolean;
}

// Helper: Derive persistence classification from monthsActive (matches ManageThemes)
const getPersistenceLabel = (monthsActive?: number): { label: string } => {
  if (!monthsActive || monthsActive === 0) return { label: 'New this period' };
  if (monthsActive < 3) return { label: `Emerging pattern (${monthsActive} month${monthsActive > 1 ? 's' : ''})` };
  if (monthsActive < 6) return { label: `Recurring pattern (${monthsActive} months)` };
  return { label: `Chronic issue (${monthsActive}+ months)` };
};

// Helper: Get status badge styling (matches ManageThemes)
const getStatusBadge = (status?: 'unresolved' | 'improving' | 'stabilized' | 'resolved-monitoring', type?: 'positive' | 'negative' | 'neutral') => {
  if (type === 'positive' || type === 'neutral') {
    return null;
  }
  if (!status) {
    return null;
  }
  
  switch (status) {
    case 'unresolved':
      return { label: 'Unresolved', color: 'text-red-800', bgColor: 'bg-red-100' };
    case 'improving':
      return { label: 'Improving', color: 'text-amber-800', bgColor: 'bg-amber-100' };
    case 'stabilized':
      return { label: 'Stabilized', color: 'text-green-800', bgColor: 'bg-green-100' };
    case 'resolved-monitoring':
      return { label: 'Resolved - Monitoring', color: 'text-blue-800', bgColor: 'bg-blue-100' };
    default:
      return { label: 'Under Review', color: 'text-slate-800', bgColor: 'bg-slate-100' };
  }
};

// Helper: Generate narrative summary for the period
const generateNarrativeSummary = (themes: ThemeCategory[]): string => {
  const chronicIssues = themes.filter(t => t.type === 'negative' && (t.metadata?.monthsActive ?? 0) >= 6);
  const unresolvedIssues = themes.filter(t => t.type === 'negative' && t.metadata?.status === 'unresolved');
  
  if (chronicIssues.length > 0) {
    const topChronic = chronicIssues[0];
    const persistenceMonths = topChronic.metadata?.monthsActive || 0;
    const chronicPercent = topChronic.percentage ?? 0;
    return `${chronicIssues.length} chronic issue${chronicIssues.length > 1 ? 's' : ''} remain${chronicIssues.length === 1 ? 's' : ''} unresolved this period, with "${topChronic.title}" persisting for ${persistenceMonths} consecutive months and representing ${chronicPercent}% of feedback. These long-standing pain points require immediate prioritization.`;
  }
  
  if (unresolvedIssues.length > 0) {
    const totalUnresolvedPercentage = unresolvedIssues.reduce((sum, t) => sum + (t.percentage ?? 0), 0);
    return `${unresolvedIssues.length} unresolved issue${unresolvedIssues.length > 1 ? 's' : ''} dominate this period's feedback (${totalUnresolvedPercentage}% combined), indicating persistent pain points that need attention to prevent them from becoming chronic concerns.`;
  }
  
  return `Feedback this period shows a balanced mix of themes with no dominant chronic issues, though continued monitoring is recommended to catch emerging patterns early.`;
};

export function ScoreDriversThemes({ 
  themes, 
  density = 'standard',
  title = 'Feedback Themes',
  subtitle = 'AI Supported Summary',
  hideThemeCards = false,
}: ScoreDriversThemesProps) {

  const getThemeColor = (type: 'positive' | 'negative' | 'neutral') => {
    if (type === 'positive') return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', icon: '—' };
    if (type === 'negative') return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', icon: '—' };
    return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', icon: '—' };
  };

  const getMetadataBadges = (metadata?: ThemeMetadata, themeType?: ThemeCategory['type']) => {
    if (!metadata) return null;
    
    return (
      <div className="flex items-center gap-2 mt-2">
        {metadata.isNew && (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-100 border border-purple-300 text-purple-800 text-xs font-semibold">
            ✨ NEW
          </span>
        )}
        {metadata.monthsActive && metadata.monthsActive >= 3 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-orange-100 border border-orange-300 text-orange-800 text-xs font-semibold">
            🔁 Active {metadata.monthsActive} mo
          </span>
        )}
        {metadata.trendDirection === 'decreasing' && (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 border border-green-300 text-green-800 text-xs font-semibold">
            ↓ {metadata.trendPercentage}% vs last Q
          </span>
        )}
        {metadata.trendDirection === 'increasing' && (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 border border-red-300 text-red-800 text-xs font-semibold">
            ↑ {metadata.trendPercentage}% vs last Q
          </span>
        )}
        {metadata.crossAppCount && metadata.crossAppCount > 1 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-100 border border-purple-300 text-purple-800 text-xs font-semibold">
            🔗 {metadata.crossAppCount} apps
          </span>
        )}
        {(() => {
          const statusBadge = getStatusBadge(metadata.status, themeType);
          if (!statusBadge) return null;
          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded ${statusBadge.bgColor} ${statusBadge.color} text-xs font-semibold`}
            >
              {statusBadge.label}
            </span>
          );
        })()}
      </div>
    );
  };

  // Compact version - single line per theme
  if (density === 'compact') {
    return (
      <div className="space-y-2">
        {themes.map((theme, index) => {
          const colors = getThemeColor(theme.type);
          const percentageLabel = theme.percentage !== null ? ` (${theme.percentage}%)` : '';
          return (
            <div key={index} className={`px-3 py-2 rounded border ${colors.border} ${colors.bg}`}>
              <span className={`font-semibold ${colors.text}`}>
                {colors.icon} {theme.title}{percentageLabel}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // Standard version - narratives visible, comments collapsed
  if (density === 'standard') {
    const narrativeSummary = generateNarrativeSummary(themes);
    const chronicCount = themes.filter(t => t.type === 'negative' && (t.metadata?.monthsActive ?? 0) >= 6).length;
    const unresolvedCount = themes.filter(t => t.type === 'negative' && t.metadata?.status === 'unresolved').length;
    const unresolvedCrossAppCount = themes.filter(t => t.type === 'negative' && t.metadata?.status === 'unresolved' && (t.metadata?.crossAppCount ?? 0) > 1).length;
    const persistentFeedbackPercent = themes
      .filter(t => t.type === 'negative' && (t.metadata?.monthsActive ?? 0) >= 3)
      .reduce((sum, t) => sum + (t.percentage ?? 0), 0);

    return (
      <div>
        <div className="mb-5">
          <h3 className="text-slate-900 text-sm font-semibold tracking-wide uppercase mb-1">{title.replace('FEEDBACK THEMES', 'TOP FEEDBACK THEMES')}</h3>
          <p className="text-slate-600 text-sm">{subtitle}</p>
        </div>
        
        {/* Narrative Summary */}
        <div className="mb-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-md shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <p className="text-slate-900 leading-relaxed text-[14px]">{narrativeSummary}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Right Column - Insight Cards (appears first on mobile) */}
          <div className="lg:col-span-4 lg:order-2 space-y-3">
            <div className="text-slate-700 font-semibold mb-3 text-sm">Priority Indicators</div>
            
            {/* Chronic issues count */}
            {chronicCount > 0 && (
              <Card className="p-4 border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="text-[32px] font-semibold text-slate-900 leading-none">
                    {chronicCount}
                  </div>
                  <div className="text-slate-700 text-sm leading-tight">
                    chronic issue{chronicCount !== 1 ? 's' : ''} requiring immediate attention
                  </div>
                </div>
              </Card>
            )}

            {/* Unresolved issues */}
            {unresolvedCount > 0 && (
              <Card className="p-4 border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="text-[32px] font-semibold text-slate-900 leading-none">
                    {unresolvedCount}
                  </div>
                  <div className="text-slate-700 text-sm leading-tight">
                    unresolved pain point{unresolvedCount !== 1 ? 's' : ''} this period
                  </div>
                </div>
              </Card>
            )}

            {/* Cross-app unresolved issues */}
            {unresolvedCrossAppCount > 0 && (
              <Card className="p-4 border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="text-[32px] font-semibold text-slate-900 leading-none">
                    {unresolvedCrossAppCount}
                  </div>
                  <div className="text-slate-700 text-sm leading-tight">
                    unresolved cross-app issue{unresolvedCrossAppCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </Card>
            )}

            {/* Persistent feedback percentage */}
            {persistentFeedbackPercent > 0 && (
              <Card className="p-4 border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="text-[32px] font-semibold text-slate-900 leading-none">
                    {persistentFeedbackPercent}%
                  </div>
                  <div className="text-slate-700 text-sm leading-tight">
                    of feedback tied to recurring or chronic issues
                  </div>
                </div>
              </Card>
            )}

            {/* New pattern alerts */}
            {themes.some(t => t.metadata?.isNew) && (
              <Card className="p-4 border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="text-[32px] font-semibold text-slate-900 leading-none">
                    {themes.filter(t => t.metadata?.isNew).length}
                  </div>
                  <div className="text-slate-700 text-sm leading-tight">
                    emerging pattern{themes.filter(t => t.metadata?.isNew).length !== 1 ? 's' : ''} detected
                  </div>
                </div>
              </Card>
            )}

            {/* Improving trends */}
            {themes.some(t => t.metadata?.status === 'improving') && (
              <Card className="p-4 border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="text-[32px] font-semibold text-slate-900 leading-none">
                    {themes.filter(t => t.metadata?.status === 'improving').length}
                  </div>
                  <div className="text-slate-700 text-sm leading-tight">
                    issue{themes.filter(t => t.metadata?.status === 'improving').length !== 1 ? 's' : ''} showing improvement
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Left Column - Theme Cards (appears second on mobile) */}
          {!hideThemeCards && (
            <div className="lg:col-span-8 lg:order-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              {themes.map((theme, index) => {
              const persistence = getPersistenceLabel(theme.metadata?.monthsActive);
              const status = getStatusBadge(theme.metadata?.status, theme.type);
              
              return (
                <Card key={index} className="bg-white rounded-lg border border-slate-200 p-4 space-y-2.5">
                  {/* Title and Badges */}
                  <div className="space-y-2">
                    <div className="font-semibold text-base text-slate-900">
                      {theme.title}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {/* Type badge */}
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        theme.type === 'positive' ? 'bg-green-100 text-green-800' :
                        theme.type === 'negative' ? 'bg-red-100 text-red-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {theme.type === 'positive' ? 'Positive' : theme.type === 'negative' ? 'Pain Point' : 'Neutral'}
                      </span>
                      
                      {/* Status badge */}
                      {status && (
                        <span className={`text-xs px-2 py-1 rounded font-medium ${status.bgColor} ${status.color}`}>
                          {status.label}
                        </span>
                      )}
                      
                      {/* Persistence badge */}
                      {theme.metadata?.monthsActive !== undefined && theme.metadata?.monthsActive > 0 && (
                        <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">
                          {persistence.label}
                        </span>
                      )}
                      
                      {/* Trend badge */}
                      {theme.metadata?.trendDirection && theme.metadata?.trendDirection !== 'stable' && (
                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                          theme.metadata.trendDirection === 'increasing' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {theme.metadata.trendDirection === 'increasing' ? '↑' : '↓'} {Math.abs(theme.metadata.trendPercentage || 0)}%
                        </span>
                      )}
                      
                      {/* New badge */}
                      {theme.metadata?.isNew && (
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                          New this period
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Context Metadata */}
                  {(() => {
                    const hasPercentage = theme.percentage !== null;
                    const hasActiveMonths = theme.metadata?.monthsActive !== undefined && theme.metadata.monthsActive > 0;
                    const hasCrossApp = (theme.metadata?.crossAppCount ?? 0) > 1;
                    if (!hasPercentage && !hasActiveMonths && !hasCrossApp) return null;
                    return (
                      <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                        {hasPercentage && (
                          <div><strong>Percentage:</strong> {theme.percentage}% of feedback</div>
                        )}
                        {hasActiveMonths && (
                          <div>
                            <strong>Active:</strong> {theme.metadata?.monthsActive} month{theme.metadata?.monthsActive !== 1 ? 's' : ''}
                          </div>
                        )}
                        {hasCrossApp && (
                          <div><strong>Cross-App:</strong> {theme.metadata?.crossAppCount} apps affected</div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Summary Points */}
                  {theme.narratives && theme.narratives.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Summary Points</div>
                      <ul className="space-y-1 text-sm text-slate-700">
                        {theme.narratives.map((narrative, nIndex) => (
                          <li key={nIndex} className="flex gap-2">
                            <span className="text-slate-400 shrink-0">•</span>
                            <span>{narrative}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Example Comments */}
                  {theme.exampleComments && theme.exampleComments.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Example Comments</div>
                      <div className="space-y-1.5">
                        {theme.exampleComments.map((comment, cIndex) => (
                          <div key={cIndex} className="bg-slate-50 rounded p-2 text-xs text-slate-600 italic border-l-2 border-slate-300">
                            "{comment.text}"
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Expanded version - always shows comments
  return (
    <div>
      <div className="mb-4">
        <h3 className="text-slate-900">{title}</h3>
        <p className="text-slate-600">{subtitle}</p>
      </div>
      <div className="space-y-4">
        {themes.map((theme, index) => {
          const colors = getThemeColor(theme.type);
          
          return (
            <Card key={index} className={`p-4 border ${colors.border} ${colors.bg}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className={`font-semibold ${colors.text} mb-2`}>
                    {colors.icon} {theme.title} ({theme.percentage}%)
                  </h4>
                  {getMetadataBadges(theme.metadata, theme.type)}
                  <ul className={`mt-3 space-y-1 ${colors.text} list-none`}>
                    {theme.narratives.map((narrative, nIndex) => (
                      <li key={nIndex} className="flex items-start gap-2">
                        <span className="mt-1">—</span>
                        <span>{narrative}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {theme.exampleComments && theme.exampleComments.length > 0 && (
                <div className="mt-4 space-y-2 pl-4 border-l-2 border-slate-300">
                  <div className={`font-semibold ${colors.text} mb-2`}>
                    Example Comments ({theme.exampleComments.length})
                  </div>
                  {theme.exampleComments.map((comment, cIndex) => (
                    <div key={cIndex} className="bg-white/50 p-3 rounded border border-slate-200">
                      <p className="text-slate-900 italic">"{comment.text}"</p>
                      <div className="flex items-center gap-3 mt-2 text-slate-600">
                        <span>{comment.date}</span>
                        {comment.userRole && <span>• {comment.userRole}</span>}
                        {comment.rating && (
                          <span>• {'⭐'.repeat(comment.rating)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}