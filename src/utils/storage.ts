import { AppSettings, TrackSession, Waypoint } from '../types/compass';

const STORAGE_KEYS = {
  WAYPOINTS: 'zenith_compass_waypoints_v1',
  ACTIVE_TRACK: 'zenith_compass_active_track_v1',
  SAVED_TRACKS: 'zenith_compass_saved_tracks_v1',
  SETTINGS: 'zenith_compass_settings_v1',
};

export const DEFAULT_SETTINGS: AppSettings = {
  unitSystem: 'metric',
  coordinateFormat: 'DD',
  theme: 'obsidian',
  magneticDeclination: 0,
  hapticFeedback: true,
  sensorDamping: 0.35,
  autoTrackRecord: false,
};

// Curated initial benchmark waypoints for offline testing & immediate navigation
const INITIAL_BENCHMARK_WAYPOINTS: Waypoint[] = [
  {
    id: 'wp_sample_summit',
    name: 'Eagle Peak Summit',
    latitude: 37.7833,
    longitude: -122.4167,
    altitude: 432,
    category: 'Summit',
    notes: 'High vantage point. Direct visual bearing available on clear days.',
    createdAt: Date.now() - 86400000 * 3,
    color: '#06b6d4',
  },
  {
    id: 'wp_sample_camp',
    name: 'Pine Valley Base Camp',
    latitude: 37.7725,
    longitude: -122.4289,
    altitude: 180,
    category: 'Camp',
    notes: 'Potable water stream 50m west of coordinates.',
    createdAt: Date.now() - 86400000 * 2,
    color: '#10b981',
  },
  {
    id: 'wp_sample_trailhead',
    name: 'North Ridge Trailhead',
    latitude: 37.7650,
    longitude: -122.4095,
    altitude: 95,
    category: 'Trailhead',
    notes: 'Parking area and trail registry signpost.',
    createdAt: Date.now() - 86400000,
    color: '#f59e0b',
  },
];

export function getStoredWaypoints(): Waypoint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WAYPOINTS);
    if (!raw) {
      saveStoredWaypoints(INITIAL_BENCHMARK_WAYPOINTS);
      return INITIAL_BENCHMARK_WAYPOINTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read waypoints from storage', err);
    return INITIAL_BENCHMARK_WAYPOINTS;
  }
}

export function saveStoredWaypoints(waypoints: Waypoint[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.WAYPOINTS, JSON.stringify(waypoints));
  } catch (err) {
    console.error('Failed to save waypoints to storage', err);
  }
}

export function getStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Failed to read settings from storage', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings to storage', err);
  }
}

export function getStoredActiveTrack(): TrackSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_TRACK);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Failed to read active track from storage', err);
    return null;
  }
}

export function saveStoredActiveTrack(track: TrackSession | null): void {
  try {
    if (track) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TRACK, JSON.stringify(track));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_TRACK);
    }
  } catch (err) {
    console.error('Failed to save active track to storage', err);
  }
}

export function getStoredSavedTracks(): TrackSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_TRACKS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to read saved tracks from storage', err);
    return [];
  }
}

export function saveStoredSavedTracks(tracks: TrackSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SAVED_TRACKS, JSON.stringify(tracks));
  } catch (err) {
    console.error('Failed to save saved tracks to storage', err);
  }
}

/**
 * Parses an imported JSON or GPX file into Waypoint objects
 */
export function parseImportedData(fileContent: string): { waypoints: Waypoint[]; track?: TrackSession } {
  // Try GeoJSON
  try {
    const parsed = JSON.parse(fileContent);
    if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
      const waypoints: Waypoint[] = [];
      parsed.features.forEach((feat: any, idx: number) => {
        if (feat.geometry?.type === 'Point' && Array.isArray(feat.geometry.coordinates)) {
          waypoints.push({
            id: `wp_import_${Date.now()}_${idx}`,
            name: feat.properties?.name || `Waypoint ${idx + 1}`,
            longitude: feat.geometry.coordinates[0],
            latitude: feat.geometry.coordinates[1],
            altitude: feat.geometry.coordinates[2] || null,
            category: feat.properties?.category || 'Custom',
            notes: feat.properties?.notes || '',
            createdAt: feat.properties?.createdAt || Date.now(),
          });
        }
      });
      return { waypoints };
    }
  } catch {
    // Not JSON, check XML/GPX
  }

  // Parse GPX via DOMParser
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(fileContent, 'text/xml');
    const wptElements = doc.querySelectorAll('wpt');
    const waypoints: Waypoint[] = [];

    wptElements.forEach((el, idx) => {
      const lat = parseFloat(el.getAttribute('lat') || '0');
      const lon = parseFloat(el.getAttribute('lon') || '0');
      const name = el.querySelector('name')?.textContent || `Waypoint ${idx + 1}`;
      const ele = el.querySelector('ele')?.textContent;
      const desc = el.querySelector('desc')?.textContent || '';
      const type = (el.querySelector('type')?.textContent as any) || 'Custom';

      waypoints.push({
        id: `wp_gpx_${Date.now()}_${idx}`,
        name,
        latitude: lat,
        longitude: lon,
        altitude: ele ? parseFloat(ele) : null,
        category: type,
        notes: desc,
        createdAt: Date.now(),
      });
    });

    if (waypoints.length > 0) {
      return { waypoints };
    }
  } catch (err) {
    console.error('Failed to parse GPX import', err);
  }

  // Fallback: CSV parser
  try {
    const lines = fileContent.trim().split('\n');
    if (lines.length > 1) {
      const waypoints: Waypoint[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
        if (parts.length >= 4) {
          const name = parts[0] || `Point ${i}`;
          const cat = (parts[1] as any) || 'Custom';
          const lat = parseFloat(parts[2]);
          const lon = parseFloat(parts[3]);
          const alt = parts[4] ? parseFloat(parts[4]) : null;
          const notes = parts[5] || '';
          if (!isNaN(lat) && !isNaN(lon)) {
            waypoints.push({
              id: `wp_csv_${Date.now()}_${i}`,
              name,
              category: cat,
              latitude: lat,
              longitude: lon,
              altitude: alt,
              notes,
              createdAt: Date.now(),
            });
          }
        }
      }
      if (waypoints.length > 0) {
        return { waypoints };
      }
    }
  } catch (err) {
    console.error('Failed to parse CSV import', err);
  }

  return { waypoints: [] };
}
