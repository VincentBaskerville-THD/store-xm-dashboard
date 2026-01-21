import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { X, Plus, Save, Eye, Search, AlertCircle, FileText } from 'lucide-react';
import type { ThemeCategory } from './ScoreDriversThemes';
import { mockApps, mockJourneys } from '../data/mockData';
import { AdminThemesPreview } from './AdminThemesPreview';
import { AdminTabNav } from './AdminTabNav';

interface AdminThemesViewProps {
  onNavigateBack: () => void;
  onNavigateHome: () => void;
  onNavigateAllApps: () => void;
  onNavigateKeyJourneys: () => void;
  onNavigateTopPains: () => void;
  onTabChange: (tab: 'submit' | 'manage-themes' | 'manage-journeys' | 'manage-apps' | 'settings') => void;
}

interface ExistingTheme {
  title: string;
  appId: string;
  appName: string;
  percentage: number;
  type: 'positive' | 'negative' | 'neutral';
  monthsActive: number;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
  crossAppCount: number;
  isNew: boolean;
}

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
  // Track manual overrides
  manualOverrides: {
    monthsActive?: boolean;
    trendDirection?: boolean;
    trendPercentage?: boolean;
    crossAppCount?: boolean;
    isNew?: boolean;
  };
}

// Mock existing themes for preview context (simulating what already exists in the system)
const mockContextThemes: ThemeFormData[] = [
  {
    title: 'Slow Performance',
    percentage: 22,
    type: 'negative',
    descriptionBullets: ['App takes too long to load', 'Frequent lag during peak hours'],
    exampleComments: ['It takes forever to open', 'The system is so slow it impacts my productivity'],
    monthsActive: 5,
    trendDirection: 'stable',
    trendPercentage: 0,
    crossAppCount: 1,
    isNew: false,
    status: 'unresolved',
    manualOverrides: {},
  },
  {
    title: 'Helpful Notifications',
    percentage: 18,
    type: 'positive',
    descriptionBullets: ['Timely alerts keep me informed', 'Notifications are relevant and not overwhelming'],
    exampleComments: ['Love getting updates when I need them'],
    monthsActive: 8,
    trendDirection: 'stable',
    trendPercentage: 1,
    crossAppCount: 1,
    isNew: false,
    status: 'stabilized',
    manualOverrides: {},
  },
];

// Mock existing themes for search
const mockExistingThemes: ExistingTheme[] = [
  { title: 'Navigation Confusion', appId: '3', appName: 'Order Up', percentage: 28, type: 'negative', monthsActive: 3, trendDirection: 'increasing', trendPercentage: 5, crossAppCount: 1, isNew: false },
  { title: 'Navigation Confusion', appId: '14', appName: 'Sidekick', percentage: 35, type: 'negative', monthsActive: 6, trendDirection: 'stable', trendPercentage: 0, crossAppCount: 2, isNew: false },
  { title: 'Slow Performance', appId: '3', appName: 'Order Up', percentage: 22, type: 'negative', monthsActive: 5, trendDirection: 'decreasing', trendPercentage: -3, crossAppCount: 4, isNew: false },
  { title: 'Login Issues', appId: '14', appName: 'Sidekick', percentage: 18, type: 'negative', monthsActive: 2, trendDirection: 'increasing', trendPercentage: 8, crossAppCount: 1, isNew: true },
  { title: 'Intuitive Design', appId: '2', appName: 'My View', percentage: 42, type: 'positive', monthsActive: 12, trendDirection: 'stable', trendPercentage: 1, crossAppCount: 1, isNew: false },
  { title: 'Search Functionality', appId: '5', appName: 'Specialty Project tool', percentage: 25, type: 'negative', monthsActive: 4, trendDirection: 'stable', trendPercentage: 0, crossAppCount: 3, isNew: false },
  { title: 'Search Functionality', appId: '3', appName: 'Order Up', percentage: 19, type: 'negative', monthsActive: 2, trendDirection: 'increasing', trendPercentage: 6, crossAppCount: 3, isNew: false },
];

