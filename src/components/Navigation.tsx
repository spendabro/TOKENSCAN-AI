import React from 'react';
import {
  Shield,
  LayoutDashboard,
  ScanSearch,
  Compass,
  BarChart3,
  FileWarning,
  BookOpen,
  History,
  Bookmark,
  Settings,
  FileText,
  Info,
  ChevronLeft,
  ChevronRight,
  Search,
  Sun,
  Moon,
  HelpCircle,
  LogOut,
} from 'lucide-react';
import { NetworkId } from '../types/tokenlens.ts';
import type { SessionUser } from '../lib/firebase.ts';

export type NavTab =
  | 'dashboard'
  | 'scanner'
  | 'explore'
  | 'market'
  | 'reports'
  | 'signals'
  | 'history'
  | 'bookmarks'
  | 'settings'
  | 'docs'
  | 'about';

interface NavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  selectedNetwork: NetworkId;
  onSelectNetwork: (net: NetworkId) => void;
  bookmarksCount: number;
  historyCount: number;
  lightMode: boolean;
  onToggleLightMode: () => void;
  globalSearchQuery: string;
  onGlobalSearchChange: (q: string) => void;
  onGlobalSearchSubmit: () => void;
  currentUser: SessionUser;
  onSignOut: () => void;
}

const NAV_GROUPS: {
  label: string;
  items: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeKey?: 'bookmarks' | 'history';
  }[];
}[] = [
  {
    label: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'scanner', label: 'Token Scanner', icon: ScanSearch },
      { id: 'explore', label: 'Explore Tokens', icon: Compass },
      { id: 'market', label: 'Market Overview', icon: BarChart3 },
    ],
  },
  {
    label: 'Security',
    items: [
      { id: 'reports', label: 'Risk Reports', icon: FileWarning },
      { id: 'signals', label: 'Security Signals', icon: BookOpen },
      { id: 'history', label: 'Scan History', icon: History, badgeKey: 'history' },
    ],
  },
  {
    label: 'Personal',
    items: [
      { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark, badgeKey: 'bookmarks' },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
  {
    label: 'Other',
    items: [
      { id: 'docs', label: 'Documentation', icon: FileText },
      { id: 'about', label: 'About TokenLens', icon: Info },
    ],
  },
];

export const Sidebar: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  sidebarCollapsed,
  onToggleSidebar,
  bookmarksCount,
  historyCount,
  lightMode,
  currentUser,
  onSignOut,
}) => {
  const displayName =
    currentUser.displayName || currentUser.email?.split('@')[0] || 'Security Analyst';

  return (
    <aside
      aria-label="Primary Sidebar Navigation"
      className={`hidden lg:flex flex-col shrink-0 transition-all duration-150 border-r ${
        lightMode
          ? 'bg-slate-900 text-slate-100 border-slate-800'
          : 'bg-[#0B0C1E] text-[#F8FAFC] border-[#1E2040]'
      } ${sidebarCollapsed ? 'w-20' : 'w-64'}`}
    >
      {/* Brand Lockup */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#1E2040]">
        <button
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] rounded-lg"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#22D3EE] flex items-center justify-center shadow-lg shadow-[#8B5CF6]/20 shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <span className="text-lg font-bold tracking-tight text-[#F8FAFC] whitespace-nowrap">
              TokenLens AI
            </span>
          )}
        </button>

        <button
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#15162D] transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Read-Only Security Status Button */}
      <div className="px-3 pt-4 pb-2">
        <button
          onClick={() => onSelectTab('scanner')}
          className={`w-full flex items-center ${
            sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3.5'
          } py-2.5 rounded-xl bg-[#15162D] border border-[#25274D] hover:border-[#8B5CF6]/50 text-xs font-medium text-[#F8FAFC] transition-colors`}
          title="Walletless Read-Only Security Scanner"
        >
          <span className="flex items-center gap-2.5 truncate">
            <ScanSearch className="w-4 h-4 text-[#A78BFA] shrink-0" />
            {!sidebarCollapsed && <span className="truncate">Read-Only Scanner</span>}
          </span>
          {!sidebarCollapsed && (
            <span className="text-[11px] text-[#94A3B8] font-mono">No Wallet</span>
          )}
        </button>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!sidebarCollapsed && (
              <div className="px-3 mb-1.5 text-[11px] font-semibold tracking-wider text-[#94A3B8]/70">
                {group.label}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const count =
                  item.badgeKey === 'bookmarks'
                    ? bookmarksCount
                    : item.badgeKey === 'history'
                      ? historyCount
                      : 0;

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`w-full flex items-center ${
                      sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'
                    } py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-gradient-to-r from-[#8B5CF6]/25 to-[#8B5CF6]/5 text-[#F8FAFC] border border-[#8B5CF6]/40 shadow-sm'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#15162D]/70 border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#A78BFA]' : 'text-[#94A3B8]'
                        }`}
                      />
                      {!sidebarCollapsed && (
                        <span className="truncate whitespace-nowrap">{item.label}</span>
                      )}
                    </span>
                    {!sidebarCollapsed && count > 0 && (
                      <span className="text-xs font-mono tabular-nums text-[#A78BFA]">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sidebar Footer: Authenticated User Profile */}
      <div className="p-3 border-t border-[#1E2040]">
        {/* User Account & Sign Out */}
        <div
          className={`flex items-center ${
            sidebarCollapsed ? 'justify-center' : 'justify-between'
          } px-3 py-2.5 rounded-xl bg-[#101126] border border-[#1E2040] gap-2`}
        >
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-[#8B5CF6]/30 border border-[#8B5CF6]/50 flex items-center justify-center text-xs font-bold text-[#F8FAFC] shrink-0 overflow-hidden">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  displayName.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#F8FAFC] truncate">{displayName}</div>
                <div className="text-[10px] text-[#94A3B8] truncate">
                  {currentUser.email || 'Authenticated Analyst'}
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onSignOut}
            aria-label="Sign out of TokenLens AI"
            title="Sign Out"
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#15162D] transition-colors shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export const TopBar: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  selectedNetwork,
  onSelectNetwork,
  lightMode,
  onToggleLightMode,
  globalSearchQuery,
  onGlobalSearchChange,
  onGlobalSearchSubmit,
  currentUser,
  onSignOut,
}) => {
  const tabTitleMap: Record<NavTab, string> = {
    dashboard: 'Security Intelligence Dashboard',
    scanner: 'Token Contract Scanner',
    explore: 'Explore Scanned Tokens',
    market: 'DEX Market & Liquidity Overview',
    reports: 'Detailed Risk Report',
    signals: 'Security Signals & Educational Glossary',
    history: 'Scan History',
    bookmarks: 'Saved Bookmarks',
    settings: 'Platform Settings & Providers',
    docs: 'Methodology & API Documentation',
    about: 'About TokenLens AI',
  };

  const displayName =
    currentUser.displayName || currentUser.email?.split('@')[0] || 'Analyst';

  return (
    <header className="sticky top-0 z-30 min-h-14 sm:h-16 px-3 sm:px-6 lg:px-8 py-2 sm:py-0 border-b border-[#1E2040] bg-[#080817]/95 backdrop-blur-md flex items-center justify-between gap-2 sm:gap-4">
      {/* Left: Mobile Brand + Context Title */}
      <div className="flex items-center gap-2.5 min-w-0 shrink-0">
        <button
          onClick={() => onSelectTab('dashboard')}
          className="lg:hidden flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#22D3EE] flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-[#F8FAFC] whitespace-nowrap">
            TokenLens
          </span>
        </button>
        <h1 className="hidden sm:block text-sm lg:text-lg font-semibold text-[#F8FAFC] truncate">
          {tabTitleMap[activeTab]}
        </h1>
      </div>

      {/* Center: Quick Global Contract Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onGlobalSearchSubmit();
        }}
        className="hidden md:flex items-center flex-1 max-w-md relative"
      >
        <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          value={globalSearchQuery}
          onChange={(e) => onGlobalSearchChange(e.target.value)}
          placeholder="Paste contract address (0x...) or search token..."
          aria-label="Global token search or contract address input"
          className="w-full pl-10 pr-16 py-2 text-xs bg-[#101126] border border-[#1E2040] focus:border-[#8B5CF6] rounded-xl text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none transition-colors font-mono"
        />
        <button
          type="submit"
          className="absolute right-1.5 px-2.5 py-1 text-[11px] font-medium bg-[#15162D] hover:bg-[#8B5CF6] text-[#F8FAFC] rounded-lg transition-colors whitespace-nowrap"
        >
          Inspect
        </button>
      </form>

      {/* Right: Active Network Selector, Demo Mode button, Help, Theme, User Sign Out */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <div className="relative flex items-center min-w-0">
          <label htmlFor="top-network-select" className="sr-only">
            Select Active Blockchain Network
          </label>
          <select
            id="top-network-select"
            value={selectedNetwork}
            onChange={(e) => onSelectNetwork(e.target.value as NetworkId)}
            className="w-[122px] sm:w-auto bg-[#15162D] border border-[#25274D] hover:border-[#8B5CF6]/60 text-[11px] sm:text-xs font-medium text-[#F8FAFC] rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 focus:outline-none focus:border-[#8B5CF6] cursor-pointer truncate"
          >
            <optgroup label="MVP Networks (Full Security Stack)">
              <option value="ethereum">Ethereum (ETH)</option>
              <option value="bsc">BNB Chain (BSC)</option>
              <option value="base">Base (BASE)</option>
            </optgroup>
            <optgroup label="Expansion Networks">
              <option value="hyperliquid">Hyperliquid (HYPE)</option>
              <option value="solana">Solana (SOL)</option>
              <option value="arbitrum">Arbitrum (ARB)</option>
              <option value="polygon">Polygon (POL)</option>
            </optgroup>
          </select>
        </div>

        <button
          onClick={() => onSelectTab('signals')}
          aria-label="Open Security Signals & Glossary Help"
          title="Security Signals & Glossary"
          className="hidden sm:inline-flex p-2 rounded-xl bg-[#15162D] border border-[#25274D] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors shrink-0 cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleLightMode}
          aria-label={lightMode ? 'Switch to Dark Mode' : 'Switch to High-Contrast Slate Mode'}
          title="Toggle surface contrast theme"
          className="p-2 rounded-xl bg-[#15162D] border border-[#25274D] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors shrink-0 cursor-pointer"
        >
          {lightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Mobile / Compact User Sign-Out Button */}
        <button
          type="button"
          onClick={onSignOut}
          title={`Signed in as ${displayName} — Click to Sign Out`}
          className="lg:hidden p-2 rounded-xl bg-[#15162D] border border-[#25274D] text-[#94A3B8] hover:text-[#EF4444] transition-colors shrink-0 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export const MobileBottomNav: React.FC<{
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}> = ({ activeTab, onSelectTab }) => {
  const mobileItems: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'scanner', label: 'Scan', icon: ScanSearch },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'bookmarks', label: 'Saved', icon: Bookmark },
    { id: 'signals', label: 'Signals', icon: BookOpen },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#0B0C1E]/95 backdrop-blur-md border-t border-[#1E2040] grid grid-cols-5 items-center px-1"
    >
      {mobileItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
              isActive ? 'text-[#A78BFA]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Icon className="w-4 h-4 mb-0.5" />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
