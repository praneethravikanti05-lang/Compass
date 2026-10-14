import React, { useState } from 'react';
import { AppTheme, CoordinateFormat, GeoCoordinate, UnitSystem } from '../types/compass';
import { formatAltitude, formatCoordinates, formatSpeed } from '../utils/geo';

interface CoordinateTelemetryProps {
  position: GeoCoordinate | null;
  format: CoordinateFormat;
  unit: UnitSystem;
  onCycleFormat: () => void;
  onDropPin: () => void;
  theme: AppTheme;
  isOffline: boolean;
  gpsStatus: 'acquiring' | 'locked' | 'denied' | 'simulated';
}

export const CoordinateTelemetry: React.FC<CoordinateTelemetryProps> = ({
  position,
  format,
  unit,
  onCycleFormat,
  onDropPin,
  theme,
  isOffline,
  gpsStatus,
}) => {
  const [copied, setCopied] = useState(false);

  const isNightRed = theme === 'night_red';
  const isLight = theme === 'high_contrast_light';

  const cardBg = isNightRed
    ? 'bg-[#120404] border-[#2f0c0c]'
    : isLight
    ? 'bg-white border-slate-200 shadow-sm'
    : 'bg-[#0e131f]/90 border-slate-800/90';

  const textPrimary = isNightRed ? 'text-red-100' : isLight ? 'text-slate-900' : 'text-slate-100';
  const textMuted = isNightRed ? 'text-red-400/80' : isLight ? 'text-slate-500' : 'text-slate-400';
  const accentBorder = isNightRed ? 'border-red-900/50' : isLight ? 'border-slate-200' : 'border-slate-800';

  if (!position) {
    return (
      <div className={`p-4 rounded-xl border ${cardBg} text-center space-y-2`}>
        <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
          GPS Telemetry
        </div>
        <div className="text-sm font-mono text-slate-400 animate-pulse">
          Acquiring satellite constellation lock...
        </div>
      </div>
    );
  }

  const { latStr, lngStr, fullStr } = formatCoordinates(position.latitude, position.longitude, format);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={`rounded-xl border ${cardBg} p-4 w-full transition-all`}>
      {/* Top Telemetry Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono tracking-wider uppercase text-slate-400">
            Coordinates ({format})
          </span>
          <button
            type="button"
            onClick={onCycleFormat}
            className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700/80 text-cyan-400 border border-slate-700/50 transition-colors"
            title="Cycle coordinate format (DD, DMS, DDM, UTM)"
          >
            Format
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Offline local storage marker */}
          <span className="text-[10px] font-mono px-2 py-0.5 rounded text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
            {isOffline ? 'Offline Active' : 'Offline Ready'}
          </span>

          {/* Copy Coordinates Button */}
          <button
            type="button"
            onClick={copyToClipboard}
            className="text-[11px] font-mono text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
            title="Copy coordinates"
          >
            {copied ? (
              <span className="text-emerald-400">Copied</span>
            ) : (
              <span>Copy</span>
            )}
          </button>
        </div>
      </div>

      {/* Main Coordinate Readouts */}
      <div className="py-3.5 grid grid-cols-2 gap-3">
        <div className="space-y-0.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Latitude
          </div>
          <div className={`text-sm md:text-base font-mono font-bold tracking-tight ${textPrimary}`}>
            {latStr}
          </div>
        </div>

        <div className="space-y-0.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Longitude
          </div>
          <div className={`text-sm md:text-base font-mono font-bold tracking-tight ${textPrimary}`}>
            {lngStr}
          </div>
        </div>
      </div>

      {/* Secondary Telemetry Strip: Altitude, Accuracy, Speed, Quick Drop Pin */}
      <div className={`pt-3 border-t ${accentBorder} grid grid-cols-4 gap-2 items-center`}>
        {/* Elevation */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Elevation
          </div>
          <div className={`text-sm font-mono font-bold ${textPrimary}`}>
            {formatAltitude(position.altitude, unit)}
          </div>
        </div>

        {/* Speed */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Speed
          </div>
          <div className={`text-sm font-mono font-bold ${textPrimary}`}>
            {formatSpeed(position.speed, unit)}
          </div>
        </div>

        {/* GPS Accuracy */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Accuracy
          </div>
          <div className="text-xs font-mono font-medium text-slate-300">
            {position.accuracy ? `±${Math.round(position.accuracy)}m` : '—'}
          </div>
        </div>

        {/* Tactile Drop Waypoint Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onDropPin}
            className={`min-h-[44px] px-3 text-xs font-mono font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-transform active:scale-95 ${
              isNightRed
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm'
            }`}
            title="Drop offline coordinate pin at current location"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" />
            </svg>
            <span>Mark</span>
          </button>
        </div>
      </div>
    </div>
  );
};
