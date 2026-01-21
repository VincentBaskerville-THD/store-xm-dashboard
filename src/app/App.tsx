import { useState } from 'react';
import { PortfolioOverview } from './components/PortfolioOverview';
import { AppDetail } from './components/AppDetail';
import { AppDetailEnhanced } from './components/AppDetailEnhanced';
import { JourneyDetail } from './components/JourneyDetail';
import { JourneyDetailEnhanced } from './components/JourneyDetailEnhanced';
import { AllAppsOverTime } from './components/AllAppsOverTime';
import { AllJourneysView } from './components/AllJourneysView';
import { TimeSeriesView } from './components/TimeSeriesView';
import { AllAppsTimeGrid } from './components/AllAppsTimeGrid';
import { TopPains } from './components/TopPains';
import type { TimePeriodData } from './components/TimeSelector';

export type ViewType = 'portfolio' | 'app-detail' | 'app-detail-enhanced' | 'journey-detail' | 'journey-detail-enhanced' | 'all-apps' | 'all-journeys' | 'time-series' | 'apps-time-grid-executive' | 'apps-time-grid-practitioner' | 'top-pains';
export type TimePeriod = 'November 2025' | 'October 2025' | 'Q4 2025' | 'Q3 2025' | '2025' | '2024';

export interface AppData {
  id: string;
  name: string;
  overallScore: number;
  scoreMoM: number;
  easeOfUse: number;
  usefulness: number;
  responses: number;
  trend: 'up' | 'down' | 'stable';
  metricsSystem: 'pendo' | 'medallia';
}

export interface JourneyData {
  id: string;
  name: string;
  overallScore: number;
  touchpoints: number;
  appsInvolved: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  trendPercentage: number;
}

interface NavigationState {
  view: ViewType;
  selectedApp?: string | null;
  selectedJourney?: string | null;
}

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('portfolio');
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [selectedJourney, setSelectedJourney] = useState<string | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<NavigationState[]>([
    { view: 'portfolio', selectedApp: null, selectedJourney: null }
  ]);
  const [timePeriod, setTimePeriod] = useState<TimePeriodData>({
    format: 'month',
    period: 'November 2025',
  });

  const pushToHistory = (view: ViewType, appId?: string | null, journeyId?: string | null) => {
    const newState: NavigationState = {
      view,
      selectedApp: appId,
      selectedJourney: journeyId,
    };
    setNavigationHistory(prev => [...prev, newState]);
  };

  const navigateToAppDetail = (appId: string) => {
    pushToHistory('app-detail-enhanced', appId, null);
    setSelectedApp(appId);
    setCurrentView('app-detail-enhanced');
  };

  const navigateToJourneyDetail = (journeyId: string) => {
    pushToHistory('journey-detail-enhanced', null, journeyId);
    setSelectedJourney(journeyId);
    setCurrentView('journey-detail-enhanced');
  };

  const navigateToView = (view: ViewType) => {
    pushToHistory(view, null, null);
    setCurrentView(view);
  };

  const navigateToPortfolio = () => {
    pushToHistory('portfolio', null, null);
    setCurrentView('portfolio');
    setSelectedApp(null);
    setSelectedJourney(null);
  };

  const navigateToAllApps = () => {
    pushToHistory('all-apps', null, null);
    setCurrentView('all-apps');
    setSelectedApp(null);
    setSelectedJourney(null);
  };

  const navigateToAllJourneys = () => {
    pushToHistory('all-journeys', null, null);
    setCurrentView('all-journeys');
    setSelectedApp(null);
    setSelectedJourney(null);
  };

  const navigateToTopPains = () => {
    pushToHistory('top-pains', null, null);
    setCurrentView('top-pains');
    setSelectedApp(null);
    setSelectedJourney(null);
  };

  const navigateBack = () => {
    if (navigationHistory.length > 1) {
      // Remove current state
      const newHistory = navigationHistory.slice(0, -1);
      setNavigationHistory(newHistory);
      
      // Go to previous state
      const previousState = newHistory[newHistory.length - 1];
      setCurrentView(previousState.view);
      setSelectedApp(previousState.selectedApp || null);
      setSelectedJourney(previousState.selectedJourney || null);
    } else {
      // Fallback to portfolio if history is empty
      setCurrentView('portfolio');
      setSelectedApp(null);
      setSelectedJourney(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {currentView === 'portfolio' && (
        <PortfolioOverview
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          onNavigateToApp={navigateToAppDetail}
          onNavigateToJourney={navigateToJourneyDetail}
          onNavigateToView={navigateToView}
        />
      )}
      {currentView === 'app-detail' && selectedApp && (
        <AppDetail
          appId={selectedApp}
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          onNavigateBack={navigateBack}
        />
      )}
      {currentView === 'app-detail-enhanced' && selectedApp && (
        <AppDetailEnhanced
          appId={selectedApp}
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          onNavigateBack={navigateBack}
          onNavigateHome={navigateToPortfolio}
          onNavigateAllApps={navigateToAllApps}
          onNavigateKeyJourneys={navigateToAllJourneys}
          onNavigateTopPains={navigateToTopPains}
        />
      )}
      {currentView === 'journey-detail' && selectedJourney && (
        <JourneyDetail
          journeyId={selectedJourney}
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          onNavigateBack={navigateBack}
        />
      )}
      {currentView === 'journey-detail-enhanced' && selectedJourney && (
        <JourneyDetailEnhanced
          journeyId={selectedJourney}
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          onNavigateBack={navigateBack}
          onNavigateToApp={navigateToAppDetail}
          onNavigateHome={navigateToPortfolio}
          onNavigateAllApps={navigateToAllApps}
          onNavigateKeyJourneys={navigateToAllJourneys}
          onNavigateTopPains={navigateToTopPains}
        />
      )}
      {currentView === 'all-apps' && (
        <AllAppsOverTime
          onNavigateToApp={navigateToAppDetail}
          onNavigateBack={navigateBack}
          onNavigateHome={navigateToPortfolio}
          onNavigateAllApps={navigateToAllApps}
          onNavigateKeyJourneys={navigateToAllJourneys}
          onNavigateTopPains={navigateToTopPains}
        />
      )}
      {currentView === 'all-journeys' && (
        <AllJourneysView
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          onNavigateToJourney={navigateToJourneyDetail}
          onNavigateBack={navigateBack}
          onNavigateHome={navigateToPortfolio}
          onNavigateAllApps={navigateToAllApps}
          onNavigateKeyJourneys={navigateToAllJourneys}
          onNavigateTopPains={navigateToTopPains}
        />
      )}
      {currentView === 'time-series' && (
        <TimeSeriesView
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          onNavigateBack={navigateBack}
        />
      )}
      {currentView === 'apps-time-grid-executive' && (
        <AllAppsTimeGrid
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          onNavigateToApp={navigateToAppDetail}
          onNavigateBack={navigateBack}
          role="executive"
        />
      )}
      {currentView === 'apps-time-grid-practitioner' && (
        <AllAppsTimeGrid
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          onNavigateToApp={navigateToAppDetail}
          onNavigateBack={navigateBack}
          role="practitioner"
        />
      )}
      {currentView === 'top-pains' && (
        <TopPains
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
          onNavigateBack={navigateBack}
          onNavigateHome={navigateToPortfolio}
          onNavigateAllApps={navigateToAllApps}
          onNavigateKeyJourneys={navigateToAllJourneys}
          onNavigateTopPains={navigateToTopPains}
        />
      )}
    </div>
  );
}

export default App;