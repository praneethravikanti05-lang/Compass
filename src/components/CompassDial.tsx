import React, { useMemo, useState } from 'react';
import { AppTheme, GeoCoordinate, OrientationData, Waypoint } from '../types/compass';
import { calculateBearing, calculateDistance, calculateHeadingDelta, getCardinalDirection } from '../utils/geo';

interface CompassDialProps {
  orientation: OrientationData;
  currentPosition: GeoCoordinate | null;
  targetWaypoint: Waypoint | null;
  lockedBearing: number | null;
  onSetLockedBearing: (bearing: number | null) => void;
  onSimulateHeading?: (heading: number) => void;
  theme: AppTheme;
}

export const CompassDial: React.FC<CompassDialProps> = ({
  orientation,
  currentPosition,
  targetWaypoint,
  lockedBearing,
  onSetLockedBearing,
  onSimulateHeading,
  theme,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartAngle, setDragStartAngle] = useState(0);

  const heading = orientation.heading;
  const pitch = Math.min(Math.max(orientation.pitch, -45), 45);
  const roll = Math.min(Math.max(orientation.roll, -45), 45);

  // Compute bearing to target waypoint if selected
  const targetInfo = useMemo(() => {
    if (!targetWaypoint || !currentPosition) return null;
    const bearing = calculateBearing(
      currentPosition.latitude,
      currentPosition.longitude,
      targetWaypoint.latitude,
      targetWaypoint.longitude
    );
    const dist = calculateDistance(
      currentPosition.latitude,
      currentPosition.longitude,
      targetWaypoint.latitude,
      targetWaypoint.longitude
    );
    const delta = calculateHeadingDelta(heading, bearing);
    return { bearing, dist, delta };
  }, [targetWaypoint, currentPosition, heading]);

  // Locked bearing deviation
  const lockedDelta = useMemo(() => {
    if (lockedBearing === null) return null;
    return calculateHeadingDelta(heading, lockedBearing);
  }, [lockedBearing, heading]);

  // Theme color variables
  const isNightRed = theme === 'night_red';
  const isLight = theme === 'high_contrast_light';

  const strokeRing = isNightRed ? '#3f1111' : isLight ? '#cbd5e1' : '#1e293b';
  const strokeMajor = isNightRed ? '#7f1d1d' : isLight ? '#64748b' : '#475569';
  const strokeMinor = isNightRed ? '#450a0a' : isLight ? '#94a3b8' : '#334155';
  const textPrimary = isNightRed ? '#fca5a5' : isLight ? '#0f172a' : '#f8fafc';
  const textMuted = isNightRed ? '#991b1b' : isLight ? '#64748b' : '#94a3b8';
  const northColor = isNightRed ? '#ef4444' : '#f97316'; // Safety orange or red
  const accentColor = isNightRed ? '#dc2626' : '#06b6d4'; // Cyan or Crimson

  // Generate degree tick marks (0 to 359)
  const ticks = useMemo(() => {
    const list = [];
    for (let deg = 0; deg < 360; deg += 2) {
      const isMajor = deg % 30 === 0;
      const isMedium = deg % 10 === 0 && !isMajor;
      const length = isMajor ? 14 : isMedium ? 9 : 5;
      const width = isMajor ? 2 : isMedium ? 1.5 : 1;
      const stroke = isMajor ? (deg === 0 ? northColor : strokeMajor) : strokeMinor;

      list.push(
        <line
          key={`tick-${deg}`}
          x1={200}
          y1={24}
          x2={200}
          y2={24 + length}
          stroke={stroke}
          strokeWidth={width}
          transform={`rotate(${deg} 200 200)`}
        />
      );

      // Degree labels every 30 degrees (skip 0/90/180/270 where letters go)
      if (isMajor && deg % 90 !== 0) {
        const rad = ((deg - 90) * Math.PI) / 180;
        const textRadius = 158;
        const x = 200 + textRadius * Math.cos(rad);
        const y = 200 + textRadius * Math.sin(rad);

        list.push(
          <text
            key={`deg-${deg}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={textMuted}
            fontSize="9"
            fontFamily="var(--font-mono)"
            transform={`rotate(${deg} ${x} ${y})`}
          >
            {deg.toString().padStart(3, '0')}
          </text>
        );
      }
    }
    return list;
  }, [northColor, strokeMajor, strokeMinor, textMuted]);

  // Drag interaction to simulate heading
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!onSimulateHeading) return;
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    setDragStartAngle((angle - heading + 360) % 360);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging || !onSimulateHeading) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    const newHeading = (currentAngle - dragStartAngle + 360) % 360;
    onSimulateHeading(Math.round(newHeading));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Level status (bubble within 1 degree)
  const isLevel = Math.abs(pitch) < 1.0 && Math.abs(roll) < 1.0;
  const bubbleX = 200 + (roll / 30) * 45;
  const bubbleY = 200 + (pitch / 30) * 45;

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[420px] mx-auto px-2">
      {/* Target bearing & navigation banner if active */}
      <div className="w-full h-8 mb-2 flex items-center justify-between text-xs font-mono">
        {targetInfo && (
          <div className="w-full flex items-center justify-between px-3 py-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <span className="truncate font-semibold tracking-wide">
              TARGET: {targetWaypoint?.name.toUpperCase()}
            </span>
            <span className="shrink-0 font-bold ml-2">
              {Math.abs(Math.round(targetInfo.delta))}°{' '}
              {targetInfo.delta > 2 ? 'RIGHT →' : targetInfo.delta < -2 ? '← LEFT' : 'ON COURSE'}
            </span>
          </div>
        )}
        {!targetInfo && lockedBearing !== null && lockedDelta !== null && (
          <div className="w-full flex items-center justify-between px-3 py-1.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <span className="tracking-wide">LOCKED HEADING: {lockedBearing}°</span>
            <span className="font-bold">
              {Math.abs(Math.round(lockedDelta))}°{' '}
              {lockedDelta > 2 ? 'DRIFT R' : lockedDelta < -2 ? 'DRIFT L' : 'ON TRACK'}
            </span>
          </div>
        )}
      </div>

      {/* Main Dial Viewport */}
      <div className="relative w-full aspect-square max-w-[380px] flex items-center justify-center">
        {/* Fixed Top Lubber Line Indicator (0° Heading Reference Mark) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none">
          <div
            className={`w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[10px] ${
              isNightRed ? 'border-t-red-500' : 'border-t-orange-500'
            }`}
          />
          <div className={`w-0.5 h-3 ${isNightRed ? 'bg-red-500' : 'bg-orange-500'}`} />
        </div>

        {/* SVG Compass Instrument */}
        <svg
          viewBox="0 0 400 400"
          className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <defs>
            {/* Center crosshair gradient */}
            <radialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={isNightRed ? '#200505' : isLight ? '#f1f5f9' : '#0c101c'} stopOpacity="0.8" />
              <stop offset="100%" stopColor={isNightRed ? '#0d0202' : isLight ? '#e2e8f0' : '#080a0f'} stopOpacity="0.4" />
            </radialGradient>
          </defs>

          {/* Outer Housing Rim */}
          <circle cx="200" cy="200" r="192" fill="none" stroke={strokeRing} strokeWidth="1.5" />
          <circle cx="200" cy="200" r="176" fill="none" stroke={strokeRing} strokeWidth="0.75" strokeDasharray="2,3" />

          {/* ROTATING COMPASS ROSE (Dial rotates opposite to heading) */}
          <g transform={`rotate(${-heading} 200 200)`} className="transition-transform duration-75 ease-out">
            {/* Outer track boundary */}
            <circle cx="200" cy="200" r="174" fill="none" stroke={strokeRing} strokeWidth="1" />
            <circle cx="200" cy="200" r="130" fill="none" stroke={strokeRing} strokeWidth="1" />

            {/* Render Ticks */}
            {ticks}

            {/* Primary Cardinal Markers */}
            {/* NORTH */}
            <text
              x="200"
              y="56"
              textAnchor="middle"
              dominantBaseline="central"
              fill={northColor}
              fontSize="20"
              fontWeight="800"
              fontFamily="var(--font-sans)"
            >
              N
            </text>
            {/* EAST */}
            <text
              x="344"
              y="200"
              textAnchor="middle"
              dominantBaseline="central"
              fill={textPrimary}
              fontSize="18"
              fontWeight="700"
              fontFamily="var(--font-sans)"
              transform="rotate(90 344 200)"
            >
              E
            </text>
            {/* SOUTH */}
            <text
              x="200"
              y="344"
              textAnchor="middle"
              dominantBaseline="central"
              fill={textPrimary}
              fontSize="18"
              fontWeight="700"
              fontFamily="var(--font-sans)"
              transform="rotate(180 200 344)"
            >
              S
            </text>
            {/* WEST */}
            <text
              x="56"
              y="200"
              textAnchor="middle"
              dominantBaseline="central"
              fill={textPrimary}
              fontSize="18"
              fontWeight="700"
              fontFamily="var(--font-sans)"
              transform="rotate(270 56 200)"
            >
              W
            </text>

            {/* Intercardinal markers */}
            <text
              x="302"
              y="98"
              textAnchor="middle"
              dominantBaseline="central"
              fill={textMuted}
              fontSize="11"
              fontWeight="600"
              fontFamily="var(--font-sans)"
              transform="rotate(45 302 98)"
            >
              NE
            </text>
            <text
              x="302"
              y="302"
              textAnchor="middle"
              dominantBaseline="central"
              fill={textMuted}
              fontSize="11"
              fontWeight="600"
              fontFamily="var(--font-sans)"
              transform="rotate(135 302 302)"
            >
              SE
            </text>
            <text
              x="98"
              y="302"
              textAnchor="middle"
              dominantBaseline="central"
              fill={textMuted}
              fontSize="11"
              fontWeight="600"
              fontFamily="var(--font-sans)"
              transform="rotate(225 98 302)"
            >
              SW
            </text>
            <text
              x="98"
              y="98"
              textAnchor="middle"
              dominantBaseline="central"
              fill={textMuted}
              fontSize="11"
              fontWeight="600"
              fontFamily="var(--font-sans)"
              transform="rotate(315 98 98)"
            >
              NW
            </text>

            {/* TARGET WAYPOINT BUG ON DIAL RING (Amber triangle) */}
            {targetInfo && (
              <g transform={`rotate(${targetInfo.bearing} 200 200)`}>
                <polygon
                  points="200,26 193,39 207,39"
                  fill="#f59e0b"
                  stroke="#1e293b"
                  strokeWidth="1"
                />
              </g>
            )}

            {/* LOCKED BEARING BUG (Cyan diamond) */}
            {lockedBearing !== null && (
              <g transform={`rotate(${lockedBearing} 200 200)`}>
                <polygon
                  points="200,24 205,33 200,42 195,33"
                  fill="#06b6d4"
                  stroke="#0f172a"
                  strokeWidth="1"
                />
              </g>
            )}
          </g>

          {/* INNER CALIBRATED ARTIFICIAL HORIZON & BUBBLE LEVEL */}
          {/* Central Housing Disk */}
          <circle cx="200" cy="200" r="85" fill="url(#centerGradient)" stroke={strokeRing} strokeWidth="1" />
          
          {/* Level Crosshairs & Pitch Concentric Rings */}
          <circle cx="200" cy="200" r="15" fill="none" stroke={strokeRing} strokeWidth="0.8" />
          <circle cx="200" cy="200" r="35" fill="none" stroke={strokeRing} strokeWidth="0.8" strokeDasharray="3,3" />
          <circle cx="200" cy="200" r="60" fill="none" stroke={strokeRing} strokeWidth="0.8" strokeDasharray="2,4" />

          {/* Crosshair Axes */}
          <line x1="130" y1="200" x2="270" y2="200" stroke={strokeRing} strokeWidth="0.75" />
          <line x1="200" y1="130" x2="200" y2="270" stroke={strokeRing} strokeWidth="0.75" />

          {/* Spirit Bubble */}
          <circle
            cx={bubbleX}
            cy={bubbleY}
            r="9"
            fill={isLevel ? (isNightRed ? 'rgba(239,68,68,0.45)' : 'rgba(16,185,129,0.45)') : 'rgba(255,255,255,0.2)'}
            stroke={isLevel ? (isNightRed ? '#ef4444' : '#10b981') : (isNightRed ? '#991b1b' : '#64748b')}
            strokeWidth="1.5"
            className="transition-all duration-100 ease-out"
          />
          {/* Level center target pin */}
          <circle
            cx="200"
            cy="200"
            r="2"
            fill={isLevel ? (isNightRed ? '#ef4444' : '#10b981') : textMuted}
          />

          {/* FIXED CENTER POINTER NEEDLE */}
          {/* North pointing needle */}
          <polygon
            points="200,90 205,190 200,185 195,190"
            fill={northColor}
            opacity="0.9"
          />
          {/* South pointing needle */}
          <polygon
            points="200,310 205,210 200,215 195,210"
            fill={textMuted}
            opacity="0.4"
          />
          {/* Center Hub */}
          <circle cx="200" cy="200" r="7" fill={isNightRed ? '#1a0505' : isLight ? '#ffffff' : '#0a0d14'} stroke={strokeRing} strokeWidth="2" />
        </svg>

        {/* Tactical Heading Numeric Readout Overlay in Center-Bottom */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-center pointer-events-none">
          <div className="text-3xl font-extrabold font-mono tracking-tight flex items-baseline justify-center">
            <span style={{ color: textPrimary }}>{Math.round(heading).toString().padStart(3, '0')}</span>
            <span className="text-base font-normal ml-0.5 text-slate-400">°</span>
            <span className="text-xl font-bold ml-2 uppercase" style={{ color: northColor }}>
              {getCardinalDirection(heading)}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center justify-center gap-2">
            <span>P: {Math.round(pitch)}°</span>
            <span>·</span>
            <span>R: {Math.round(roll)}°</span>
            <span>·</span>
            <span className={isLevel ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
              {isLevel ? 'LEVEL' : 'TILT'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Instrumental Control Actions Below Dial */}
      <div className="w-full flex items-center justify-center gap-3 mt-4">
        {/* Course Lock Button */}
        <button
          type="button"
          onClick={() => {
            if (lockedBearing !== null) {
              onSetLockedBearing(null);
            } else {
              onSetLockedBearing(Math.round(heading));
            }
          }}
          className={`h-11 px-4 text-xs font-mono font-medium rounded-lg border transition-colors flex items-center gap-2 ${
            lockedBearing !== null
              ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-400'
              : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-700/60 text-slate-300'
          }`}
          title="Lock bearing to hold course line"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="whitespace-nowrap">
            {lockedBearing !== null ? `Locked ${lockedBearing}°` : 'Lock Bearing'}
          </span>
        </button>

        {/* Target Waypoint Clear or Info */}
        {targetWaypoint && (
          <button
            type="button"
            onClick={() => onSetLockedBearing(null)}
            className="h-11 px-3 text-xs font-mono rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center gap-1.5"
            title="Active target waypoint"
          >
            <span className="truncate max-w-[130px] font-semibold">Nav: {targetWaypoint.name}</span>
          </button>
        )}
      </div>
    </div>
  );
};
