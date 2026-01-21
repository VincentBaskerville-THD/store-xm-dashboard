import { FileText, Database, Map, Settings, Lock } from 'lucide-react';

interface AdminTabNavProps {
  activeTab: 'submit' | 'manage-themes' | 'manage-journeys' | 'manage-apps' | 'settings';
  onTabChange: (tab: 'submit' | 'manage-themes' | 'manage-journeys' | 'manage-apps' | 'settings') => void;
}

export function AdminTabNav({ activeTab, onTabChange }: AdminTabNavProps) {
  const tabs = [
    { id: 'submit' as const, label: 'Submit New Themes', icon: FileText },
    { id: 'manage-themes' as const, label: 'Manage Themes', icon: Database },
    { id: 'manage-journeys' as const, label: 'Manage Journeys', icon: Map },
    { id: 'manage-apps' as const, label: 'Manage Apps', icon: Settings },
    { id: 'settings' as const, label: 'Settings', icon: Lock },
  ];

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2
                  ${isActive 
                    ? 'border-[#ff6900] text-[#ff6900]' 
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }
                `}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}