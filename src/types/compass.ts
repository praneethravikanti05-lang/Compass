export type CoordinateFormat = 'DD' | 'DMS' | 'DDM' | 'UTM';

export type UnitSystem = 'metric' | 'imperial' | 'nautical';

export type AppTheme = 'obsidian' | 'night_red' | 'high_contrast_light';

export type WaypointCategory =
  | 'Camp'
  | 'Summit'
  | 'Water'
  | 'Vehicle'
  | 'Trailhead'
  | 'Viewpoint'
  | 'Point of Interest'
  | 'Danger'
  | 'Custom';

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
  altitude: number | null; // meters
  accuracy: number | null; // meters
  altitudeAccuracy: number | null;
  heading: number | null; // degrees from GPS movement
  speed: number | null; // meters/second
  timestamp: number;
}

export interface Waypoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  altitude: number | null; // meters
  category: WaypointCategory;
  notes?: string;
  createdAt: number;
  color?: string;
}

export interface TrackPoint {
  latitude: number;
  longitude: number;
  altitude: number | null;
  speed: number | null;
  timestamp: number;
}

export interface TrackSession {
  id: string;
  name: string;
  startTime: number;
  endTime: number | null;
  points: TrackPoint[];
  totalDistanceMeters: number;
  maxSpeedMps: number;
  elevationGainMeters: number;
  elevationLossMeters: number;
  isActive: boolean;
}

export interface OrientationData {
  heading: number; // 0 - 360 degrees
  trueHeading: number | null; // if magnetic declination is factored
  pitch: number; // front-back tilt (-90 to +90)
  roll: number; // left-right tilt (-180 to +180)
  accuracy: number | null; // degrees accuracy if provided
  hasSensor: boolean;
  isSimulated: boolean;
  permissionGranted: boolean;
}

export interface AppSettings {
  unitSystem: UnitSystem;
  coordinateFormat: CoordinateFormat;
  theme: AppTheme;
  magneticDeclination: number; // degrees (-30 to +30)
  hapticFeedback: boolean;
  sensorDamping: number; // 0 to 0.9 (smoothing factor)
  autoTrackRecord: boolean;
}
