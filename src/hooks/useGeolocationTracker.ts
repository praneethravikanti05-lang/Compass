import { useCallback, useEffect, useRef, useState } from 'react';
import { GeoCoordinate, TrackPoint, TrackSession, Waypoint, WaypointCategory } from '../types/compass';
import { calculateDistance } from '../utils/geo';
import {
  getStoredActiveTrack,
  getStoredSavedTracks,
  getStoredWaypoints,
  saveStoredActiveTrack,
  saveStoredSavedTracks,
  saveStoredWaypoints,
} from '../utils/storage';

export function useGeolocationTracker() {
  const [currentPosition, setCurrentPosition] = useState<GeoCoordinate | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'acquiring' | 'locked' | 'denied' | 'simulated'>('acquiring');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  // Waypoints state
  const [waypoints, setWaypoints] = useState<Waypoint[]>(() => getStoredWaypoints());
  const [selectedTargetWaypoint, setSelectedTargetWaypoint] = useState<Waypoint | null>(null);

  // Active track recording state
  const [activeTrack, setActiveTrack] = useState<TrackSession | null>(() => getStoredActiveTrack());
  const [savedTracks, setSavedTracks] = useState<TrackSession[]>(() => getStoredSavedTracks());

  const watchIdRef = useRef<number | null>(null);
  const lastRecordedPointRef = useRef<TrackPoint | null>(null);

  // Monitor online / offline network state
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save waypoints when changed
  useEffect(() => {
    saveStoredWaypoints(waypoints);
  }, [waypoints]);

  // Save active track when changed
  useEffect(() => {
    saveStoredActiveTrack(activeTrack);
  }, [activeTrack]);

  // Save saved tracks list when changed
  useEffect(() => {
    saveStoredSavedTracks(savedTracks);
  }, [savedTracks]);

  // Handle position update
  const handlePositionSuccess = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude, altitude, accuracy, altitudeAccuracy, heading, speed } = position.coords;
    const timestamp = position.timestamp || Date.now();

    const newCoord: GeoCoordinate = {
      latitude,
      longitude,
      altitude,
      accuracy,
      altitudeAccuracy,
      heading,
      speed,
      timestamp,
    };

    setCurrentPosition(newCoord);
    setGpsStatus('locked');
    setGpsError(null);

    // If active track is recording, record track point
    setActiveTrack((prev) => {
      if (!prev || !prev.isActive) return prev;

      const newPoint: TrackPoint = {
        latitude,
        longitude,
        altitude,
        speed,
        timestamp,
      };

      // Only record if moved at least 2 meters or 5 seconds passed to save memory
      const last = lastRecordedPointRef.current;
      let distDelta = 0;
      let elevGainDelta = 0;
      let elevLossDelta = 0;

      if (last) {
        distDelta = calculateDistance(last.latitude, last.longitude, latitude, longitude);
        if (distDelta < 2 && timestamp - last.timestamp < 5000) {
          return prev; // skip redundant point
        }

        if (last.altitude !== null && altitude !== null) {
          const elevDelta = altitude - last.altitude;
          if (elevDelta > 0) elevGainDelta = elevDelta;
          else elevLossDelta = Math.abs(elevDelta);
        }
      }

      lastRecordedPointRef.current = newPoint;

      const updatedPoints = [...prev.points, newPoint];
      const maxSpeed = Math.max(prev.maxSpeedMps, speed || 0);

      return {
        ...prev,
        points: updatedPoints,
        totalDistanceMeters: prev.totalDistanceMeters + distDelta,
        maxSpeedMps: maxSpeed,
        elevationGainMeters: prev.elevationGainMeters + elevGainDelta,
        elevationLossMeters: prev.elevationLossMeters + elevLossDelta,
      };
    });
  }, []);

  const handlePositionError = useCallback((error: GeolocationPositionError) => {
    console.warn('Geolocation acquisition status:', error.message);
    if (error.code === error.PERMISSION_DENIED) {
      setGpsStatus('denied');
      setGpsError('GPS Location permission denied. You can manually simulate coordinates or inspect saved waypoints.');
    } else {
      setGpsError(error.message);
    }
  }, []);

  // Initialize Geolocation listener
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      setGpsError('Geolocation is not supported by your browser/device.');
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 2000,
    };

    // Initial query
    navigator.geolocation.getCurrentPosition(
      handlePositionSuccess,
      (err) => {
        handlePositionError(err);
        // If initial fails (e.g. iframe timeout or permission), set benchmark default so the UI is immediately functional
        setCurrentPosition((prev) => {
          if (!prev) {
            return {
              latitude: 37.774929,
              longitude: -122.419416,
              altitude: 48,
              accuracy: 12,
              altitudeAccuracy: 5,
              heading: 45,
              speed: 1.2,
              timestamp: Date.now(),
            };
          }
          return prev;
        });
      },
      options
    );

    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionSuccess,
      handlePositionError,
      options
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [handlePositionSuccess, handlePositionError]);

  // Track Recording Controls
  const startRecording = useCallback(() => {
    const newTrack: TrackSession = {
      id: `track_${Date.now()}`,
      name: `Track ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      startTime: Date.now(),
      endTime: null,
      points: currentPosition
        ? [
            {
              latitude: currentPosition.latitude,
              longitude: currentPosition.longitude,
              altitude: currentPosition.altitude,
              speed: currentPosition.speed,
              timestamp: currentPosition.timestamp,
            },
          ]
        : [],
      totalDistanceMeters: 0,
      maxSpeedMps: currentPosition?.speed || 0,
      elevationGainMeters: 0,
      elevationLossMeters: 0,
      isActive: true,
    };

    if (currentPosition) {
      lastRecordedPointRef.current = newTrack.points[0];
    }
    setActiveTrack(newTrack);
  }, [currentPosition]);

  const pauseRecording = useCallback(() => {
    setActiveTrack((prev) => (prev ? { ...prev, isActive: false } : null));
  }, []);

  const resumeRecording = useCallback(() => {
    setActiveTrack((prev) => (prev ? { ...prev, isActive: true } : null));
  }, []);

  const stopAndSaveRecording = useCallback((customName?: string) => {
    setActiveTrack((prev) => {
      if (!prev) return null;
      const completed: TrackSession = {
        ...prev,
        name: customName?.trim() || prev.name,
        endTime: Date.now(),
        isActive: false,
      };
      setSavedTracks((saved) => [completed, ...saved]);
      return null;
    });
    lastRecordedPointRef.current = null;
  }, []);

  const discardActiveRecording = useCallback(() => {
    setActiveTrack(null);
    lastRecordedPointRef.current = null;
  }, []);

  // Waypoints management
  const addWaypoint = useCallback((wp: Omit<Waypoint, 'id' | 'createdAt'>) => {
    const newWaypoint: Waypoint = {
      ...wp,
      id: `wp_${Date.now()}`,
      createdAt: Date.now(),
    };
    setWaypoints((prev) => [newWaypoint, ...prev]);
    return newWaypoint;
  }, []);

  const dropCurrentWaypoint = useCallback(
    (name?: string, category: WaypointCategory = 'Point of Interest', notes: string = '') => {
      if (!currentPosition) return null;
      const autoName =
        name?.trim() ||
        `${category} #${waypoints.length + 1}`;
      const newWp: Waypoint = {
        id: `wp_${Date.now()}`,
        name: autoName,
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        altitude: currentPosition.altitude,
        category,
        notes,
        createdAt: Date.now(),
        color: category === 'Summit' ? '#06b6d4' : category === 'Camp' ? '#10b981' : '#f59e0b',
      };
      setWaypoints((prev) => [newWp, ...prev]);
      return newWp;
    },
    [currentPosition, waypoints.length]
  );

  const removeWaypoint = useCallback((id: string) => {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
    setSelectedTargetWaypoint((curr) => (curr?.id === id ? null : curr));
  }, []);

  const updateWaypoint = useCallback((id: string, updates: Partial<Waypoint>) => {
    setWaypoints((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)));
    setSelectedTargetWaypoint((curr) => (curr?.id === id ? { ...curr, ...updates } : curr));
  }, []);

  const deleteSavedTrack = useCallback((id: string) => {
    setSavedTracks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Simulator helper: step movement manually on desktop or tests
  const simulateStep = useCallback((deltaLat: number, deltaLng: number) => {
    setCurrentPosition((prev) => {
      const baseLat = prev ? prev.latitude : 37.7749;
      const baseLng = prev ? prev.longitude : -122.4194;
      const newLat = baseLat + deltaLat;
      const newLng = baseLng + deltaLng;
      const newPt: GeoCoordinate = {
        latitude: newLat,
        longitude: newLng,
        altitude: (prev?.altitude || 50) + Math.round((Math.random() - 0.5) * 4),
        accuracy: 4,
        altitudeAccuracy: 2,
        heading: ((Math.atan2(deltaLng, deltaLat) * 180) / Math.PI + 360) % 360,
        speed: 1.4, // walking ~5km/h
        timestamp: Date.now(),
      };

      // update active track if recording
      setActiveTrack((track) => {
        if (!track || !track.isActive) return track;
        const d = calculateDistance(baseLat, baseLng, newLat, newLng);
        return {
          ...track,
          points: [
            ...track.points,
            {
              latitude: newLat,
              longitude: newLng,
              altitude: newPt.altitude,
              speed: newPt.speed,
              timestamp: newPt.timestamp,
            },
          ],
          totalDistanceMeters: track.totalDistanceMeters + d,
        };
      });

      setGpsStatus('simulated');
      return newPt;
    });
  }, []);

  return {
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
    updateWaypoint,
    deleteSavedTrack,
    simulateStep,
  };
}
