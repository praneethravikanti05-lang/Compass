import React from 'react';
import { AppSettings, AppTheme, CoordinateFormat, UnitSystem } from '../types/compass';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-[#0e131f] p-5 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
            Instrument Configuration
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 text-sm font-mono"
          >
            ✕
          </button>
        </div>

        {/* Display Theme */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-slate-300 font-semibold uppercase tracking-wider">
            Display Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'obsidian' as AppTheme, label: 'Obsidian' },
              { id: 'night_red' as AppTheme, label: 'Night Red' },
              { id: 'high_contrast_light' as AppTheme, label: 'Daylight' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => update('theme', t.id)}
                className={`min-h-[40px] px-2 text-xs font-mono rounded-lg border transition-colors ${
                  settings.theme === t.id
                    ? 'bg-cyan-500/15 border-cyan-500 text-cyan-400 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-slate-400">
            Night Red utilizes monochromatic crimson illumination to preserve night-adjusted vision.
          </div>
        </div>

        {/* Unit System */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-slate-300 font-semibold uppercase tracking-wider">
            Measurement Units
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'metric' as UnitSystem, label: 'Metric (m, km/h)' },
              { id: 'imperial' as UnitSystem, label: 'Imperial (ft, mph)' },
              { id: 'nautical' as UnitSystem, label: 'Nautical (nm, kn)' },
            ].map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => update('unitSystem', u.id)}
                className={`min-h-[40px] px-2 text-xs font-mono rounded-lg border transition-colors ${
                  settings.unitSystem === u.id
                    ? 'bg-cyan-500/15 border-cyan-500 text-cyan-400 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>

        {/* Coordinate Format */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-slate-300 font-semibold uppercase tracking-wider">
            Coordinate Notation
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'DD' as CoordinateFormat, label: 'DD' },
              { id: 'DMS' as CoordinateFormat, label: 'DMS' },
              { id: 'DDM' as CoordinateFormat, label: 'DDM' },
              { id: 'UTM' as CoordinateFormat, label: 'UTM' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => update('coordinateFormat', f.id)}
                className={`min-h-[38px] px-2 text-xs font-mono rounded-lg border transition-colors ${
                  settings.coordinateFormat === f.id
                    ? 'bg-cyan-500/15 border-cyan-500 text-cyan-400 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Magnetic Declination Adjustment */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono text-slate-300 font-semibold uppercase tracking-wider">
              Magnetic Declination
            </label>
            <span className="text-xs font-mono text-cyan-400 font-bold">
              {settings.magneticDeclination >= 0 ? `+${settings.magneticDeclination}° E` : `${settings.magneticDeclination}° W`}
            </span>
          </div>
          <input
            type="range"
            min="-30"
            max="30"
            step="0.5"
            value={settings.magneticDeclination}
            onChange={(e) => update('magneticDeclination', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <div className="text-[11px] text-slate-400">
            Compensates for the angle between Magnetic North and True Geographic North at your location.
          </div>
        </div>

        {/* Sensor Smoothing / Damping */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono text-slate-300 font-semibold uppercase tracking-wider">
              Sensor Filter Damping
            </label>
            <span className="text-xs font-mono text-slate-300">
              {settings.sensorDamping < 0.2 ? 'Direct' : settings.sensorDamping < 0.5 ? 'Balanced' : 'Ultra Smooth'}
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="0.8"
            step="0.05"
            value={settings.sensorDamping}
            onChange={(e) => update('sensorDamping', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        {/* Haptic Feedback Toggle */}
        <div className="flex items-center justify-between py-2 border-t border-slate-800/80">
          <div>
            <div className="text-xs font-mono text-slate-200 font-semibold">
              Cardinal Point Haptics
            </div>
            <div className="text-[11px] text-slate-400">
              Vibrate slightly when compass needle passes N, E, S, or W
            </div>
          </div>
          <button
            type="button"
            onClick={() => update('hapticFeedback', !settings.hapticFeedback)}
            className={`w-12 h-6 rounded-full transition-colors p-0.5 ${
              settings.hapticFeedback ? 'bg-cyan-500' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                settings.hapticFeedback ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Sensor Calibration Guide */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 text-xs text-slate-400">
          <div className="text-slate-200 font-mono font-semibold uppercase tracking-wider text-[11px]">
            Device Sensor Calibration Tip
          </div>
          <p>
            If heading reading drifts, rotate your device smoothly in a figure-8 motion in the air for 5 seconds to recalibrate the magnetometer.
          </p>
        </div>

        {/* Close Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
