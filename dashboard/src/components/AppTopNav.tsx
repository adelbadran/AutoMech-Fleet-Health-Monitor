import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Activity,
  Database,
  Settings,
  ChevronUp,
  Menu,
} from 'lucide-react';

export type AppTab = 'live' | 'ai' | 'dataset';

const NAV_ITEMS: { id: AppTab; label: string; shortLabel: string; icon: LucideIcon }[] = [
  { id: 'live', label: 'Live Monitoring', shortLabel: 'Live', icon: LayoutDashboard },
  { id: 'ai', label: 'Predictive Diagnostics', shortLabel: 'Diagnostics', icon: Activity },
  { id: 'dataset', label: 'Fleet Analytics', shortLabel: 'Analytics', icon: Database },
];

interface AppTopNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onOpenSettings: () => void;
  settingsOpen: boolean;
  mlBackendReady: boolean | null;
  visible: boolean;
  onToggleVisible: () => void;
}

export default function AppTopNav({
  activeTab,
  onTabChange,
  onOpenSettings,
  settingsOpen,
  mlBackendReady,
  visible,
  onToggleVisible,
}: AppTopNavProps) {
  const statusColor =
    mlBackendReady === true
      ? 'bg-cyber-green shadow-[0_0_8px_rgba(57,255,140,0.55)]'
      : mlBackendReady === false
        ? 'bg-cyber-red shadow-[0_0_8px_rgba(255,59,92,0.55)]'
        : 'bg-white/35';

  if (!visible) {
    return (
      <div className="top-nav-restore-wrap">
        <button
          type="button"
          onClick={onToggleVisible}
          className="top-nav-restore-btn"
          title="Show navigation"
          aria-label="Show navigation"
        >
          <Menu className="w-4 h-4" strokeWidth={1.5} />
          <span className="hidden sm:inline">Menu</span>
        </button>
      </div>
    );
  }

  return (
    <div className="top-nav-wrap">
      <nav className="top-nav-dock" aria-label="Main navigation">
        <div className="top-nav-brand">
          <img
            src="/automech-logo.png"
            alt="AutoMech"
            className="h-5 w-5 object-contain mix-blend-lighten opacity-90"
          />
          <span className={`top-nav-status ${statusColor}`} title="ML backend status" />
        </div>

        <div className="top-nav-divider" aria-hidden="true" />

        <div className="top-nav-tabs">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`top-nav-tab ${isActive ? 'top-nav-tab-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                <span className="hidden sm:inline truncate">{item.label}</span>
                <span className="sm:hidden">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>

        <div className="top-nav-divider" aria-hidden="true" />

        <div className="top-nav-actions">
          <button
            type="button"
            onClick={onOpenSettings}
            className={`top-nav-icon-btn ${settingsOpen ? 'top-nav-icon-btn-active' : ''}`}
            title="Controls"
            aria-label="Controls"
            aria-expanded={settingsOpen}
          >
            <Settings className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={onToggleVisible}
            className="top-nav-icon-btn"
            title="Hide navigation"
            aria-label="Hide navigation"
          >
            <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </nav>
    </div>
  );
}

export { NAV_ITEMS };
