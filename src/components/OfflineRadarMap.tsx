import React, { useMemo, useState } from 'react';
import { AppTheme, GeoCoordinate, TrackPoint, Waypoint } from '../types/compass';
import { calculateBearing, calculateDistance, toRad } from '../utils/geo';

interface OfflineRadarMapProps {
  currentPosition: GeoCoordinate | null;
  heading: number;
  trackPoints: TrackPoint[];
  waypoints: Waypoint[];
  targetWaypoint: Waypoint | null;
  onSelectWaypoint: (wp: Waypoint | null) => void;
  onSimulateStep?: (deltaLat: number, deltaLng: number) => void;
  theme: AppTheme;
}

export const OfflineRadarMap: React.FC<OfflineRadarMapProps> = ({
  currentPosition,
  heading,
  trackPoints,
  waypoints,
  targetWaypoint,
  onSelectWaypoint,
  onSimulateStep,
  theme,
}) => {
  // Range scale in meters (distance from center to outer ring)
  const [rangeMeters, setRangeMeters] = useState<number>(500);
  const [headingUp, setHeadingUp] = useState<boolean>(true);

  const isNightRed = theme === 'night_red';
  const isLight = theme === 'high_contrast_light';

  const centerLat = currentPosition?.latitude ?? 37.7749;
  const centerLng = currentPosition?.longitude ?? -122.4194;

  // Viewbox coordinates: center is (250, 250), radius 220
  const CX = 250;
  const CY = 250;
  const RADIUS = 210;

  // Converts a (lat, lng) to (x, y) relative to current position and range scale
  const project = (lat: number, lng: number): { x: number; y: number; inBounds: boolean; dist: number } => {
    const dist = calculateDistance(centerLat, centerLng, lat, lng);
    const bearing = calculateBearing(centerLat, centerLng, lat, lng);

    // Apply rotation if Heading Up mode
    const effectiveAngle = headingUp ? (bearing - heading + 360) % 360 : bearing;
    const angleRad = toRad(effectiveAngle - 90);

    const pxDist = (dist / rangeMeters) * RADIUS;
    const x = CX + pxDist * Math.cos(angleRad);
    const y = CY + pxDist * Math.sin(angleRad);

    const inBounds = pxDist <= RADIUS + 15;
    return { x, y, inBounds, dist };
  };

  // Projected breadcrumb track points
  const trackPathString = useMemo(() => {
    if (!trackPoints || trackPoints.length < 2) return '';
    return trackPoints
      .map((pt, index) => {
        const { x, y } = project(pt.latitude, pt.longitude);
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [trackPoints, centerLat, centerLng, rangeMeters, headingUp, heading]);

  // Projected waypoints
  const projectedWaypoints = useMemo(() => {
    return waypoints.map((wp) => {
      const { x, y, inBounds, dist } = project(wp.latitude, wp.longitude);
      return {
        wp,
        x,
        y,
        inBounds,
        dist,
        isTarget: targetWaypoint?.id === wp.id,
      };
    });
  }, [waypoints, centerLat, centerLng, rangeMeters, headingUp, heading, targetWaypoint]);

  const ringStroke = isNightRed ? '#380a0a' : isLight ? '#e2e8f0' : '#1e293b';
  const textMuted = isNightRed ? '#991b1b' : isLight ? '#64748b' : '#64748b';
  const pathStroke = isNightRed ? '#ef4444' : '#06b6d4';

  const rangeOptions = [100, 250, 500, 1000, 2500, 5000];

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* Top Map Toolbar */}
      <div className="w-full flex items-center justify-between px-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-slate-400">Scale:</span>
          <select
            value={rangeMeters}
            onChange={(e) => setRangeMeters(Number(e.target.value))}
            className="text-xs font-mono px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none"
          >
            {rangeOptions.map((r) => (
              <option key={r} value={r}>
                {r >= 1000 ? `${r / 1000} km` : `${r} m`}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Orientation Mode Toggle */}
          <button
            type="button"
            onClick={() => setHeadingUp(!headingUp)}
            className={`text-xs font-mono px-2.5 py-1 rounded border transition-colors ${
              headingUp
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            {headingUp ? 'Heading-Up' : 'North-Up'}
          </button>
        </div>
      </div>

      {/* Vector Radar Screen */}
      <div className="relative w-full aspect-square max-w-[420px] rounded-2xl border border-slate-800/80 bg-[#07090f] overflow-hidden p-2">
        <svg viewBox="0 0 500 500" className="w-full h-full">
          <defs>
            {/* Radar Sweep Effect / Vision Cone */}
            <linearGradient id="coneGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isNightRed ? '#ef4444' : '#06b6d4'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={isNightRed ? '#ef4444' : '#06b6d4'} stopOpacity="0.0" />
            </linearGradient>
            <clipPath id="radarClip">
              <circle cx={CX} cy={CY} r={RADIUS} />
            </clipPath>
          </defs>

          {/* Background Grid & Concentric Rings */}
          <g>
            {/* Outer Boundary */}
            <circle cx={CX} cy={CY} r={RADIUS} fill="#06080e" stroke={ringStroke} strokeWidth="1.5" />
            {/* Inner Range Rings (25%, 50%, 75%) */}
            <circle cx={CX} cy={CY} r={RADIUS * 0.75} fill="none" stroke={ringStroke} strokeWidth="1" strokeDasharray="3,3" />
            <circle cx={CX} cy={CY} r={RADIUS * 0.5} fill="none" stroke={ringStroke} strokeWidth="1" strokeDasharray="2,3" />
            <circle cx={CX} cy={CY} r={RADIUS * 0.25} fill="none" stroke={ringStroke} strokeWidth="0.75" />

            {/* Crosshair Axes */}
            <line x1={CX - RADIUS} y1={CY} x2={CX + RADIUS} y2={CY} stroke={ringStroke} strokeWidth="0.8" />
            <line x1={CX} y1={CY - RADIUS} x2={CX} y2={CY + RADIUS} stroke={ringStroke} strokeWidth="0.8" />

            {/* Range Annotations */}
            <text x={CX + 4} y={CY - RADIUS * 0.5 + 11} fill={textMuted} fontSize="9" fontFamily="var(--font-mono)">
              {rangeMeters >= 1000 ? `${(rangeMeters * 0.5) / 1000}km` : `${rangeMeters * 0.5}m`}
            </text>
            <text x={CX + 4} y={CY - RADIUS + 13} fill={textMuted} fontSize="9" fontFamily="var(--font-mono)">
              {rangeMeters >= 1000 ? `${rangeMeters / 1000}km` : `${rangeMeters}m`}
            </text>

            {/* Cardinal orientation labels on radar perimeter */}
            {headingUp ? (
              <g>
                <text x={CX} y={CY - RADIUS + 20} textAnchor="middle" fill="#f97316" fontSize="12" fontWeight="bold">
                  ▲ AHEAD
                </text>
              </g>
            ) : (
              <g>
                <text x={CX} y={CY - RADIUS + 20} textAnchor="middle" fill="#f97316" fontSize="12" fontWeight="bold">
                  N
                </text>
                <text x={CX + RADIUS - 18} y={CY + 4} textAnchor="middle" fill={textMuted} fontSize="11" fontWeight="bold">
                  E
                </text>
                <text x={CX} y={CY + RADIUS - 10} textAnchor="middle" fill={textMuted} fontSize="11" fontWeight="bold">
                  S
                </text>
                <text x={CX - RADIUS + 18} y={CY + 4} textAnchor="middle" fill={textMuted} fontSize="11" fontWeight="bold">
                  W
                </text>
              </g>
            )}
          </g>

          {/* CLIPPED CONTENT (Breadcrumbs & Waypoints) */}
          <g clipPath="url(#radarClip)">
            {/* Heading Vision Cone (Shows direction of movement/device facing) */}
            <g transform={headingUp ? undefined : `rotate(${heading} ${CX} ${CY})`}>
              <polygon
                points={`${CX},${CY} ${CX - 75},${CY - 190} ${CX + 75},${CY - 190}`}
                fill="url(#coneGradient)"
              />
            </g>

            {/* Recorded Trail Polyline */}
            {trackPathString && (
              <path
                d={trackPathString}
                fill="none"
                stroke={pathStroke}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.85"
              />
            )}

            {/* Trail Breadcrumb Dots */}
            {trackPoints.map((pt, idx) => {
              if (idx % 2 !== 0 && idx !== trackPoints.length - 1) return null; // optimize render
              const { x, y, inBounds } = project(pt.latitude, pt.longitude);
              if (!inBounds) return null;
              return (
                <circle
                  key={`tp-${idx}`}
                  cx={x}
                  cy={y}
                  r="2"
                  fill={isNightRed ? '#ef4444' : '#38bdf8'}
                  opacity="0.6"
                />
              );
            })}

            {/* Waypoints plotted on radar */}
            {projectedWaypoints.map(({ wp, x, y, inBounds, dist, isTarget }) => {
              if (!inBounds) return null;
              const wpColor = isTarget ? '#f59e0b' : wp.color || '#10b981';

              return (
                <g
                  key={wp.id}
                  className="cursor-pointer transition-transform hover:scale-110"
                  onClick={() => onSelectWaypoint(wp)}
                >
                  {/* Waypoint halo if target */}
                  {isTarget && (
                    <circle
                      cx={x}
                      cy={y}
                      r="12"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      strokeDasharray="2,2"
                      className="animate-spin origin-center"
                      style={{ transformOrigin: `${x}px ${y}px` }}
                    />
                  )}
                  {/* Waypoint Marker Icon Pin */}
                  <circle cx={x} cy={y} r="5" fill={wpColor} stroke="#07090f" strokeWidth="1.5" />
                  {/* Name & distance tag */}
                  <text
                    x={x + 8}
                    y={y + 3}
                    fill={isTarget ? '#f59e0b' : '#f1f5f9'}
                    fontSize="10"
                    fontFamily="var(--font-mono)"
                    fontWeight={isTarget ? 'bold' : 'normal'}
                  >
                    {wp.name} ({Math.round(dist)}m)
                  </text>
                </g>
              );
            })}

            {/* Center Current Position Indicator */}
            <circle cx={CX} cy={CY} r="6" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
            <circle cx={CX} cy={CY} r="14" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.4" />
          </g>
        </svg>

        {/* Selected Waypoint Mini Bar */}
        {targetWaypoint && (
          <div className="absolute bottom-3 left-3 right-3 bg-slate-900/95 border border-amber-500/40 rounded-lg p-2.5 flex items-center justify-between text-xs font-mono backdrop-blur-md">
            <div>
              <div className="text-amber-400 font-bold truncate max-w-[190px]">
                {targetWaypoint.name}
              </div>
              <div className="text-slate-400 text-[10px]">
                {targetWaypoint.category} · {targetWaypoint.altitude ? `${targetWaypoint.altitude}m` : 'No alt'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectWaypoint(null)}
              className="text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-800 text-[11px]"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Step Simulation Toolbar for Testing Offline Movement on Desktop */}
      {onSimulateStep && (
        <div className="w-full mt-3 p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 flex flex-col items-center">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
            Offline Trail Simulator (Walk Step)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSimulateStep(0.00018, 0)}
              className="min-h-[40px] px-3 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 border border-slate-700"
            >
              ▲ North (+20m)
            </button>
            <button
              type="button"
              onClick={() => onSimulateStep(-0.00018, 0)}
              className="min-h-[40px] px-3 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 border border-slate-700"
            >
              ▼ South (-20m)
            </button>
            <button
              type="button"
              onClick={() => onSimulateStep(0, 0.00022)}
              className="min-h-[40px] px-3 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 border border-slate-700"
            >
              ► East (+20m)
            </button>
            <button
              type="button"
              onClick={() => onSimulateStep(0, -0.00022)}
              className="min-h-[40px] px-3 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 border border-slate-700"
            >
              ◄ West (-20m)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
