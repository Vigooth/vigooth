import { useCallback, useEffect, useState } from 'react';

type GeolocationStatus = 'idle' | 'locating' | 'located' | 'denied' | 'unavailable';

interface Position {
  lat: number;
  lon: number;
}

/**
 * The device's position, requested on `locate()`. When the permission was
 * already granted, it is located right away without prompting.
 */
export function useGeolocation() {
  const [position, setPosition] = useState<Position | null>(null);
  const [status, setStatus] = useState<GeolocationStatus>('idle');

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ lat: coords.latitude, lon: coords.longitude });
        setStatus('located');
      },
      (error) => setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { maximumAge: 10 * 60 * 1000 },
    );
  }, []);

  useEffect(() => {
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((permission) => {
        if (permission.state === 'granted') locate();
      })
      .catch(() => {});
  }, [locate]);

  return { position, status, locate };
}
