import React, { useEffect, useState } from 'react';
import { AppTheme, TrackSession, UnitSystem } from '../types/compass';
import { downloadFile, exportToGeoJSON, exportToGPX, formatAltitude, formatDistance, formatSpeed } from '../utils/geo';

interface TrackRecorderProps {
  activeTrack: TrackSession | null;
  savedTracks: TrackSession[];
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onStopAndSaveRecording: (customName?: string) => void;
  onDiscardActiveRecording: () => void;
  onDeleteSavedTrack: (id: string) => void;
  unit: UnitSystem;
  theme: AppTheme;
}

export const TrackRecorder: React.FC<TrackRecorderProps> = ({
  activeTrack,
  savedTracks,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopAndSaveRecording,
  onDiscardActiveRecording,
  onDeleteSavedTrack,
  unit,
  theme,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [trackNameInput, setTrackNameInput] = useState<string>('');
  const [isSavingModal, setIsSavingModal] = useState<boolean>(false);

  // Timer loop for active recording
  useEffect(() => {
    if (!activeTrack || !activeTrack.isActive) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const secs = Math.floor((now - activeTrack.startTime) / 1000);
      setElapsedSeconds(secs);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTrack]);

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSaveModalConfirm = () => {
    onStopAndSaveRecording(trackNameInput);
    setIsSavingModal(false);
    setTrackNameInput('');
  };

  const handleDownloadGPX = (track: TrackSession) => {
    const gpx = exportToGPX(track, []);
    downloadFile(gpx, `${track.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.gpx`, 'application/gpx+xml');
  };

  const handleDownloadGeoJSON = (track: TrackSession) => {
    const json = exportToGeoJSON(track, []);
    downloadFile(json, `${track.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.geojson`, 'application/geo+json');
  };

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Active Track Recording Console */}
      <div className="rounded-xl border border-slate-800 bg-[#0e131f]/90 p-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                activeTrack?.isActive ? 'bg-red-500 animate-pulse' : 'bg-slate-600'
              }`}
            />
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-200">
              {activeTrack ? 'Trail Session Recording' : 'Offline GPS Track Recorder'}
            </span>
          </div>

          {activeTrack && (
            <div className="text-xs font-mono font-bold text-red-400">
              REC {formatTimer(elapsedSeconds)}
            </div>
          )}
        </div>

        {activeTrack ? (
          <div className="py-3 space-y-3">
            {/* Real-time stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Distance</div>
                <div className="text-base font-mono font-bold text-slate-100">
                  {formatDistance(activeTrack.totalDistanceMeters, unit)}
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Points</div>
                <div className="text-base font-mono font-bold text-slate-100">
                  {activeTrack.points.length} pts
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Elev Gain</div>
                <div className="text-base font-mono font-bold text-emerald-400">
                  +{formatAltitude(activeTrack.elevationGainMeters, unit)}
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Max Speed</div>
                <div className="text-base font-mono font-bold text-slate-100">
                  {formatSpeed(activeTrack.maxSpeedMps, unit)}
                </div>
              </div>
            </div>

            {/* Elevation Profile Mini-Chart if points available */}
            {activeTrack.points.length > 3 && (
              <div className="p-2.5 rounded bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 mb-1">
                  Trail Elevation Profile
                </div>
                <div className="h-16 w-full flex items-end gap-0.5">
                  {(() => {
                    const altitudes = activeTrack.points.map((p) => p.altitude || 0);
                    const minAlt = Math.min(...altitudes);
                    const maxAlt = Math.max(...altitudes);
                    const range = Math.max(maxAlt - minAlt, 10);

                    // Downsample to at most 30 bars
                    const step = Math.max(Math.floor(activeTrack.points.length / 30), 1);
                    return activeTrack.points
                      .filter((_, idx) => idx % step === 0)
                      .map((pt, i) => {
                        const heightPct = Math.max((( (pt.altitude || 0) - minAlt) / range) * 100, 10);
                        return (
                          <div
                            key={i}
                            className="flex-1 bg-cyan-500/40 hover:bg-cyan-400 transition-colors rounded-t-sm"
                            style={{ height: `${heightPct}%` }}
                            title={`${formatAltitude(pt.altitude, unit)}`}
                          />
                        );
                      });
                  })()}
                </div>
              </div>
            )}

            {/* Session Action Controls */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {activeTrack.isActive ? (
                <button
                  type="button"
                  onClick={onPauseRecording}
                  className="min-h-[44px] px-4 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-mono font-semibold"
                >
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onResumeRecording}
                  className="min-h-[44px] px-4 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-mono font-semibold"
                >
                  Resume
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setTrackNameInput(activeTrack.name);
                  setIsSavingModal(true);
                }}
                className="min-h-[44px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-semibold"
              >
                Finish &amp; Save
              </button>

              <button
                type="button"
                onClick={onDiscardActiveRecording}
                className="min-h-[44px] px-3 rounded-lg text-slate-400 hover:text-red-400 text-xs font-mono"
              >
                Discard
              </button>
            </div>
          </div>
        ) : (
          <div className="py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              Record coordinates continuously in the background for offline GPX route analysis.
            </div>
            <button
              type="button"
              onClick={onStartRecording}
              className="min-h-[44px] px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold flex items-center gap-2 whitespace-nowrap"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-white" />
              <span>Start Recording</span>
            </button>
          </div>
        )}
      </div>

      {/* Save Name Dialog */}
      {isSavingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 space-y-4">
            <h3 className="text-sm font-mono font-bold text-slate-100">Save Recorded Track</h3>
            <div className="space-y-1">
              <label className="text-xs font-mono text-slate-400">Track Name</label>
              <input
                type="text"
                value={trackNameInput}
                onChange={(e) => setTrackNameInput(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSavingModal(false)}
                className="min-h-[40px] px-3 rounded text-xs font-mono text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModalConfirm}
                className="min-h-[40px] px-4 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-semibold"
              >
                Save Track
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Tracks History */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
          Saved Track Logs ({savedTracks.length})
        </h3>

        {savedTracks.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-lg">
            No saved tracks yet. Hit "Start Recording" above when beginning your trail.
          </div>
        ) : (
          <div className="space-y-2">
            {savedTracks.map((trk) => {
              const durationSecs = trk.endTime
                ? Math.floor((trk.endTime - trk.startTime) / 1000)
                : 0;

              return (
                <div
                  key={trk.id}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-mono font-bold text-slate-100">
                      {trk.name}
                    </div>
                    <div className="text-xs font-mono text-slate-400 flex items-center gap-2 flex-wrap">
                      <span>{new Date(trk.startTime).toLocaleDateString()}</span>
                      <span>·</span>
                      <span>{formatDistance(trk.totalDistanceMeters, unit)}</span>
                      <span>·</span>
                      <span>{formatTimer(durationSecs)}</span>
                      <span>·</span>
                      <span>{trk.points.length} pts</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleDownloadGPX(trk)}
                      className="min-h-[38px] px-3 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                      title="Download GPX file"
                    >
                      GPX
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadGeoJSON(trk)}
                      className="min-h-[38px] px-3 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                      title="Download GeoJSON"
                    >
                      GeoJSON
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSavedTrack(trk.id)}
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-500 hover:text-red-400"
                      title="Delete track"
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
    </div>
  );
};
