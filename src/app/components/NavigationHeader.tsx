import React from 'react';
import { Button } from './ui/button';
import { FileDown } from 'lucide-react';

interface NavigationHeaderProps {
  currentView: 'home' | 'all-apps' | 'key-journeys' | 'top-pains' | 'other';
  onNavigateHome: () => void;
  onNavigateAllApps: () => void;
  onNavigateKeyJourneys: () => void;
  onNavigateTopPains: () => void;
  onNavigateAdmin?: () => void;
  onNavigateExport?: () => void;
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  showExportButton?: boolean;
  showAdminButton?: boolean;
}

export function NavigationHeader({
  currentView,
  onNavigateHome,
  onNavigateAllApps,
  onNavigateKeyJourneys,
  onNavigateTopPains,
  onNavigateAdmin,
  onNavigateExport,
  title,
  subtitle,
  lastUpdated,
  showExportButton = true,
  showAdminButton = true,
}: NavigationHeaderProps) {
  const navItems = [
    { id: 'home', label: 'Home', onClick: onNavigateHome },
    { id: 'all-apps', label: 'All Apps', onClick: onNavigateAllApps },
    { id: 'key-journeys', label: 'Key Journeys', onClick: onNavigateKeyJourneys },
    { id: 'top-pains', label: 'Top Pains', onClick: onNavigateTopPains },
  ];

  const isAdminButtonVisible = showAdminButton && (localStorage.getItem('adminShowButton') ?? 'true') !== 'false';

  return (
    <header className="border-b border-slate-200 bg-slate-900 text-white">
      {/* Navigation Tabs */}
      <nav className="border-b border-slate-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                onClick={item.onClick}
                className={`rounded-none border-b-2 px-4 py-3 transition-colors ${
                  currentView === item.id
                    ? 'border-orange-500 bg-slate-800 text-white hover:bg-slate-800'
                    : 'border-transparent text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </nav>

      {/* Page Title Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="font-semibold">{title}</h1>
            {subtitle && <p className="text-slate-300 mt-1 text-sm">{subtitle}</p>}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {showExportButton && (
              <Button
                onClick={onNavigateExport}
                disabled={!onNavigateExport}
                variant="outline"
                size="sm"
                className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 w-full sm:w-auto"
              >
                <FileDown className="size-4 mr-2" />
                Export PDF
              </Button>
            )}
            {onNavigateAdmin && isAdminButtonVisible && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNavigateAdmin}
                className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 w-full sm:w-auto"
                title="Admin Access"
              >
                👀
              </Button>
            )}
          </div>
        </div>
        {lastUpdated && <p className="text-slate-400 mt-3 text-sm">Last updated: {lastUpdated}</p>}
      </div>

    </header>
  );
}