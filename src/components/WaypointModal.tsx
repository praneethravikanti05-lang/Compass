import React, { useState } from 'react';
import { GeoCoordinate, Waypoint, WaypointCategory } from '../types/compass';

interface WaypointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (wp: Omit<Waypoint, 'id' | 'createdAt'>) => void;
  initialCoords?: GeoCoordinate | null;
}

export const WaypointModal: React.FC<WaypointModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCoords,
}) => {
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<WaypointCategory>('Point of Interest');
  const [latInput, setLatInput] = useState<string>(
    initialCoords ? initialCoords.latitude.toFixed(6) : ''
  );
  const [lngInput, setLngInput] = useState<string>(
    initialCoords ? initialCoords.longitude.toFixed(6) : ''
  );
  const [altInput, setAltInput] = useState<string>(
    initialCoords?.altitude ? Math.round(initialCoords.altitude).toString() : ''
  );
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories: WaypointCategory[] = [
    'Point of Interest',
    'Camp',
    'Summit',
    'Water',
    'Vehicle',
    'Trailhead',
    'Viewpoint',
    'Danger',
    'Custom',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    const alt = altInput.trim() ? parseFloat(altInput) : null;

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Latitude must be a valid number between -90 and 90');
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError('Longitude must be a valid number between -180 and 180');
      return;
    }

    const finalName = name.trim() || `${category} Pin`;

    const categoryColors: Record<WaypointCategory, string> = {
      'Point of Interest': '#8b5cf6',
      Camp: '#10b981',
      Summit: '#06b6d4',
      Water: '#38bdf8',
      Vehicle: '#a855f7',
      Trailhead: '#f59e0b',
      Viewpoint: '#ec4899',
      Danger: '#ef4444',
      Custom: '#64748b',
    };

    onSave({
      name: finalName,
      category,
      latitude: lat,
      longitude: lng,
      altitude: alt,
      notes: notes.trim(),
      color: categoryColors[category] || '#06b6d4',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0e131f] p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
            Save Offline Waypoint
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Waypoint Label
            </label>
            <input
              type="text"
              placeholder="e.g. Ridge Saddle Point"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as WaypointCategory)}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Coordinates Lat / Lng */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Latitude (DD)
              </label>
              <input
                type="text"
                value={latInput}
                onChange={(e) => setLatInput(e.target.value)}
                placeholder="37.7749"
                required
                className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Longitude (DD)
              </label>
              <input
                type="text"
                value={lngInput}
                onChange={(e) => setLngInput(e.target.value)}
                placeholder="-122.4194"
                required
                className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Elevation */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Altitude (Meters, optional)
            </label>
            <input
              type="number"
              value={altInput}
              onChange={(e) => setAltInput(e.target.value)}
              placeholder="e.g. 240"
              className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              Field Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Visible landmarks, stream flow, shelter details..."
              className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold"
            >
              Save Pin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
