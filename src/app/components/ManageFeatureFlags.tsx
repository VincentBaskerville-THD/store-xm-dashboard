import { Flag } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Switch } from './ui/switch';
import { AdminTabNav } from './AdminTabNav';

interface FeatureFlags {
  keyJourneysEnabled: boolean;
  topPainsEnabled: boolean;
}

interface ManageFeatureFlagsProps {
  onNavigateBack: () => void;
  onNavigateHome?: () => void;
  onNavigateAllApps?: () => void;
  onNavigateKeyJourneys?: () => void;
  onNavigateTopPains?: () => void;
  onTabChange: (tab: 'manage-themes' | 'manage-journeys' | 'manage-apps' | 'feature-flags' | 'settings') => void;
  flags: FeatureFlags;
  onFlagsChange: (nextFlags: FeatureFlags) => void;
  useLocalOverrides?: boolean;
  onUseLocalOverridesChange?: (enabled: boolean) => void;
}

export function ManageFeatureFlags({
  onNavigateBack,
  onNavigateHome,
  onNavigateAllApps,
  onNavigateKeyJourneys,
  onNavigateTopPains,
  onTabChange,
  flags,
  onFlagsChange,
  useLocalOverrides,
  onUseLocalOverridesChange,
}: ManageFeatureFlagsProps) {
  const navItems = [
    { id: 'portfolio', label: 'Portfolio', onClick: onNavigateHome || onNavigateBack },
    { id: 'all-apps', label: 'All Apps', onClick: onNavigateAllApps || onNavigateBack },
    { id: 'key-journeys', label: 'Key Journeys', onClick: onNavigateKeyJourneys || onNavigateBack },
    { id: 'top-pains', label: 'Top Pains', onClick: onNavigateTopPains || onNavigateBack },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 text-white" style={{ backgroundColor: '#ff6900' }}>
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

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center gap-2">
            <Flag className="size-5" />
            <h1 className="font-semibold">Admin: Feature Flags</h1>
          </div>
          <p className="text-sm text-white/80 mt-1">
            Control which in-progress pages are visible on deployed builds.
          </p>
        </div>
      </header>

      <AdminTabNav activeTab="feature-flags" onTabChange={onTabChange} />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Page Visibility</h2>
            <p className="text-sm text-gray-600 mt-1">
              Toggle these on locally to view the real pages while keeping production on Coming Soon.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
              <div>
                <p className="font-medium text-slate-900">Use local overrides</p>
                <p className="text-sm text-slate-600">
                  When enabled, these flags only apply on this device.
                </p>
              </div>
              <Switch
                checked={Boolean(useLocalOverrides)}
                onCheckedChange={(checked) => onUseLocalOverridesChange?.(checked)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
              <div>
                <p className="font-medium text-slate-900">Key Journeys content</p>
                <p className="text-sm text-slate-600">Show the full Key Journeys page instead of Coming Soon.</p>
              </div>
              <Switch
                checked={flags.keyJourneysEnabled}
                onCheckedChange={(checked) => onFlagsChange({ ...flags, keyJourneysEnabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
              <div>
                <p className="font-medium text-slate-900">Top Pains content</p>
                <p className="text-sm text-slate-600">Show the full Top Pains page instead of Coming Soon.</p>
              </div>
              <Switch
                checked={flags.topPainsEnabled}
                onCheckedChange={(checked) => onFlagsChange({ ...flags, topPainsEnabled: checked })}
              />
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
