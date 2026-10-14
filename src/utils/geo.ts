import { CoordinateFormat, TrackSession, UnitSystem, Waypoint } from '../types/compass';

/**
 * Calculates Great-Circle distance between two coordinates in meters using the Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates initial bearing (forward azimuth) from point 1 to point 2 in degrees (0 - 360)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return (toDeg(theta) + 360) % 360;
}

/**
 * Calculates relative angle difference between current heading and target bearing (-180 to +180)
 * Positive: turn right, Negative: turn left
 */
export function calculateHeadingDelta(currentHeading: number, targetBearing: number): number {
  let diff = (targetBearing - currentHeading) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Get 16-point cardinal compass text from heading (0 - 360)
 */
export function getCardinalDirection(heading: number): string {
  const normalized = (heading % 360 + 360) % 360;
  const directions = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW'
  ];
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
}

/**
 * Formats coordinates into standard geographic formats
 */
export function formatCoordinates(
  lat: number,
  lng: number,
  format: CoordinateFormat = 'DD'
): { latStr: string; lngStr: string; fullStr: string } {
  const latHemisphere = lat >= 0 ? 'N' : 'S';
  const lngHemisphere = lng >= 0 ? 'E' : 'W';
  const absLat = Math.abs(lat);
  const absLng = Math.abs(lng);

  if (format === 'DMS') {
    const latDeg = Math.floor(absLat);
    const latMinFloat = (absLat - latDeg) * 60;
    const latMin = Math.floor(latMinFloat);
    const latSec = ((latMinFloat - latMin) * 60).toFixed(1);

    const lngDeg = Math.floor(absLng);
    const lngMinFloat = (absLng - lngDeg) * 60;
    const lngMin = Math.floor(lngMinFloat);
    const lngSec = ((lngMinFloat - lngMin) * 60).toFixed(1);

    const latStr = `${latDeg}° ${latMin}' ${latSec}" ${latHemisphere}`;
    const lngStr = `${lngDeg}° ${lngMin}' ${lngSec}" ${lngHemisphere}`;
    return { latStr, lngStr, fullStr: `${latStr}, ${lngStr}` };
  }

  if (format === 'DDM') {
    const latDeg = Math.floor(absLat);
    const latMin = ((absLat - latDeg) * 60).toFixed(4);

    const lngDeg = Math.floor(absLng);
    const lngMin = ((absLng - lngDeg) * 60).toFixed(4);

    const latStr = `${latDeg}° ${latMin}' ${latHemisphere}`;
    const lngStr = `${lngDeg}° ${lngMin}' ${lngHemisphere}`;
    return { latStr, lngStr, fullStr: `${latStr}, ${lngStr}` };
  }

  if (format === 'UTM') {
    // Standard UTM Zone estimation
    const zoneNumber = Math.floor((lng + 180) / 6) + 1;
    const isNorth = lat >= 0;
    const bandLetters = 'CDEFGHJKLMNPQRSTUVWX';
    const bandIndex = Math.min(Math.max(Math.floor((lat + 80) / 8), 0), 19);
    const zoneLetter = bandLetters[bandIndex] || (isNorth ? 'N' : 'S');
    
    // Approximate local easting/northing calculation for display
    const k0 = 0.9996;
    const a = 6378137;
    const e = 0.081819191;
    const radLat = toRad(lat);
    const radLng = toRad(lng);
    const centralMeridian = toRad((zoneNumber - 1) * 6 - 180 + 3);
    const dLon = radLng - centralMeridian;

    const N = a / Math.sqrt(1 - Math.pow(e * Math.sin(radLat), 2));
    const T = Math.pow(Math.tan(radLat), 2);
    const C = (e * e / (1 - e * e)) * Math.pow(Math.cos(radLat), 2);
    const A = Math.cos(radLat) * dLon;

    const easting = Math.round(
      500000 + k0 * N * (A + (1 - T + C) * Math.pow(A, 3) / 6)
    );
    const M = a * ((1 - e * e / 4 - 3 * Math.pow(e, 4) / 64) * radLat - (3 * e * e / 8 + 3 * Math.pow(e, 4) / 32) * Math.sin(2 * radLat) + (15 * Math.pow(e, 4) / 256) * Math.sin(4 * radLat));
    const northing = Math.round((isNorth ? 0 : 10000000) + k0 * (M + N * Math.tan(radLat) * (Math.pow(A, 2) / 2 + (5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4) / 24)));

    const latStr = `${zoneNumber}${zoneLetter} ${northing}m N`;
    const lngStr = `${easting}m E`;
    return { latStr, lngStr, fullStr: `${zoneNumber}${zoneLetter} ${easting}E ${northing}N` };
  }

  // Default: Decimal Degrees (DD)
  const latStr = `${absLat.toFixed(6)}° ${latHemisphere}`;
  const lngStr = `${absLng.toFixed(6)}° ${lngHemisphere}`;
  return { latStr, lngStr, fullStr: `${latStr}, ${lngStr}` };
}

