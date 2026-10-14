import React from 'react';
import { AppTheme, OrientationData } from '../types/compass';

interface LevelInstrumentProps {
  orientation: OrientationData;
  onSimulatePitchRoll?: (pitch: number, roll: number) => void;
  theme: AppTheme;
}

export const LevelInstrument: React.FC<LevelInstrumentProps> = ({
  orientation,
  onSimulatePitchRoll,
  theme,
}) => {
  const pitch = orientation.pitch;
  const roll = orientation.roll;

  const isNightRed = theme === 'night_red';
  const isLight = theme === 'high_contrast_light';

  // Strict level tolerance (within 0.5 degrees)
  const isLevel = Math.abs(pitch) < 0.6 && Math.abs(roll) < 0.6;
  const isClose = Math.abs(pitch) < 2.0 && Math.abs(roll) < 2.0;

  // Clamped bubble offset (radius max 100px)
  const maxTilt = 20; // 20 degrees = full scale edge
  const bubbleX = 150 + Math.min(Math.max((roll / maxTilt) * 110, -110), 110);
  const bubbleY = 150 + Math.min(Math.max((pitch / maxTilt) * 110, -110), 110);

  const ringStroke = isNightRed ? '#380a0a' : isLight ? '#cbd5e1' : '#1e293b';
  const activeColor = isLevel
    ? isNightRed
      ? '#ef4444'
      : '#10b981'
    : isClose
    ? '#f59e0b'
    : isNightRed
    ? '#7f1d1d'
    : '#06b6d4';

  return (
    <div className="w-full flex flex-col items-center space-y-4 max-w-[420px] mx-auto select-none">
      {/* Level Status Header */}
      <div className="text-center space-y-1">
        <div className="text-xs font-mono uppercase tracking-widest text-slate-400">
          Dual-Axis Digital Inclinometer
        </div>
        <div
          className={`text-xl font-mono font-extrabold tracking-tight ${
            isLevel ? 'text-emerald-400' : isClose ? 'text-amber-400' : 'text-slate-100'
          }`}
        >
          {isLevel ? 'PERFECTLY LEVEL' : `${Math.abs(pitch).toFixed(1)}° P · ${Math.abs(roll).toFixed(1)}° R`}
        </div>
      </div>

      {/* 2D Circular Spirit Bubble Vial */}
      <div className="relative w-full aspect-square max-w-[320px] rounded-full border border-slate-800 bg-[#07090f] p-2 flex items-center justify-center">
        <svg viewBox="0 0 300 300" className="w-full h-full">
          {/* Outer Housing Ring */}
          <circle cx="150" cy="150" r="140" fill="none" stroke={ringStroke} strokeWidth="1.5" />
          <circle cx="150" cy="150" r="110" fill="none" stroke={ringStroke} strokeWidth="0.8" strokeDasharray="3,3" />
          <circle cx="150" cy="150" r="55" fill="none" stroke={ringStroke} strokeWidth="0.8" strokeDasharray="2,3" />

          {/* Zero Tolerance Bullseye Target */}
          <circle
            cx="150"
            cy="150"
            r="18"
            fill={isLevel ? (isNightRed ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)') : 'none'}
            stroke={activeColor}
            strokeWidth="1.5"
          />

          {/* Calibrated Degree Reticle Lines */}
          <line x1="20" y1="150" x2="280" y2="150" stroke={ringStroke} strokeWidth="0.8" />
          <line x1="150" y1="20" x2="150" y2="280" stroke={ringStroke} strokeWidth="0.8" />

          {/* Degree Ticks on Axes */}
          {[-15, -10, -5, 5, 10, 15].map((deg) => (
            <g key={`htick-${deg}`}>
              <line
                x1={150 + (deg / maxTilt) * 110}
                y1="145"
                x2={150 + (deg / maxTilt) * 110}
                y2="155"
                stroke={ringStroke}
                strokeWidth="1"
              />
              <line
                x1="145"
                y1={150 + (deg / maxTilt) * 110}
                x2="155"
                y2={150 + (deg / maxTilt) * 110}
                stroke={ringStroke}
                strokeWidth="1"
              />
            </g>
          ))}

          {/* Floating Spirit Level Bubble */}
          <circle
            cx={bubbleX}
            cy={bubbleY}
            r="16"
            fill={isLevel ? 'rgba(16,185,129,0.4)' : 'rgba(6,182,212,0.3)'}
            stroke={activeColor}
            strokeWidth="2"
            className="transition-all duration-100 ease-out"
          />
          <circle cx={bubbleX} cy={bubbleY} r="3" fill={activeColor} />
        </svg>

        {/* Center Target Point */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
        </div>
      </div>

      {/* Numeric Telemetry Readout Grid */}
      <div className="w-full grid grid-cols-2 gap-3">
        {/* Pitch Card */}
        <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/70">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Pitch (Elevation / Tilt)
          </div>
          <div className="text-xl font-mono font-bold text-slate-100 mt-1">
            {pitch >= 0 ? `+${pitch.toFixed(1)}°` : `${pitch.toFixed(1)}°`}
          </div>
          <div className="text-[10px] font-mono text-slate-400">
            {pitch > 0.5 ? 'Nose Up' : pitch < -0.5 ? 'Nose Down' : 'Level'}
          </div>
        </div>

        {/* Roll Card */}
        <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/70">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Roll (Bank / Cant)
          </div>
          <div className="text-xl font-mono font-bold text-slate-100 mt-1">
            {roll >= 0 ? `+${roll.toFixed(1)}°` : `${roll.toFixed(1)}°`}
          </div>
          <div className="text-[10px] font-mono text-slate-400">
            {roll > 0.5 ? 'Bank Right' : roll < -0.5 ? 'Bank Left' : 'Level'}
          </div>
        </div>
      </div>

      {/* Simulator Quick Toggles for testing level */}
      {onSimulatePitchRoll && (
        <div className="w-full flex items-center justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onSimulatePitchRoll(0, 0)}
            className="min-h-[38px] px-3 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            Zero Level (0°, 0°)
          </button>
          <button
            type="button"
            onClick={() => onSimulatePitchRoll(8.4, -4.2)}
            className="min-h-[38px] px-3 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            Simulate 8° Pitch
          </button>
        </div>
      )}
    </div>
  );
};
