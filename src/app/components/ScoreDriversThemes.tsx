import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

export type ThemeCategory = {
  title: string;
  percentage: number;
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
}

// Helper: Derive persistence classification from monthsActive
const getPersistenceLabel = (monthsActive?: number): { label: string; color: string; bgColor: string; borderColor: string } => {
  if (!monthsActive) return { label: 'New', color: 'text-slate-700', bgColor: 'bg-slate-50', borderColor: 'border-slate-300' };
  if (monthsActive >= 6) return { label: 'Chronic', color: 'text-red-900', bgColor: 'bg-red-50', borderColor: 'border-red-300' };
  if (monthsActive >= 3) return { label: 'Recurring', color: 'text-orange-900', bgColor: 'bg-orange-50', borderColor: 'border-orange-300' };
  return { label: 'Emerging', color: 'text-amber-900', bgColor: 'bg-amber-50', borderColor: 'border-amber-300' };
};

// Helper: Get status badge styling
const getStatusBadge = (status?: 'unresolved' | 'improving' | 'stabilized' | 'resolved-monitoring', type?: 'positive' | 'negative' | 'neutral') => {
  // For positive themes, default to "Stabilized"
  if (type === 'positive' && !status) {
    return { label: 'Stabilized', color: 'text-green-800', bgColor: 'bg-green-100', borderColor: 'border-green-300' };
  }
  
  // For negative themes, infer from trend or default to "Unresolved"
  if (!status) {
    return { label: 'Unresolved', color: 'text-red-800', bgColor: 'bg-red-100', borderColor: 'border-red-300' };
  }
  
  switch (status) {
    case 'unresolved':
      return { label: 'Unresolved', color: 'text-red-800', bgColor: 'bg-red-100', borderColor: 'border-red-300' };
    case 'improving':
      return { label: 'Improving', color: 'text-blue-800', bgColor: 'bg-blue-100', borderColor: 'border-blue-300' };
    case 'stabilized':
      return { label: 'Stabilized', color: 'text-green-800', bgColor: 'bg-green-100', borderColor: 'border-green-300' };
    case 'resolved-monitoring':
      return { label: 'Resolved — Monitoring', color: 'text-emerald-800', bgColor: 'bg-emerald-100', borderColor: 'border-emerald-300' };
    default:
      return { label: 'Under Review', color: 'text-slate-800', bgColor: 'bg-slate-100', borderColor: 'border-slate-300' };
  }
};

// Helper: Generate narrative summary for the period
const generateNarrativeSummary = (themes: ThemeCategory[]): string => {
  const chronicIssues = themes.filter(t => t.type === 'negative' && (t.metadata?.monthsActive ?? 0) >= 6);
  const unresolvedIssues = themes.filter(t => t.type === 'negative' && (!t.metadata?.status || t.metadata.status === 'unresolved'));
  
  if (chronicIssues.length > 0) {
    const topChronic = chronicIssues[0];
    const persistenceMonths = topChronic.metadata?.monthsActive || 0;
    return `${chronicIssues.length} chronic issue${chronicIssues.length > 1 ? 's' : ''} remain${chronicIssues.length === 1 ? 's' : ''} unresolved this period, with "${topChronic.title}" persisting for ${persistenceMonths} consecutive months and representing ${topChronic.percentage}% of feedback. These long-standing pain points require immediate prioritization.`;
  }
  
  if (unresolvedIssues.length > 0) {
    const totalUnresolvedPercentage = unresolvedIssues.reduce((sum, t) => sum + t.percentage, 0);
    return `${unresolvedIssues.length} unresolved issue${unresolvedIssues.length > 1 ? 's' : ''} dominate this period's feedback (${totalUnresolvedPercentage}% combined), indicating persistent pain points that need attention to prevent them from becoming chronic concerns.`;
  }
  
  return `Feedback this period shows a balanced mix of themes with no dominant chronic issues, though continued monitoring is recommended to catch emerging patterns early.`;
};

