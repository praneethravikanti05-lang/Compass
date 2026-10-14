import React, { useRef, useState } from 'react';
import { AppTheme, GeoCoordinate, UnitSystem, Waypoint, WaypointCategory } from '../types/compass';
import {
  calculateBearing,
  calculateDistance,
  downloadFile,
  exportToCSV,
  exportToGeoJSON,
  exportToGPX,
  formatAltitude,
  formatCoordinates,
  formatDistance,
  getCardinalDirection,
} from '../utils/geo';
import { parseImportedData } from '../utils/storage';

interface WaypointListProps {
  waypoints: Waypoint[];
  currentPosition: GeoCoordinate | null;
  targetWaypoint: Waypoint | null;
  onSelectTarget: (wp: Waypoint | null) => void;
  onRemoveWaypoint: (id: string) => void;
  onAddManualWaypoint: () => void;
  onImportWaypoints: (wps: Waypoint[]) => void;
  unit: UnitSystem;
  theme: AppTheme;
}

export const WaypointList: React.FC<WaypointListProps> = ({
  waypoints,
  currentPosition,
  targetWaypoint,
  onSelectTarget,
  onRemoveWaypoint,
  onAddManualWaypoint,
  onImportWaypoints,
  unit,
  theme,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories: (WaypointCategory | 'All')[] = [
    'All',
    'Camp',
    'Summit',
    'Water',
    'Trailhead',
    'Viewpoint',
    'Danger',
    'Custom',
  ];

  // Filter waypoints
  const filteredWaypoints = waypoints.filter((wp) => {
    const matchesCategory = selectedCategory === 'All' || wp.category === selectedCategory;
    const matchesSearch =
      wp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wp.notes && wp.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Calculate distance & bearing for each waypoint
  const waypointsWithBearing = filteredWaypoints.map((wp) => {
    let distanceMeters: number | null = null;
    let bearing: number | null = null;
    if (currentPosition) {
      distanceMeters = calculateDistance(
        currentPosition.latitude,
        currentPosition.longitude,
        wp.latitude,
        wp.longitude
      );
      bearing = calculateBearing(
        currentPosition.latitude,
        currentPosition.longitude,
        wp.latitude,
        wp.longitude
      );
    }
    return { ...wp, distanceMeters, bearing };
  });

  // Sort by nearest if current position is available
  waypointsWithBearing.sort((a, b) => {
    if (a.distanceMeters === null) return 0;
    if (b.distanceMeters === null) return 0;
    return a.distanceMeters - b.distanceMeters;
  });

  const handleExportGPX = () => {
    const xml = exportToGPX(null, waypoints);
    downloadFile(xml, `zenith_waypoints_${Date.now()}.gpx`, 'application/gpx+xml');
  };

  const handleExportGeoJSON = () => {
    const json = exportToGeoJSON(null, waypoints);
    downloadFile(json, `zenith_waypoints_${Date.now()}.geojson`, 'application/geo+json');
  };

  const handleExportCSV = () => {
    const csv = exportToCSV(waypoints);
    downloadFile(csv, `zenith_waypoints_${Date.now()}.csv`, 'text/csv');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = parseImportedData(content);
        if (result.waypoints.length > 0) {
          onImportWaypoints(result.waypoints);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Top Header & Export/Import Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-sm font-mono font-bold tracking-wider uppercase text-slate-200">
            Offline Waypoints ({waypoints.length})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Geographic pins saved locally for off-grid navigation
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onAddManualWaypoint}
            className="min-h-[40px] px-3 text-xs font-mono font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Add Coords</span>
          </button>

          {/* Export Dropdown or Actions */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleExportGPX}
              className="min-h-[40px] px-2.5 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Download GPX file for GPS handhelds"
            >
              GPX
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="min-h-[40px] px-2.5 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Download CSV spreadsheet"
            >
              CSV
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[40px] px-2.5 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Import GPX, GeoJSON or CSV"
            >
              Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".gpx,.geojson,.json,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Search saved points..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
        />

        {/* Category Tabs (Segmented control) */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs font-mono">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-700 text-slate-100 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Waypoint Rows */}
      {waypointsWithBearing.length === 0 ? (
        <div className="py-12 text-center rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs font-mono">
          No waypoints matching criteria. Drop a pin on the compass or click "Add Coords".
        </div>
      ) : (
        <div className="space-y-2">
          {waypointsWithBearing.map((wp) => {
            const isTarget = targetWaypoint?.id === wp.id;
            const { fullStr } = formatCoordinates(wp.latitude, wp.longitude, 'DD');

            return (
              <div
                key={wp.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isTarget
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                    : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700/80'
                }`}
              >
                {/* Left Waypoint Info */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: wp.color || '#06b6d4' }}
                    />
                    <span className="font-mono text-sm font-bold text-slate-100 truncate">
                      {wp.name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      · {wp.category}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 flex-wrap">
                    <span>{fullStr}</span>
                    {wp.altitude !== null && (
                      <>
                        <span>·</span>
                        <span>{formatAltitude(wp.altitude, unit)}</span>
                      </>
                    )}
                  </div>

                  {wp.notes && (
                    <div className="text-xs text-slate-300 italic pt-0.5">
                      "{wp.notes}"
                    </div>
                  )}
                </div>

                {/* Right Telemetry & Action Buttons */}
                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  {/* Distance & Bearing if available */}
                  {wp.distanceMeters !== null && wp.bearing !== null && (
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-slate-200">
                        {formatDistance(wp.distanceMeters, unit)}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {Math.round(wp.bearing)}° {getCardinalDirection(wp.bearing)}
                      </div>
                    </div>
                  )}

                  {/* Navigation Target Lock CTA */}
                  <button
                    type="button"
                    onClick={() => onSelectTarget(isTarget ? null : wp)}
                    className={`min-h-[40px] px-3 rounded-lg text-xs font-mono font-medium transition-colors flex items-center gap-1.5 ${
                      isTarget
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="22" y1="12" x2="18" y2="12" />
                      <line x1="6" y1="12" x2="2" y2="12" />
                      <line x1="12" y1="6" x2="12" y2="2" />
                      <line x1="12" y1="22" x2="12" y2="18" />
                    </svg>
                    <span>{isTarget ? 'Navigating' : 'Navigate'}</span>
                  </button>

                  {/* Delete Waypoint Button */}
                  <button
                    type="button"
                    onClick={() => onRemoveWaypoint(wp.id)}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors"
                    title="Delete waypoint"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