const emptyTheme: ThemeFormData = {
  title: '',
  percentage: 0,
  type: 'negative',
  descriptionBullets: [''],
  exampleComments: [],
  monthsActive: undefined,
  trendDirection: undefined,
  trendPercentage: undefined,
  crossAppCount: undefined,
  isNew: false,
  status: 'unresolved',
  manualOverrides: {},
};

export function AdminThemesView({
  onNavigateBack,
  onNavigateHome,
  onNavigateAllApps,
  onNavigateKeyJourneys,
  onNavigateTopPains,
  onTabChange,
}: AdminThemesViewProps) {
  const [themes, setThemes] = useState<ThemeFormData[]>([{ ...emptyTheme }]);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [journeyMode, setJourneyMode] = useState<'none' | 'existing' | 'new'>('none');
  const [selectedJourney, setSelectedJourney] = useState<string>('');
  const [newJourneyName, setNewJourneyName] = useState<string>('');
  const [timePeriod, setTimePeriod] = useState<string>('November 2025');
  const [successMessage, setSuccessMessage] = useState('');
  const [showAppDropdown, setShowAppDropdown] = useState(false);
  const appDropdownRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<'new-only' | 'full-context'>('new-only');
  
  // Theme search state - one per theme
  const [themeSearchQueries, setThemeSearchQueries] = useState<string[]>(['']);
  const [themeSearchResults, setThemeSearchResults] = useState<ExistingTheme[][]>([[]]);
  const [showThemeSearchDropdowns, setShowThemeSearchDropdowns] = useState<boolean[]>([false]);
  const themeSearchRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Close app dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (appDropdownRef.current && !appDropdownRef.current.contains(event.target as Node)) {
        setShowAppDropdown(false);
      }
      
      // Close theme search dropdowns
      themeSearchRefs.current.forEach((ref, index) => {
        if (ref && !ref.contains(event.target as Node)) {
          const newShowDropdowns = [...showThemeSearchDropdowns];
          newShowDropdowns[index] = false;
          setShowThemeSearchDropdowns(newShowDropdowns);
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showThemeSearchDropdowns]);

  // Search existing themes with prioritization
  const searchThemes = (query: string, themeIndex: number) => {
    if (query.trim() === '') {
      const newResults = [...themeSearchResults];
      newResults[themeIndex] = [];
      setThemeSearchResults(newResults);
      return;
    }

    // Filter matching themes
    const matches = mockExistingThemes.filter(theme =>
      theme.title.toLowerCase().includes(query.toLowerCase())
    );

    // Prioritize: selected apps first, then others
    const selectedAppMatches = matches.filter(theme => 
      selectedApps.includes(theme.appId)
    );
    const otherMatches = matches.filter(theme => 
      !selectedApps.includes(theme.appId)
    );

    const newResults = [...themeSearchResults];
    newResults[themeIndex] = [...selectedAppMatches, ...otherMatches];
    setThemeSearchResults(newResults);
  };

  const updateThemeSearchQuery = (index: number, value: string) => {
    const newQueries = [...themeSearchQueries];
    newQueries[index] = value;
    setThemeSearchQueries(newQueries);
    
    // Also update the theme title
    updateTheme(index, 'title', value);
    
    // Search for matches
    searchThemes(value, index);
    
    // Show dropdown if there's a query
    const newShowDropdowns = [...showThemeSearchDropdowns];
    newShowDropdowns[index] = value.trim() !== '';
    setShowThemeSearchDropdowns(newShowDropdowns);
  };

  const selectExistingTheme = (themeIndex: number, existingTheme: ExistingTheme) => {
    const newThemes = [...themes];
    newThemes[themeIndex] = {
      ...newThemes[themeIndex],
      title: existingTheme.title,
      type: existingTheme.type,
      monthsActive: existingTheme.monthsActive,
      trendDirection: existingTheme.trendDirection,
      trendPercentage: existingTheme.trendPercentage,
      crossAppCount: existingTheme.crossAppCount,
      isNew: existingTheme.isNew,
    };
    setThemes(newThemes);

    // Update search query
    const newQueries = [...themeSearchQueries];
    newQueries[themeIndex] = existingTheme.title;
    setThemeSearchQueries(newQueries);

    // Hide dropdown
    const newShowDropdowns = [...showThemeSearchDropdowns];
    newShowDropdowns[themeIndex] = false;
    setShowThemeSearchDropdowns(newShowDropdowns);
  };

  const addTheme = () => {
    setThemes([...themes, { ...emptyTheme, status: 'unresolved' }]);
    setThemeSearchQueries([...themeSearchQueries, '']);
    setThemeSearchResults([...themeSearchResults, []]);
    setShowThemeSearchDropdowns([...showThemeSearchDropdowns, false]);
  };

  const removeTheme = (index: number) => {
    if (themes.length > 1) {
      setThemes(themes.filter((_, i) => i !== index));
      setThemeSearchQueries(themeSearchQueries.filter((_, i) => i !== index));
      setThemeSearchResults(themeSearchResults.filter((_, i) => i !== index));
      setShowThemeSearchDropdowns(showThemeSearchDropdowns.filter((_, i) => i !== index));
    }
  };

  const updateTheme = (index: number, field: keyof ThemeFormData, value: any, isManualOverride = false) => {
    const newThemes = [...themes];
    newThemes[index] = { ...newThemes[index], [field]: value };
    
    // Auto-set status to 'unresolved' when type changes to 'negative'
    if (field === 'type' && value === 'negative' && !newThemes[index].status) {
      newThemes[index].status = 'unresolved';
    }
    
    // Track manual overrides for auto-calculated fields
    if (isManualOverride && (field === 'monthsActive' || field === 'trendDirection' || field === 'trendPercentage' || field === 'crossAppCount' || field === 'isNew')) {
      newThemes[index].manualOverrides[field] = true;
    }
    
    setThemes(newThemes);
  };

  const addDescriptionBullet = (themeIndex: number) => {
    const newThemes = [...themes];
    newThemes[themeIndex].descriptionBullets.push('');
    setThemes(newThemes);
  };

  const updateDescriptionBullet = (themeIndex: number, bulletIndex: number, value: string) => {
    const newThemes = [...themes];
    newThemes[themeIndex].descriptionBullets[bulletIndex] = value;
    setThemes(newThemes);
  };

  const removeDescriptionBullet = (themeIndex: number, bulletIndex: number) => {
    const newThemes = [...themes];
    if (newThemes[themeIndex].descriptionBullets.length > 1) {
      newThemes[themeIndex].descriptionBullets = newThemes[themeIndex].descriptionBullets.filter((_, i) => i !== bulletIndex);
      setThemes(newThemes);
    }
  };

  const addExampleComment = (themeIndex: number) => {
    const newThemes = [...themes];
    newThemes[themeIndex].exampleComments.push('');
    setThemes(newThemes);
  };

  const updateExampleComment = (themeIndex: number, commentIndex: number, value: string) => {
    const newThemes = [...themes];
    newThemes[themeIndex].exampleComments[commentIndex] = value;
    setThemes(newThemes);
  };

  const removeExampleComment = (themeIndex: number, commentIndex: number) => {
    const newThemes = [...themes];
    newThemes[themeIndex].exampleComments.splice(commentIndex, 1);
    setThemes(newThemes);
  };

  const handlePreview = () => {
    // Validate before showing preview
    const isValid = themes.every(theme => 
      theme.title.trim() !== '' && 
      theme.percentage > 0 && 
      theme.descriptionBullets.some(b => b.trim() !== '')
    );

    if (!isValid) {
      alert('Please fill in all required fields before previewing');
      return;
    }

    setShowPreview(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const isValid = themes.every(theme => 
      theme.title.trim() !== '' && 
      theme.percentage > 0 && 
      theme.descriptionBullets.some(b => b.trim() !== '')
    );

    if (!isValid) {
      alert('Please fill in all required fields (Title, Percentage, and at least one Description Bullet)');
      return;
    }

    // Here you would normally send this to your backend
    console.log('Submitting themes:', {
      targetApp: selectedApps,
      targetJourney: journeyMode === 'new' ? newJourneyName : selectedJourney,
      timePeriod,
      themes: themes.map(theme => ({
        ...theme,
        descriptionBullets: theme.descriptionBullets.filter(b => b.trim() !== ''),
        exampleComments: theme.exampleComments.filter(c => c.trim() !== ''),
      })),
    });

    setSuccessMessage('Themes submitted successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
    
    // Reset form
    setThemes([{ ...emptyTheme }]);
    setSelectedApps([]);
    setJourneyMode('none');
    setSelectedJourney('');
    setNewJourneyName('');
    setThemeSearchQueries(['']);
    setThemeSearchResults([[]]);
    setShowThemeSearchDropdowns([false]);
    setShowPreview(false);
  };

  const navItems = [
    { id: 'home', label: 'Home', onClick: onNavigateHome },
    { id: 'all-apps', label: 'All Apps', onClick: onNavigateAllApps },
    { id: 'key-journeys', label: 'Key Journeys', onClick: onNavigateKeyJourneys },
    { id: 'top-pains', label: 'Top Pains', onClick: onNavigateTopPains },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Preview Modal */}
      {showPreview && (
        <AdminThemesPreview
          themes={themes}
          contextThemes={mockContextThemes}
          contextInfo={{
            apps: selectedApps.length > 0 ? selectedApps.map(id => mockApps.find(a => a.id === id)?.name).join(', ') : 'None',
            journey: journeyMode === 'existing' ? mockJourneys.find(j => j.id === selectedJourney)?.name || 'None' : journeyMode === 'new' ? newJourneyName : 'None',
            timePeriod,
          }}
          onClose={() => setShowPreview(false)}
          onSubmit={handleSubmit}
        />
      )}

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
                <Eye className="size-5" />
                <h1 className="font-semibold">Admin: Submit Feedback Themes</h1>
              </div>
              <p className="text-white/90 mt-1 text-sm">
                Pre-compile and submit feedback themes for apps, journeys, or time periods
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
      <AdminTabNav activeTab="submit" onTabChange={onTabChange} />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded text-green-800">
            {successMessage}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handlePreview(); }} className="space-y-8">
          {/* Target Context */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Target Context</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetApp">Target App(s)</Label>
                <div className="relative" ref={appDropdownRef}>
                  <Input
                    id="targetApp"
                    value={selectedApps.length > 0 ? `${selectedApps.length} app(s) selected` : ''}
                    readOnly
                    placeholder="Click to select app(s)"
                    onClick={() => setShowAppDropdown(!showAppDropdown)}
                    className="cursor-pointer"
                  />
                  {showAppDropdown && (
                    <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-slate-300 rounded shadow-lg">
                      {mockApps.map(app => (
                        <label
                          key={app.id}
                          className="flex items-center px-4 py-2 cursor-pointer hover:bg-slate-100"
                        >
                          <input
                            type="checkbox"
                            checked={selectedApps.includes(app.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              setSelectedApps(prev => 
                                prev.includes(app.id) 
                                  ? prev.filter(a => a !== app.id) 
                                  : [...prev, app.id]
                              );
                            }}
                            className="mr-2 size-4"
                          />
                          <span className="text-sm">{app.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500">Select one or more apps (optional)</p>
                {selectedApps.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedApps.map(appId => {
                      const app = mockApps.find(a => a.id === appId);
                      return app ? (
                        <span
                          key={appId}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded text-sm"
                        >
                          {app.name}
                          <button
                            type="button"
                            onClick={() => setSelectedApps(prev => prev.filter(a => a !== appId))}
                            className="text-slate-500 hover:text-slate-700"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetJourney">Target Journey</Label>
                <Select value={journeyMode} onValueChange={(value) => {
                  setJourneyMode(value as 'none' | 'existing' | 'new');
                  if (value === 'none') {
                    setSelectedJourney('');
                    setNewJourneyName('');
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select journey mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="existing">Select Existing Journey</SelectItem>
                    <SelectItem value="new">Create New Journey</SelectItem>
                  </SelectContent>
                </Select>
                {journeyMode === 'existing' && (
                  <Select value={selectedJourney} onValueChange={setSelectedJourney}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select journey" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockJourneys.map(journey => (
                        <SelectItem key={journey.id} value={journey.id}>{journey.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {journeyMode === 'new' && (
                  <Input
                    id="newJourneyName"
                    value={newJourneyName}
                    onChange={(e) => setNewJourneyName(e.target.value)}
                    placeholder="Enter new journey name"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="timePeriod">Time Period</Label>
                <Select value={timePeriod} onValueChange={setTimePeriod}>
                  <SelectTrigger>
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
              </div>
            </div>
          </Card>

          {/* Themes */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Feedback Themes</h2>
              <Button type="button" variant="outline" size="sm" onClick={addTheme}>
                <Plus className="size-4 mr-2" />
                Add Theme
              </Button>
            </div>

            {themes.map((theme, themeIndex) => (
              <Card key={themeIndex} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Theme {themeIndex + 1}
                  </h3>
                  {themes.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTheme(themeIndex)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Theme Title with Smart Search */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor={`title-${themeIndex}`}>
                        Theme Title <span className="text-red-600">*</span>
                      </Label>
                      <div className="relative" ref={el => themeSearchRefs.current[themeIndex] = el}>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                          <Input
                            id={`title-${themeIndex}`}
                            value={themeSearchQueries[themeIndex] || ''}
                            onChange={(e) => updateThemeSearchQuery(themeIndex, e.target.value)}
                            placeholder="Search existing themes or enter new..."
                            className="pl-9"
                            required
                          />
                        </div>
                        {showThemeSearchDropdowns[themeIndex] && themeSearchResults[themeIndex]?.length > 0 && (
                          <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-slate-300 rounded shadow-lg">
                            {selectedApps.length > 0 && themeSearchResults[themeIndex].some(t => selectedApps.includes(t.appId)) && (
                              <div className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-600 border-b">
                                From Selected App(s)
                              </div>
                            )}
                            {themeSearchResults[themeIndex].map((existingTheme, resultIndex) => {
                              const isFromSelectedApp = selectedApps.includes(existingTheme.appId);
                              const showSeparator = resultIndex > 0 && 
                                !isFromSelectedApp && 
                                selectedApps.includes(themeSearchResults[themeIndex][resultIndex - 1].appId);
                              
                              return (
                                <div key={resultIndex}>
                                  {showSeparator && (
                                    <div className="px-3 py-2 bg-slate-50 text-xs font-semibold text-slate-600 border-b border-t">
                                      From Other Apps
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => selectExistingTheme(themeIndex, existingTheme)}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-100 border-b border-slate-100 last:border-b-0"
                                  >
                                    <div className="font-medium text-sm">{existingTheme.title}</div>
                                    <div className="text-xs text-slate-600 mt-1 flex items-center gap-3">
                                      <span className="font-semibold">{existingTheme.appName}</span>
                                      <span>{existingTheme.percentage}%</span>
                                      <span className={existingTheme.type === 'positive' ? 'text-green-700' : existingTheme.type === 'negative' ? 'text-red-700' : 'text-slate-700'}>
                                        {existingTheme.type}
                                      </span>
                                      {existingTheme.isNew && <span className="text-amber-600">NEW</span>}
                                    </div>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        {selectedApps.length > 0 
                          ? 'Showing themes from selected apps first, then others' 
                          : 'Search to see existing themes from all apps'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`percentage-${themeIndex}`}>
                        Percentage <span className="text-red-600">*</span>
                      </Label>
                      <Input
                        id={`percentage-${themeIndex}`}
                        type="number"
                        min="0"
                        max="100"
                        value={theme.percentage || ''}
                        onChange={(e) => updateTheme(themeIndex, 'percentage', parseFloat(e.target.value) || 0)}
                        placeholder="25"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`type-${themeIndex}`}>
                        Type <span className="text-red-600">*</span>
                      </Label>
                      <Select 
                        value={theme.type} 
                        onValueChange={(value) => updateTheme(themeIndex, 'type', value)}
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
                      <Label htmlFor={`status-${themeIndex}`}>Status {theme.type === 'negative' ? <span className="text-red-600">*</span> : <span className="text-slate-500">(Optional)</span>}</Label>
                      <Select 
                        value={theme.status || 'none'} 
                        onValueChange={(value) => updateTheme(themeIndex, 'status', value === 'none' ? undefined : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {theme.type !== 'negative' && <SelectItem value="none">None</SelectItem>}
                          <SelectItem value="unresolved">Unresolved</SelectItem>
                          <SelectItem value="improving">Improving</SelectItem>
                          <SelectItem value="stabilized">Stabilized</SelectItem>
                          <SelectItem value="resolved-monitoring">Resolved - Monitoring</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Auto-Calculated Metadata with Override Indicators */}
                  <div className="bg-slate-50 p-4 rounded border border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="size-4 text-slate-600" />
                      <Label className="text-sm font-semibold">Auto-Calculated Metadata</Label>
                      <span className="text-xs text-slate-500">(System fills these automatically; manual edits flagged)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`monthsActive-${themeIndex}`} className="text-sm flex items-center gap-1">
                          Months Active
                          {theme.manualOverrides.monthsActive && (
                            <AlertCircle className="size-3 text-amber-600" title="Manually edited" />
                          )}
                        </Label>
                        <Input
                          id={`monthsActive-${themeIndex}`}
                          type="number"
                          min="0"
                          value={theme.monthsActive || ''}
                          onChange={(e) => updateTheme(themeIndex, 'monthsActive', e.target.value ? parseInt(e.target.value) : undefined, true)}
                          placeholder="Auto"
                          className={theme.manualOverrides.monthsActive ? 'border-amber-400 bg-amber-50' : ''}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`trendDirection-${themeIndex}`} className="text-sm flex items-center gap-1">
                          Trend
                          {theme.manualOverrides.trendDirection && (
                            <AlertCircle className="size-3 text-amber-600" title="Manually edited" />
                          )}
                        </Label>
                        <Select 
                          value={theme.trendDirection || 'auto'} 
                          onValueChange={(value) => updateTheme(themeIndex, 'trendDirection', value === 'auto' ? undefined : value, true)}
                        >
                          <SelectTrigger className={theme.manualOverrides.trendDirection ? 'border-amber-400 bg-amber-50' : ''}>
                            <SelectValue placeholder="Auto" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto</SelectItem>
                            <SelectItem value="increasing">Increasing</SelectItem>
                            <SelectItem value="decreasing">Decreasing</SelectItem>
                            <SelectItem value="stable">Stable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`trendPercentage-${themeIndex}`} className="text-sm flex items-center gap-1">
                          Trend %
                          {theme.manualOverrides.trendPercentage && (
                            <AlertCircle className="size-3 text-amber-600" title="Manually edited" />
                          )}
                        </Label>
                        <Input
                          id={`trendPercentage-${themeIndex}`}
                          type="number"
                          value={theme.trendPercentage || ''}
                          onChange={(e) => updateTheme(themeIndex, 'trendPercentage', e.target.value ? parseFloat(e.target.value) : undefined, true)}
                          placeholder="Auto"
                          className={theme.manualOverrides.trendPercentage ? 'border-amber-400 bg-amber-50' : ''}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`crossAppCount-${themeIndex}`} className="text-sm flex items-center gap-1">
                          Cross-App Count
                          {theme.manualOverrides.crossAppCount && (
                            <AlertCircle className="size-3 text-amber-600" title="Manually edited" />
                          )}
                        </Label>
                        <Input
                          id={`crossAppCount-${themeIndex}`}
                          type="number"
                          min="1"
                          value={theme.crossAppCount || ''}
                          onChange={(e) => updateTheme(themeIndex, 'crossAppCount', e.target.value ? parseInt(e.target.value) : undefined, true)}
                          placeholder="Auto"
                          className={theme.manualOverrides.crossAppCount ? 'border-amber-400 bg-amber-50' : ''}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <input
                        id={`isNew-${themeIndex}`}
                        type="checkbox"
                        checked={theme.isNew || false}
                        onChange={(e) => updateTheme(themeIndex, 'isNew', e.target.checked, true)}
                        className="size-4 rounded border-slate-300"
                      />
                      <Label htmlFor={`isNew-${themeIndex}`} className="cursor-pointer text-sm flex items-center gap-1">
                        Mark as new/emerging pattern
                        {theme.manualOverrides.isNew && (
                          <AlertCircle className="size-3 text-amber-600" title="Manually edited" />
                        )}
                      </Label>
                    </div>
                  </div>

                  {/* Description Bullets */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>
                        Description Bullets <span className="text-red-600">*</span>
                        <span className="text-xs font-normal text-slate-500 ml-2">(2-3 recommended)</span>
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addDescriptionBullet(themeIndex)}
                      >
                        <Plus className="size-3 mr-1" />
                        Add Bullet
                      </Button>
                    </div>

                    {theme.descriptionBullets.map((bullet, bulletIndex) => (
                      <div key={bulletIndex} className="flex gap-2">
                        <Textarea
                          value={bullet}
                          onChange={(e) => updateDescriptionBullet(themeIndex, bulletIndex, e.target.value)}
                          placeholder="Describe the feedback pattern..."
                          rows={2}
                          className="flex-1"
                        />
                        {theme.descriptionBullets.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDescriptionBullet(themeIndex, bulletIndex)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="size-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Example Comments */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>
                        Example Comments <span className="text-slate-500">(Optional)</span>
                        <span className="text-xs font-normal text-slate-500 ml-2">(2-3 recommended)</span>
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addExampleComment(themeIndex)}
                      >
                        <Plus className="size-3 mr-1" />
                        Add Example
                      </Button>
                    </div>

                    {theme.exampleComments.length === 0 && (
                      <p className="text-sm text-slate-500 italic">No example comments added yet. Click "Add Example" to include sample feedback.</p>
                    )}

                    {theme.exampleComments.map((comment, commentIndex) => (
                      <div key={commentIndex} className="flex gap-2">
                        <Textarea
                          value={comment}
                          onChange={(e) => updateExampleComment(themeIndex, commentIndex, e.target.value)}
                          placeholder="Example: &quot;The navigation is confusing and hard to find what I need...&quot;"
                          rows={2}
                          className="flex-1 italic"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExampleComment(themeIndex, commentIndex)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onNavigateBack}>
              Cancel
            </Button>
            <Button type="submit" variant="outline" style={{ borderColor: '#ff6900', color: '#ff6900' }} className="hover:bg-orange-50">
              <FileText className="size-4 mr-2" />
              Preview
            </Button>
            <Button type="button" onClick={handleSubmit} style={{ backgroundColor: '#ff6900' }} className="text-white hover:opacity-90">
              <Save className="size-4 mr-2" />
              Submit Themes
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}