export function ScoreDriversThemes({ 
  themes, 
  density = 'standard',
  title = 'Feedback Themes',
  subtitle = 'AI Supported Summary'
}: ScoreDriversThemesProps) {
  const [expandedThemes, setExpandedThemes] = useState<Set<number>>(new Set());

  const toggleTheme = (index: number) => {
    const newExpanded = new Set(expandedThemes);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedThemes(newExpanded);
  };

  const getThemeColor = (type: 'positive' | 'negative' | 'neutral') => {
    if (type === 'positive') return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900', icon: '—' };
    if (type === 'negative') return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', icon: '—' };
    return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', icon: '—' };
  };

  const getMetadataBadges = (metadata?: ThemeMetadata) => {
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
        {metadata.status && (
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold">
            {getStatusBadge(metadata.status, metadata.type).label}
          </span>
        )}
      </div>
    );
  };

  // Compact version - single line per theme
  if (density === 'compact') {
    return (
      <div className="space-y-2">
        {themes.map((theme, index) => {
          const colors = getThemeColor(theme.type);
          return (
            <div key={index} className={`px-3 py-2 rounded border ${colors.border} ${colors.bg}`}>
              <span className={`font-semibold ${colors.text}`}>
                {colors.icon} {theme.title} ({theme.percentage}%)
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
    const unresolvedCount = themes.filter(t => t.type === 'negative' && (!t.metadata?.status || t.metadata.status === 'unresolved')).length;
    const unresolvedCrossAppCount = themes.filter(t => t.type === 'negative' && (!t.metadata?.status || t.metadata.status === 'unresolved') && (t.metadata?.crossAppCount ?? 0) > 1).length;
    const persistentFeedbackPercent = themes.filter(t => t.type === 'negative' && (t.metadata?.monthsActive ?? 0) >= 3).reduce((sum, t) => sum + t.percentage, 0);

    return (
      <div>
        <div className="mb-4">
          <h3 className="text-slate-900">{title.replace('FEEDBACK THEMES', 'TOP FEEDBACK THEMES')}</h3>
          <p className="text-slate-600">{subtitle}</p>
        </div>
        
        {/* Narrative Summary */}
        <div className="mb-6 p-4 bg-slate-50 border-l-4 border-orange-600 rounded">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <p className="text-slate-900 leading-relaxed">{narrativeSummary}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Right Column - Insight Cards (appears first on mobile) */}
          <div className="lg:col-span-4 lg:order-2 space-y-3">
            <div className="text-slate-700 font-semibold mb-3">Priority Indicators</div>
            
            {/* Chronic issues count */}
            {chronicCount > 0 && (
              <Card className="p-4 border-0 bg-white">
                <div className="flex items-center gap-2">
                  <div className="text-[28px] font-semibold text-slate-900 leading-none">
                    {chronicCount}
                  </div>
                  <div className="text-slate-700 leading-tight">
                    chronic issue{chronicCount !== 1 ? 's' : ''} requiring immediate attention
                  </div>
                </div>
              </Card>
            )}

            {/* Unresolved issues */}
            {unresolvedCount > 0 && (
              <Card className="p-4 border-0 bg-white">
                <div className="flex items-center gap-2">
                  <div className="text-[28px] font-semibold text-slate-900 leading-none">
                    {unresolvedCount}
                  </div>
                  <div className="text-slate-700 leading-tight">
                    unresolved pain point{unresolvedCount !== 1 ? 's' : ''} this period
                  </div>
                </div>
              </Card>
            )}

            {/* Cross-app unresolved issues */}
            {unresolvedCrossAppCount > 0 && (
              <Card className="p-4 border-0 bg-white">
                <div className="flex items-center gap-2">
                  <div className="text-[28px] font-semibold text-slate-900 leading-none">
                    {unresolvedCrossAppCount}
                  </div>
                  <div className="text-slate-700 leading-tight">
                    unresolved cross-app issue{unresolvedCrossAppCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </Card>
            )}

            {/* Persistent feedback percentage */}
            {persistentFeedbackPercent > 0 && (
              <Card className="p-4 border-0 bg-white">
                <div className="flex items-center gap-2">
                  <div className="text-[28px] font-semibold text-slate-900 leading-none">
                    {persistentFeedbackPercent}%
                  </div>
                  <div className="text-slate-700 leading-tight">
                    of feedback tied to recurring or chronic issues
                  </div>
                </div>
              </Card>
            )}

            {/* New pattern alerts */}
            {themes.some(t => t.metadata?.isNew) && (
              <Card className="p-4 border-0 bg-white">
                <div className="flex items-center gap-2">
                  <div className="text-[28px] font-semibold text-slate-900 leading-none">
                    {themes.filter(t => t.metadata?.isNew).length}
                  </div>
                  <div className="text-slate-700 leading-tight">
                    emerging pattern{themes.filter(t => t.metadata?.isNew).length !== 1 ? 's' : ''} detected
                  </div>
                </div>
              </Card>
            )}

            {/* Improving trends */}
            {themes.some(t => t.metadata?.status === 'improving') && (
              <Card className="p-4 border-0 bg-white">
                <div className="flex items-center gap-2">
                  <div className="text-[28px] font-semibold text-slate-900 leading-none">
                    {themes.filter(t => t.metadata?.status === 'improving').length}
                  </div>
                  <div className="text-slate-700 leading-tight">
                    issue{themes.filter(t => t.metadata?.status === 'improving').length !== 1 ? 's' : ''} showing improvement
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Left Column - Theme Cards (appears second on mobile) */}
          <div className="lg:col-span-8 lg:order-1 space-y-3">
            {themes.map((theme, index) => {
              const colors = getThemeColor(theme.type);
              const isExpanded = expandedThemes.has(index);
              const persistence = getPersistenceLabel(theme.metadata?.monthsActive);
              const status = getStatusBadge(theme.metadata?.status, theme.type);
              
              return (
                <Card key={index} className="p-4 border-0 bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
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

                      {/* Existing metadata badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        {theme.metadata?.monthsActive && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">
                            Active {theme.metadata.monthsActive} months
                          </span>
                        )}
                        {theme.metadata?.crossAppCount && theme.metadata.crossAppCount > 1 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-xs">
                            {theme.metadata.crossAppCount} apps affected
                          </span>
                        )}
                        {theme.metadata?.trendDirection === 'increasing' && theme.metadata?.trendPercentage && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-800 text-xs">
                            ↑ {theme.metadata.trendPercentage}% vs last period
                          </span>
                        )}
                        {theme.metadata?.trendDirection === 'decreasing' && theme.metadata?.trendPercentage && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs">
                            ↓ {theme.metadata.trendPercentage}% vs last period
                          </span>
                        )}
                        {theme.metadata?.isNew && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs">
                            New this period
                          </span>
                        )}
                      </div>

                      <ul className="mt-3 space-y-1 text-slate-700 list-none">
                        {theme.narratives.map((narrative, nIndex) => (
                          <li key={nIndex} className="flex items-start gap-2">
                            <span className="mt-1 text-slate-400">—</span>
                            <span>{narrative}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  {theme.exampleComments && theme.exampleComments.length > 0 && (
                    <div className="mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleTheme(index)}
                        className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="size-4 mr-1" />
                            Hide {theme.exampleComments.length} example comments
                          </>
                        ) : (
                          <>
                            <ChevronDown className="size-4 mr-1" />
                            See {theme.exampleComments.length} example comments
                          </>
                        )}
                      </Button>
                      
                      {isExpanded && (
                        <div className="mt-3 space-y-2 pl-4 border-l-2 border-slate-300">
                          {theme.exampleComments.map((comment, cIndex) => (
                            <div key={cIndex} className="bg-white p-3 rounded">
                              <p className="text-slate-900 italic">"{comment.text}"</p>
                              <div className="flex items-center gap-3 mt-2 text-slate-600 text-sm flex-wrap">
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
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
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
                  {getMetadataBadges(theme.metadata)}
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