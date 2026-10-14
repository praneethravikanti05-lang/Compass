import React from 'react';
import { AppTheme } from '../types/compass';

export type ActiveTab = 'compass' | 'radar' | 'waypoints' | 'track' | 'level';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenSettings: () => void;
  theme: AppTheme;
  isRecordingTrack: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenSettings,
  theme,
  isRecordingTrack,
}) => {
  const isNightRed = theme === 'night_red';
  const isLight = theme === 'high_contrast_light';

  const headerBg = isNightRed
    ? 'bg-[#0a0202] border-[#250808]'
    : isLight
    ? 'bg-white border-slate-200'
    : 'bg-[#080a0f] border-slate-800/80';

  const brandColor = isNightRed ? 'text-red-500' : 'text-slate-100';

  return (
    <header className={`sticky top-0 z-40 border-b ${headerBg} transition-colors px-4 py-3`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-sm md:text-base font-extrabold font-mono tracking-widest ${brandColor} whitespace-nowrap shrink-0`}>
            ZENITH
          </span>
          <span className="hidden sm:inline-block text-[10px] font-mono tracking-wider uppercase text-slate-500">
            PRECISION COMPASS
          </span>
        </div>

        {/* Zone 2: Navigation Links / Workspace Tabs (Single-line controls) */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-0.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => onSelectTab('compass')}
            className={`min-h-[38px] px-2.5 sm:px-3 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'compass'
                ? 'bg-slate-800 text-slate-100 font-bold border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Compass
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('radar')}
            className={`min-h-[38px] px-2.5 sm:px-3 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'radar'
                ? 'bg-slate-800 text-slate-100 font-bold border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Radar Map
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('waypoints')}
            className={`min-h-[38px] px-2.5 sm:px-3 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'waypoints'
                ? 'bg-slate-800 text-slate-100 font-bold border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Waypoints
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('track')}
            className={`min-h-[38px] px-2.5 sm:px-3 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'track'
                ? 'bg-slate-800 text-slate-100 font-bold border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Tracks</span>
            {isRecordingTrack && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('level')}
            className={`min-h-[38px] px-2.5 sm:px-3 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'level'
                ? 'bg-slate-800 text-slate-100 font-bold border border-slate-700/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Level
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action (Configuration / Calibrate trigger) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenSettings}
            className="min-h-[44px] min-w-[44px] px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors flex items-center justify-center gap-1.5 text-xs font-mono font-medium whitespace-nowrap shrink-0"
            title="Configure declination, units & sensors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
