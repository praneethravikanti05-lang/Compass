import { useCallback, useEffect, useRef, useState } from 'react';
import { OrientationData } from '../types/compass';

interface UseDeviceCompassOptions {
  magneticDeclination?: number;
  damping?: number; // 0 (raw) to 0.9 (heavy smoothing)
  enableHaptics?: boolean;
}

export function useDeviceCompass({
  magneticDeclination = 0,
  damping = 0.35,
  enableHaptics = true,
}: UseDeviceCompassOptions = {}) {
  const [orientation, setOrientation] = useState<OrientationData>({
    heading: 0,
    trueHeading: 0,
    pitch: 0,
    roll: 0,
    accuracy: null,
    hasSensor: false,
    isSimulated: false,
    permissionGranted: false,
  });

  const [needsPermissionPrompt, setNeedsPermissionPrompt] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // References for smoothing calculations
  const smoothedHeadingRef = useRef<number>(0);
  const smoothedPitchRef = useRef<number>(0);
  const smoothedRollRef = useRef<number>(0);
  const lastVibratedQuadrantRef = useRef<number | null>(null);
  const isSensorActiveRef = useRef<boolean>(false);

  // Detect iOS permission requirement
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      typeof (window as any).DeviceOrientationEvent !== 'undefined' &&
      typeof (window as any).DeviceOrientationEvent.requestPermission === 'function'
    ) {
      setNeedsPermissionPrompt(true);
    }
  }, []);

  // Request explicit permission (iOS 13+)
  const requestSensorPermission = useCallback(async () => {
    if (
      typeof (window as any).DeviceOrientationEvent !== 'undefined' &&
      typeof (window as any).DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        const response = await (window as any).DeviceOrientationEvent.requestPermission();
        if (response === 'granted') {
          setNeedsPermissionPrompt(false);
          setPermissionError(null);
          attachListeners();
          return true;
        } else {
          setPermissionError('Sensor permission denied');
          return false;
        }
      } catch (err: any) {
        setPermissionError(err.message || 'Permission request failed');
        return false;
      }
    }
    return true;
  }, []);

  // Haptic feedback trigger when passing cardinal points (0°, 90°, 180°, 270°)
  const triggerHapticIfCardinal = useCallback(
    (heading: number) => {
      if (!enableHaptics || typeof navigator === 'undefined' || !navigator.vibrate) return;
      const cardinalAngles = [0, 90, 180, 270];
      const threshold = 1.5; // degrees

      let nearCardinalIndex = -1;
      for (let i = 0; i < cardinalAngles.length; i++) {
        const diff = Math.min(
          Math.abs(heading - cardinalAngles[i]),
          Math.abs(heading - (cardinalAngles[i] + 360)),
          Math.abs(heading - (cardinalAngles[i] - 360))
        );
        if (diff <= threshold) {
          nearCardinalIndex = i;
          break;
        }
      }

      if (nearCardinalIndex !== -1 && lastVibratedQuadrantRef.current !== nearCardinalIndex) {
        try {
          // Subtle 20ms pulse for cardinal points, 40ms pulse for exact North
          navigator.vibrate(nearCardinalIndex === 0 ? 35 : 18);
        } catch {}
        lastVibratedQuadrantRef.current = nearCardinalIndex;
      } else if (nearCardinalIndex === -1) {
        lastVibratedQuadrantRef.current = null;
      }
    },
    [enableHaptics]
  );

  // Angular difference helper for smoothing without 360 wrap glitch
  const smoothAngle = (prev: number, target: number, factor: number): number => {
    let diff = (target - prev) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return (prev + diff * (1 - factor) + 360) % 360;
  };

  const attachListeners = useCallback(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      isSensorActiveRef.current = true;

      let rawHeading: number | null = null;

      // 1. iOS Safari webkitCompassHeading (0 to 360 clockwise from magnetic north)
      if (typeof (event as any).webkitCompassHeading === 'number') {
        rawHeading = (event as any).webkitCompassHeading;
      }
      // 2. Standard deviceorientation / absolute
      else if (event.alpha !== null) {
        if ((event as any).absolute || event.alpha !== null) {
          const alpha = event.alpha || 0;
          const beta = event.beta || 0;
          const gamma = event.gamma || 0;

          const degToRad = Math.PI / 180;
          const x = beta * degToRad;
          const y = gamma * degToRad;
          const z = alpha * degToRad;

          const cY = Math.cos(y);
          const sY = Math.sin(y);
          const cX = Math.cos(x);
          const sX = Math.sin(x);
          const cZ = Math.cos(z);
          const sZ = Math.sin(z);

          // Vector calculation
          const Vx = -cZ * sY - sZ * sX * cY;
          const Vy = -sZ * sY + cZ * sX * cY;

          let calculatedHeading = Math.atan2(Vx, Vy) * (180 / Math.PI);
          if (calculatedHeading < 0) calculatedHeading += 360;
          rawHeading = calculatedHeading;
        }
      }

      if (rawHeading !== null) {
        // Apply smoothing filter
        const smoothH = smoothAngle(smoothedHeadingRef.current, rawHeading, damping);
        smoothedHeadingRef.current = smoothH;

        // Pitch & Roll
        const rawPitch = event.beta ?? 0;
        const rawRoll = event.gamma ?? 0;
        smoothedPitchRef.current =
          smoothedPitchRef.current * damping + rawPitch * (1 - damping);
        smoothedRollRef.current =
          smoothedRollRef.current * damping + rawRoll * (1 - damping);

        const trueH = (smoothH + magneticDeclination + 360) % 360;

        triggerHapticIfCardinal(smoothH);

        setOrientation({
          heading: Math.round(smoothH * 10) / 10,
          trueHeading: Math.round(trueH * 10) / 10,
          pitch: Math.round(smoothedPitchRef.current * 10) / 10,
          roll: Math.round(smoothedRollRef.current * 10) / 10,
          accuracy: (event as any).webkitCompassAccuracy ?? null,
          hasSensor: true,
          isSimulated: false,
          permissionGranted: true,
        });
      }
    };

    window.addEventListener('deviceorientationabsolute' as any, handleOrientation, true);
    window.addEventListener('deviceorientation', handleOrientation, true);

    return () => {
      window.removeEventListener('deviceorientationabsolute' as any, handleOrientation, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [damping, magneticDeclination, triggerHapticIfCardinal]);

  useEffect(() => {
    if (!needsPermissionPrompt) {
      const cleanup = attachListeners();
      return cleanup;
    }
  }, [needsPermissionPrompt, attachListeners]);

  // Simulator controls for desktop / debugging / manual testing
  const setSimulatedHeading = useCallback(
    (newHeading: number) => {
      const normalized = (newHeading % 360 + 360) % 360;
      smoothedHeadingRef.current = normalized;
      const trueH = (normalized + magneticDeclination + 360) % 360;
      triggerHapticIfCardinal(normalized);

      setOrientation((prev) => ({
        ...prev,
        heading: Math.round(normalized * 10) / 10,
        trueHeading: Math.round(trueH * 10) / 10,
        isSimulated: true,
      }));
    },
    [magneticDeclination, triggerHapticIfCardinal]
  );

  const setSimulatedPitchRoll = useCallback((pitch: number, roll: number) => {
    smoothedPitchRef.current = pitch;
    smoothedRollRef.current = roll;
    setOrientation((prev) => ({
      ...prev,
      pitch: Math.round(pitch * 10) / 10,
      roll: Math.round(roll * 10) / 10,
      isSimulated: true,
    }));
  }, []);

  return {
    orientation,
    needsPermissionPrompt,
    permissionError,
    requestSensorPermission,
    setSimulatedHeading,
    setSimulatedPitchRoll,
  };
}
