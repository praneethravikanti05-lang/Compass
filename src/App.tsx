import React, { useState } from 'react';
import { CompassDial } from './components/CompassDial';
import { CoordinateTelemetry } from './components/CoordinateTelemetry';
import { ActiveTab, Header } from './components/Header';
import { LevelInstrument } from './components/LevelInstrument';
import { OfflineRadarMap } from './components/OfflineRadarMap';
import { SettingsModal } from './components/SettingsModal';
import { TrackRecorder } from './components/TrackRecorder';
import { WaypointList } from './components/WaypointList';
import { WaypointModal } from './components/WaypointModal';
import { useDeviceCompass } from './hooks/useDeviceCompass';
import { useGeolocationTracker } from './hooks/useGeolocationTracker';
import { AppSettings, CoordinateFormat, Waypoint } from './types/compass';
import { getStoredSettings, saveStoredSettings } from './utils/storage';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => getStoredSettings());
  const [activeTab, setActiveTab] = useState<ActiveTab>('compass');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWaypointModalOpen, setIsWaypointModalOpen] = useState(false);
  const [lockedBearing, setLockedBearing] = useState<number | null>(null);

  // Compass Sensor hook
  const {
    orientation,
    needsPermissionPrompt,
    permissionError,
    requestSensorPermission,
    setSimulatedHeading,
    setSimulatedPitchRoll,
  } = useDeviceCompass({
    magneticDeclination: settings.magneticDeclination,
    damping: settings.sensorDamping,
    enableHaptics: settings.hapticFeedback,
  });

  // Geolocation & Offline Tracking hook
  const {
    currentPosition,
    gpsStatus,
    gpsError,
    isOffline,
    waypoints,
    setWaypoints,
    selectedTargetWaypoint,
    setSelectedTargetWaypoint,
    activeTrack,
    savedTracks,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopAndSaveRecording,
    discardActiveRecording,
    addWaypoint,
    dropCurrentWaypoint,
    removeWaypoint,
    deleteSavedTrack,
    simulateStep,
  } = useGeolocationTracker();

  // Settings update handler
  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
  };

  // Cycle coordinate formats (DD -> DMS -> DDM -> UTM)
  const handleCycleFormat = () => {
    const sequence: CoordinateFormat[] = ['DD', 'DMS', 'DDM', 'UTM'];
    const currentIndex = sequence.indexOf(settings.coordinateFormat);
    const nextFormat = sequence[(currentIndex + 1) % sequence.length];
    handleUpdateSettings({ ...settings, coordinateFormat: nextFormat });
  };

  const handleDropPinClick = () => {
    setIsWaypointModalOpen(true);
  };

  const handleImportWaypoints = (imported: Waypoint[]) => {
    setWaypoints((prev) => [...imported, ...prev]);
  };

  // Theme container classes
  const themeContainerClass =
    settings.theme === 'night_red'
      ? 'bg-black text-red-100'
      : settings.theme === 'high_contrast_light'
      ? 'bg-slate-50 text-slate-900'
      : 'bg-[#080a0f] text-slate-100';

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors ${themeContainerClass}`}>
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        theme={settings.theme}
        isRecordingTrack={Boolean(activeTrack?.isActive)}
      />

      {/* Sensor Permission Notice for iOS / Strict Browsers */}
      {needsPermissionPrompt && (
        <div className="bg-cyan-950/80 border-b border-cyan-800 px-4 py-2 text-xs font-mono flex items-center justify-between gap-4">
          <span className="text-cyan-200">
            Sensor calibration requires permission on this mobile browser.
          </span>
          <button
            type="button"
            onClick={requestSensorPermission}
            className="min-h-[36px] px-3 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shrink-0"
          >
            Enable Sensor
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-5 md:p-6">
        {/* DESKTOP LAYOUT (>= 1024px): Two-column split with compass dial pinned on left */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Primary Compass Dial & Coordinate Telemetry */}
          <div className="lg:col-span-5 space-y-5 sticky top-20">
            <div className="p-4 rounded-2xl border border-slate-800/80 bg-[#0a0d17]/80 backdrop-blur-md">
              <CompassDial
                orientation={orientation}
                currentPosition={currentPosition}
                targetWaypoint={selectedTargetWaypoint}
                lockedBearing={lockedBearing}
                onSetLockedBearing={setLockedBearing}
                onSimulateHeading={setSimulatedHeading}
                theme={settings.theme}
              />
            </div>

            <CoordinateTelemetry
              position={currentPosition}
              format={settings.coordinateFormat}
              unit={settings.unitSystem}
              onCycleFormat={handleCycleFormat}
              onDropPin={handleDropPinClick}
              theme={settings.theme}
              isOffline={isOffline}
              gpsStatus={gpsStatus}
            />

            {/* Offline Navigation Telemetry Note */}
            <div className="text-[11px] font-mono text-slate-400 px-1 flex items-center justify-between">
              <span>
                Declination:{' '}
                {settings.magneticDeclination === 0
                  ? '0° (Magnetic)'
                  : `${settings.magneticDeclination > 0 ? '+' : ''}${settings.magneticDeclination}° (True North)`}
              </span>
              <span>100% Client-Side GPS</span>
            </div>
          </div>

          {/* Right Column: Contextual Workspace Pane */}
          <div className="lg:col-span-7">
            {activeTab === 'compass' && (
              <div className="space-y-6">
                <div className="p-5 rounded-2xl border border-slate-800/80 bg-[#0a0d17]/80">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                    <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                      Live Offline Trail Plotter
                    </h2>
                    <span className="text-[11px] font-mono text-slate-400">
                      Vector Radar View
                    </span>
                  </div>
                  <OfflineRadarMap
                    currentPosition={currentPosition}
                    heading={orientation.heading}
                    trackPoints={activeTrack?.points || []}
                    waypoints={waypoints}
                    targetWaypoint={selectedTargetWaypoint}
                    onSelectWaypoint={setSelectedTargetWaypoint}
                    onSimulateStep={simulateStep}
                    theme={settings.theme}
                  />
                </div>

                {/* Quick Waypoints Preview */}
                <div className="p-5 rounded-2xl border border-slate-800/80 bg-[#0a0d17]/80">
                  <WaypointList
                    waypoints={waypoints}
                    currentPosition={currentPosition}
                    targetWaypoint={selectedTargetWaypoint}
                    onSelectTarget={setSelectedTargetWaypoint}
                    onRemoveWaypoint={removeWaypoint}
                    onAddManualWaypoint={() => setIsWaypointModalOpen(true)}
                    onImportWaypoints={handleImportWaypoints}
                    unit={settings.unitSystem}
                    theme={settings.theme}
                  />
                </div>
              </div>
            )}

            {activeTab === 'radar' && (
              <div className="p-5 rounded-2xl border border-slate-800/80 bg-[#0a0d17]/80">
                <OfflineRadarMap
                  currentPosition={currentPosition}
                  heading={orientation.heading}
                  trackPoints={activeTrack?.points || []}
                  waypoints={waypoints}
                  targetWaypoint={selectedTargetWaypoint}
                  onSelectWaypoint={setSelectedTargetWaypoint}
                  onSimulateStep={simulateStep}
                  theme={settings.theme}
                />
              </div>
            )}

            {activeTab === 'waypoints' && (
              <div className="p-5 rounded-2xl border border-slate-800/80 bg-[#0a0d17]/80">
                <WaypointList
                  waypoints={waypoints}
                  currentPosition={currentPosition}
                  targetWaypoint={selectedTargetWaypoint}
                  onSelectTarget={setSelectedTargetWaypoint}
                  onRemoveWaypoint={removeWaypoint}
                  onAddManualWaypoint={() => setIsWaypointModalOpen(true)}
                  onImportWaypoints={handleImportWaypoints}
                  unit={settings.unitSystem}
                  theme={settings.theme}
                />
              </div>
            )}

            {activeTab === 'track' && (
              <div className="p-5 rounded-2xl border border-slate-800/80 bg-[#0a0d17]/80">
                <TrackRecorder
                  activeTrack={activeTrack}
                  savedTracks={savedTracks}
                  onStartRecording={startRecording}
                  onPauseRecording={pauseRecording}
                  onResumeRecording={resumeRecording}
                  onStopAndSaveRecording={stopAndSaveRecording}
                  onDiscardActiveRecording={discardActiveRecording}
                  onDeleteSavedTrack={deleteSavedTrack}
                  unit={settings.unitSystem}
                  theme={settings.theme}
                />
              </div>
            )}

            {activeTab === 'level' && (
              <div className="p-6 rounded-2xl border border-slate-800/80 bg-[#0a0d17]/80">
                <LevelInstrument
                  orientation={orientation}
                  onSimulatePitchRoll={setSimulatedPitchRoll}
                  theme={settings.theme}
                />
              </div>
            )}
          </div>
        </div>

        {/* MOBILE / TABLET LAYOUT (< 1024px): Streamlined tab-based navigation */}
        <div className="lg:hidden space-y-4">
          {activeTab === 'compass' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl border border-slate-800/80 bg-[#0a0d17]/80">
                <CompassDial
                  orientation={orientation}
                  currentPosition={currentPosition}
                  targetWaypoint={selectedTargetWaypoint}
                  lockedBearing={lockedBearing}
                  onSetLockedBearing={setLockedBearing}
                  onSimulateHeading={setSimulatedHeading}
                  theme={settings.theme}
                />
              </div>

              <CoordinateTelemetry
                position={currentPosition}
                format={settings.coordinateFormat}
                unit={settings.unitSystem}
                onCycleFormat={handleCycleFormat}
                onDropPin={handleDropPinClick}
                theme={settings.theme}
                isOffline={isOffline}
                gpsStatus={gpsStatus}
              />
            </div>
          )}

          {activeTab === 'radar' && (
            <div className="p-3.5 rounded-2xl border border-slate-800/80 bg-[#0a0d17]/80">
              <OfflineRadarMap
                currentPosition={currentPosition}
                heading={orientation.heading}
                trackPoints={activeTrack?.points || []}
                waypoints={waypoints}
                targetWaypoint={selectedTargetWaypoint}
                onSelectWaypoint={setSelectedTargetWaypoint}
                onSimulateStep={simulateStep}
                theme={settings.theme}
              />
            </div>
          )}

          {activeTab === 'waypoints' && (
            <div className="p-3.5 rounded-2xl border border-slate-800/80 bg-[#0a0d17]/80">
              <WaypointList
                waypoints={waypoints}
                currentPosition={currentPosition}
                targetWaypoint={selectedTargetWaypoint}
                onSelectTarget={setSelectedTargetWaypoint}
                onRemoveWaypoint={removeWaypoint}
                onAddManualWaypoint={() => setIsWaypointModalOpen(true)}
                onImportWaypoints={handleImportWaypoints}
                unit={settings.unitSystem}
                theme={settings.theme}
              />
            </div>
          )}

          {activeTab === 'track' && (
            <div className="p-3.5 rounded-2xl border border-slate-800/80 bg-[#0a0d17]/80">
              <TrackRecorder
                activeTrack={activeTrack}
                savedTracks={savedTracks}
                onStartRecording={startRecording}
                onPauseRecording={pauseRecording}
                onResumeRecording={resumeRecording}
                onStopAndSaveRecording={stopAndSaveRecording}
                onDiscardActiveRecording={discardActiveRecording}
                onDeleteSavedTrack={deleteSavedTrack}
                unit={settings.unitSystem}
                theme={settings.theme}
              />
            </div>
          )}

          {activeTab === 'level' && (
            <div className="p-5 rounded-2xl border border-slate-800/80 bg-[#0a0d17]/80">
              <LevelInstrument
                orientation={orientation}
                onSimulatePitchRoll={setSimulatedPitchRoll}
                theme={settings.theme}
              />
            </div>
          )}
        </div>
      </main>

      {/* Add Waypoint Modal */}
      <WaypointModal
        isOpen={isWaypointModalOpen}
        onClose={() => setIsWaypointModalOpen(false)}
        onSave={addWaypoint}
        initialCoords={currentPosition}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}
