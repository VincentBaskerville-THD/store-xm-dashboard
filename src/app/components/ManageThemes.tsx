import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Search, Filter, Edit2, Save, X, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { mockApps, mockJourneys } from '../data/mockData';
import { AdminTabNav } from './AdminTabNav';

interface ManageThemesProps {
  onNavigateBack: () => void;
  onNavigateHome: () => void;
  onNavigateAllApps: () => void;
  onNavigateKeyJourneys: () => void;
  onNavigateTopPains: () => void;
  onTabChange: (tab: 'submit' | 'manage-themes' | 'manage-journeys' | 'manage-apps') => void;
}

interface Theme {
  id: string;
  title: string;
  percentage: number;
  type: 'positive' | 'negative' | 'neutral';
  status?: 'unresolved' | 'improving' | 'stabilized' | 'resolved-monitoring';
  descriptionBullets: string[];
  exampleComments: string[];
  appId?: string;
  appName?: string;
  journeyId?: string;
  journeyName?: string;
  timePeriod: string;
  monthsActive?: number;
  trendDirection?: 'increasing' | 'decreasing' | 'stable';
  trendPercentage?: number;
  crossAppCount?: number;
  isNew?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Mock data - in production this would come from your database
const mockThemes: Theme[] = [
  {
    id: '1',
    title: 'Navigation Confusion',
    percentage: 28,
    type: 'negative',
    status: 'unresolved',
    descriptionBullets: ['Users struggle to find key features', 'Menu structure is unclear'],
    exampleComments: ['I can never find what I need', 'The navigation is confusing'],
    appId: '3',
    appName: 'Order Up',
    timePeriod: 'November 2025',
    monthsActive: 3,
    trendDirection: 'increasing',
    trendPercentage: 5,
    crossAppCount: 2,
    isNew: false,
    createdAt: '2025-11-01',
    updatedAt: '2025-11-15',
  },
  {
    id: '2',
    title: 'Slow Performance',
    percentage: 22,
    type: 'negative',
    status: 'improving',
    descriptionBullets: ['App takes too long to load', 'Frequent lag during peak hours'],
    exampleComments: ['It takes forever to open', 'The system is so slow it impacts my productivity'],
    appId: '3',
    appName: 'Order Up',
    timePeriod: 'November 2025',
    monthsActive: 5,
    trendDirection: 'decreasing',
    trendPercentage: -3,
    crossAppCount: 4,
    isNew: false,
    createdAt: '2025-06-01',
    updatedAt: '2025-11-15',
  },
  {
    id: '3',
    title: 'Intuitive Design',
    percentage: 42,
    type: 'positive',
    status: 'stabilized',
    descriptionBullets: ['Clean and easy to understand interface', 'Consistent design patterns'],
    exampleComments: ['Love how simple this is to use', 'Everything makes sense'],
    appId: '2',
    appName: 'My View',
    timePeriod: 'November 2025',
    monthsActive: 12,
    trendDirection: 'stable',
    trendPercentage: 1,
    crossAppCount: 1,
    isNew: false,
    createdAt: '2024-11-01',
    updatedAt: '2025-11-15',
  },
  {
    id: '4',
    title: 'Login Issues',
    percentage: 18,
    type: 'negative',
    status: 'unresolved',
    descriptionBullets: ['SSO sometimes fails', 'Password reset flow is broken'],
    exampleComments: ['I get locked out constantly', 'SSO doesn\'t work'],
    appId: '14',
    appName: 'Sidekick',
    timePeriod: 'November 2025',
    monthsActive: 2,
    trendDirection: 'increasing',
    trendPercentage: 8,
    crossAppCount: 1,
    isNew: true,
    createdAt: '2025-10-01',
    updatedAt: '2025-11-15',
  },
  {
    id: '5',
    title: 'Helpful Notifications',
    percentage: 18,
    type: 'positive',
    status: 'stabilized',
    descriptionBullets: ['Timely alerts keep me informed', 'Notifications are relevant and not overwhelming'],
    exampleComments: ['Love getting updates when I need them'],
    appId: '2',
    appName: 'My View',
    journeyId: '1',
    journeyName: 'Schedule Patient Visit',
    timePeriod: 'November 2025',
    monthsActive: 8,
    trendDirection: 'stable',
    trendPercentage: 1,
    crossAppCount: 1,
    isNew: false,
    createdAt: '2025-04-01',
    updatedAt: '2025-11-15',
  },
];

export function ManageThemes({
  onNavigateBack,
  onNavigateHome,
  onNavigateAllApps,
  onNavigateKeyJourneys,
  onNavigateTopPains,
  onTabChange,
}: ManageThemesProps) {
  const [themes, setThemes] = useState<Theme[]>(mockThemes);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterApp, setFilterApp] = useState<string>('all');
  const [filterJourney, setFilterJourney] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedThemeId, setExpandedThemeId] = useState<string | null>(null);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Filter themes
  const filteredThemes = themes.filter(theme => {
    const matchesSearch = theme.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesApp = filterApp === 'all' || theme.appId === filterApp;
    const matchesJourney = filterJourney === 'all' || theme.journeyId === filterJourney;
    const matchesType = filterType === 'all' || theme.type === filterType;
    const matchesStatus = filterStatus === 'all' || theme.status === filterStatus;

    return matchesSearch && matchesApp && matchesJourney && matchesType && matchesStatus;
  });

  const startEditing = (theme: Theme) => {
    setEditingThemeId(theme.id);
    setEditingTheme({ ...theme });
    setExpandedThemeId(theme.id);
  };

  const cancelEditing = () => {
    setEditingThemeId(null);
    setEditingTheme(null);
  };

  const saveTheme = () => {
    if (editingTheme) {
      setThemes(themes.map(t => t.id === editingTheme.id ? { ...editingTheme, updatedAt: new Date().toISOString().split('T')[0] } : t));
      setEditingThemeId(null);
      setEditingTheme(null);
      setSuccessMessage('Theme updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const updateEditingTheme = (field: keyof Theme, value: any) => {
    if (editingTheme) {
      setEditingTheme({ ...editingTheme, [field]: value });
    }
  };

  const updateDescriptionBullet = (index: number, value: string) => {
    if (editingTheme) {
      const newBullets = [...editingTheme.descriptionBullets];
      newBullets[index] = value;
      setEditingTheme({ ...editingTheme, descriptionBullets: newBullets });
    }
  };

  const addDescriptionBullet = () => {
    if (editingTheme) {
      setEditingTheme({ ...editingTheme, descriptionBullets: [...editingTheme.descriptionBullets, ''] });
    }
  };

  const removeDescriptionBullet = (index: number) => {
    if (editingTheme && editingTheme.descriptionBullets.length > 1) {
      setEditingTheme({ 
        ...editingTheme, 
        descriptionBullets: editingTheme.descriptionBullets.filter((_, i) => i !== index) 
      });
    }
  };

  const updateExampleComment = (index: number, value: string) => {
    if (editingTheme) {
      const newComments = [...editingTheme.exampleComments];
      newComments[index] = value;
      setEditingTheme({ ...editingTheme, exampleComments: newComments });
    }
  };

  const addExampleComment = () => {
    if (editingTheme) {
      setEditingTheme({ ...editingTheme, exampleComments: [...editingTheme.exampleComments, ''] });
    }
  };

  const removeExampleComment = (index: number) => {
    if (editingTheme) {
      setEditingTheme({ 
        ...editingTheme, 
        exampleComments: editingTheme.exampleComments.filter((_, i) => i !== index) 
      });
    }
  };

  const getStatusBadge = (status?: 'unresolved' | 'improving' | 'stabilized' | 'resolved-monitoring', type?: 'positive' | 'negative' | 'neutral') => {
    if (type === 'positive' && !status) {
      return { label: 'Stabilized', color: 'text-green-800', bgColor: 'bg-green-100' };
    }
    if (!status) return null;

    switch (status) {
      case 'unresolved':
        return { label: 'Unresolved', color: 'text-red-800', bgColor: 'bg-red-100' };
      case 'improving':
        return { label: 'Improving', color: 'text-amber-800', bgColor: 'bg-amber-100' };
      case 'stabilized':
        return { label: 'Stabilized', color: 'text-green-800', bgColor: 'bg-green-100' };
      case 'resolved-monitoring':
        return { label: 'Resolved - Monitoring', color: 'text-blue-800', bgColor: 'bg-blue-100' };
    }
  };

  const navItems = [
    { id: 'home', label: 'Home', onClick: onNavigateHome },
    { id: 'all-apps', label: 'All Apps', onClick: onNavigateAllApps },
    { id: 'key-journeys', label: 'Key Journeys', onClick: onNavigateKeyJourneys },
    { id: 'top-pains', label: 'Top Pains', onClick: onNavigateTopPains },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 text-white" style={{ backgroundColor: '#ff6900' }}>
        {/* Navigation Tabs */}
        <nav className="border-b border-orange-700">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1">
              {navItems.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  size="sm"
                  onClick={item.onClick}
                  className="rounded-none border-b-2 border-transparent px-4 py-3 transition-colors text-white/80 hover:bg-orange-700 hover:text-white"
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </nav>

        {/* Page Title Section */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-semibold">Admin: Manage Feedback Themes</h1>
              </div>
              <p className="text-white/90 mt-1 text-sm">
                Browse, search, and edit all feedback themes in the database
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onNavigateBack}
              className="bg-orange-700 border-orange-600 text-white hover:bg-orange-600"
            >
              Back
            </Button>
          </div>
        </div>
      </header>

      {/* Admin Tabs */}
      <AdminTabNav activeTab="manage-themes" onTabChange={onTabChange} />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded text-green-800">
            {successMessage}
          </div>
        )}

        {/* Search and Filters */}
        <Card className="p-6 mb-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="size-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Search & Filter</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="search">Search by Title</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <Input
                    id="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search themes..."
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filterApp">App</Label>
                <Select value={filterApp} onValueChange={setFilterApp}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Apps</SelectItem>
                    {mockApps.map(app => (
                      <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filterType">Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filterStatus">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="unresolved">Unresolved</SelectItem>
                    <SelectItem value="improving">Improving</SelectItem>
                    <SelectItem value="stabilized">Stabilized</SelectItem>
                    <SelectItem value="resolved-monitoring">Resolved - Monitoring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="text-sm text-slate-600">
              Showing {filteredThemes.length} of {themes.length} themes
            </div>
          </div>
        </Card>

        {/* Themes List */}
        <div className="space-y-4">
          {filteredThemes.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-slate-600">No themes found matching your filters.</p>
            </Card>
          ) : (
            filteredThemes.map(theme => {
              const isExpanded = expandedThemeId === theme.id;
              const isEditing = editingThemeId === theme.id;
              const currentTheme = isEditing && editingTheme ? editingTheme : theme;
              const statusBadge = getStatusBadge(currentTheme.status, currentTheme.type);

              return (
                <Card key={theme.id} className="overflow-hidden">
                  {/* Theme Header - Always Visible */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedThemeId(isExpanded ? null : theme.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">{theme.title}</h3>
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                            theme.type === 'positive' ? 'bg-green-100 text-green-800' :
                            theme.type === 'negative' ? 'bg-red-100 text-red-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {theme.type}
                          </span>
                          {statusBadge && (
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${statusBadge.bgColor} ${statusBadge.color}`}>
                              {statusBadge.label}
                            </span>
                          )}
                          {theme.isNew && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                              NEW
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span className="font-semibold text-slate-900">{theme.percentage}%</span>
                          {theme.appName && <span>{theme.appName}</span>}
                          {theme.journeyName && <span>• {theme.journeyName}</span>}
                          <span>• {theme.timePeriod}</span>
                          {theme.monthsActive !== undefined && <span>• {theme.monthsActive} months active</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(theme);
                            }}
                            className="text-[#ff6900] hover:text-[#ff6900] hover:bg-orange-50"
                          >
                            <Edit2 className="size-4 mr-1" />
                            Edit
                          </Button>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="size-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="size-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 p-6 bg-slate-50">
                      {isEditing ? (
                        <div className="space-y-4">
                          {/* Editing Mode */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Title</Label>
                              <Input
                                value={currentTheme.title}
                                onChange={(e) => updateEditingTheme('title', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Percentage</Label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={currentTheme.percentage}
                                onChange={(e) => updateEditingTheme('percentage', parseFloat(e.target.value))}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Type</Label>
                              <Select 
                                value={currentTheme.type} 
                                onValueChange={(value) => updateEditingTheme('type', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="positive">Positive</SelectItem>
                                  <SelectItem value="negative">Negative</SelectItem>
                                  <SelectItem value="neutral">Neutral</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Status {currentTheme.type === 'negative' && <span className="text-red-600">*</span>}</Label>
                              <Select 
                                value={currentTheme.status || 'none'} 
                                onValueChange={(value) => updateEditingTheme('status', value === 'none' ? undefined : value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {currentTheme.type !== 'negative' && <SelectItem value="none">None</SelectItem>}
                                  <SelectItem value="unresolved">Unresolved</SelectItem>
                                  <SelectItem value="improving">Improving</SelectItem>
                                  <SelectItem value="stabilized">Stabilized</SelectItem>
                                  <SelectItem value="resolved-monitoring">Resolved - Monitoring</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label>Description Bullets</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addDescriptionBullet}
                              >
                                Add Bullet
                              </Button>
                            </div>
                            {currentTheme.descriptionBullets.map((bullet, index) => (
                              <div key={index} className="flex gap-2">
                                <Textarea
                                  value={bullet}
                                  onChange={(e) => updateDescriptionBullet(index, e.target.value)}
                                  rows={2}
                                  className="flex-1"
                                />
                                {currentTheme.descriptionBullets.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeDescriptionBullet(index)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="size-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label>Example Comments</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addExampleComment}
                              >
                                Add Example
                              </Button>
                            </div>
                            {currentTheme.exampleComments.length === 0 && (
                              <p className="text-sm text-slate-500 italic">No example comments</p>
                            )}
                            {currentTheme.exampleComments.map((comment, index) => (
                              <div key={index} className="flex gap-2">
                                <Textarea
                                  value={comment}
                                  onChange={(e) => updateExampleComment(index, e.target.value)}
                                  rows={2}
                                  className="flex-1 italic"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeExampleComment(index)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="size-4" />
                                </Button>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="outline" onClick={cancelEditing}>
                              Cancel
                            </Button>
                            <Button 
                              onClick={saveTheme}
                              style={{ backgroundColor: '#ff6900' }}
                              className="text-white hover:opacity-90"
                            >
                              <Save className="size-4 mr-2" />
                              Save Changes
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* View Mode */}
                          <div>
                            <h4 className="font-semibold text-slate-900 mb-2">Description</h4>
                            <ul className="space-y-1 text-slate-700">
                              {theme.descriptionBullets.map((bullet, index) => (
                                <li key={index} className="flex gap-2">
                                  <span className="text-slate-400">•</span>
                                  <span>{bullet}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {theme.exampleComments.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-slate-900 mb-2">Example Comments</h4>
                              <div className="space-y-2">
                                {theme.exampleComments.map((comment, index) => (
                                  <p key={index} className="text-slate-700 italic text-sm bg-white p-3 rounded border border-slate-200">
                                    "{comment}"
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                            {theme.monthsActive !== undefined && (
                              <div>
                                <div className="text-xs text-slate-500">Months Active</div>
                                <div className="text-sm font-semibold text-slate-900">{theme.monthsActive}</div>
                              </div>
                            )}
                            {theme.trendDirection && (
                              <div>
                                <div className="text-xs text-slate-500">Trend</div>
                                <div className="text-sm font-semibold text-slate-900 capitalize">{theme.trendDirection} ({theme.trendPercentage}%)</div>
                              </div>
                            )}
                            {theme.crossAppCount !== undefined && (
                              <div>
                                <div className="text-xs text-slate-500">Cross-App Count</div>
                                <div className="text-sm font-semibold text-slate-900">{theme.crossAppCount}</div>
                              </div>
                            )}
                            <div>
                              <div className="text-xs text-slate-500">Last Updated</div>
                              <div className="text-sm font-semibold text-slate-900">{theme.updatedAt}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}