/**
 * Format distances cleanly with unit awareness
 */
export function formatDistance(meters: number, unit: UnitSystem = 'metric'): string {
  if (meters === null || meters === undefined || isNaN(meters)) return '—';

  if (unit === 'imperial') {
    const feet = meters * 3.28084;
    if (feet < 1000) {
      return `${Math.round(feet)} ft`;
    }
    const miles = feet / 5280;
    return `${miles.toFixed(2)} mi`;
  }

  if (unit === 'nautical') {
    const nm = meters / 1852;
    if (nm < 0.5) {
      const feet = meters * 3.28084;
      return `${Math.round(feet)} ft`;
    }
    return `${nm.toFixed(2)} NM`;
  }

  // Metric
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km.toFixed(2)} km`;
}

/**
 * Format speed cleanly with unit awareness
 */
export function formatSpeed(mps: number | null, unit: UnitSystem = 'metric'): string {
  if (mps === null || mps === undefined || isNaN(mps) || mps < 0) return '0.0';

  if (unit === 'imperial') {
    const mph = mps * 2.23694;
    return `${mph.toFixed(1)} mph`;
  }

  if (unit === 'nautical') {
    const knots = mps * 1.94384;
    return `${knots.toFixed(1)} kn`;
  }

  const kmh = mps * 3.6;
  return `${kmh.toFixed(1)} km/h`;
}

/**
 * Format altitude / elevation
 */
export function formatAltitude(meters: number | null, unit: UnitSystem = 'metric'): string {
  if (meters === null || meters === undefined || isNaN(meters)) return '—';

  if (unit === 'imperial') {
    const feet = Math.round(meters * 3.28084);
    return `${feet} ft`;
  }

  return `${Math.round(meters)} m`;
}

/**
 * Exports track and waypoints as GPX XML
 */
export function exportToGPX(track: TrackSession | null, waypoints: Waypoint[] = []): string {
  const timestamp = new Date().toISOString();
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Zenith Precision Compass"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${track ? track.name : 'Zenith Waypoints'}</name>
    <time>${timestamp}</time>
  </metadata>\n`;

  // Waypoints
  waypoints.forEach((wp) => {
    xml += `  <wpt lat="${wp.latitude}" lon="${wp.longitude}">
    <ele>${wp.altitude ?? 0}</ele>
    <time>${new Date(wp.createdAt).toISOString()}</time>
    <name>${escapeXml(wp.name)}</name>
    <type>${escapeXml(wp.category)}</type>
    ${wp.notes ? `<desc>${escapeXml(wp.notes)}</desc>` : ''}
  </wpt>\n`;
  });

  // Track points
  if (track && track.points.length > 0) {
    xml += `  <trk>
    <name>${escapeXml(track.name)}</name>
    <trkseg>\n`;
    track.points.forEach((pt) => {
      xml += `      <trkpt lat="${pt.latitude}" lon="${pt.longitude}">
        ${pt.altitude !== null ? `<ele>${pt.altitude}</ele>` : ''}
        <time>${new Date(pt.timestamp).toISOString()}</time>
        ${pt.speed !== null ? `<speed>${pt.speed}</speed>` : ''}
      </trkpt>\n`;
    });
    xml += `    </trkseg>
  </trk>\n`;
  }

  xml += `</gpx>`;
  return xml;
}

/**
 * Exports data as GeoJSON
 */
export function exportToGeoJSON(track: TrackSession | null, waypoints: Waypoint[] = []): string {
  const features: any[] = [];

  // Waypoints as Points
  waypoints.forEach((wp) => {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [wp.longitude, wp.latitude, wp.altitude ?? 0],
      },
      properties: {
        name: wp.name,
        category: wp.category,
        notes: wp.notes,
        createdAt: wp.createdAt,
      },
    });
  });

  // Track as LineString
  if (track && track.points.length > 0) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: track.points.map((p) => [p.longitude, p.latitude, p.altitude ?? 0]),
      },
      properties: {
        name: track.name,
        distanceMeters: track.totalDistanceMeters,
        startTime: track.startTime,
        endTime: track.endTime,
      },
    });
  }

  return JSON.stringify(
    {
      type: 'FeatureCollection',
      features,
    },
    null,
    2
  );
}

/**
 * Exports waypoints as CSV
 */
export function exportToCSV(waypoints: Waypoint[]): string {
  const headers = ['Name', 'Category', 'Latitude', 'Longitude', 'Altitude (m)', 'Notes', 'Created At'];
  const rows = waypoints.map((wp) => [
    `"${escapeCsv(wp.name)}"`,
    `"${escapeCsv(wp.category)}"`,
    wp.latitude.toFixed(6),
    wp.longitude.toFixed(6),
    wp.altitude !== null ? wp.altitude.toFixed(1) : '',
    `"${escapeCsv(wp.notes || '')}"`,
    new Date(wp.createdAt).toISOString(),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeCsv(unsafe: string): string {
  return unsafe.replace(/"/g, '""');
}

/**
 * Triggers client-side file download
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
