"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { calculateDistance } from "@/utils/geo";

export function useDriverLocationTracker(isActive: boolean, driverId: string | null) {
  const [currentLocation, setCurrentLocation] = useState<[number, number]>([0, 0]);
  const [heading, setHeading] = useState<number>(0);
  const [isTracking, setIsTracking] = useState(false);
  
  const lastUpdateCoords = useRef<[number, number] | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const compass = (e as any).webkitCompassHeading || e.alpha;
      if (compass !== null) setHeading(compass);
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientation", handleOrientation, true);
    }
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, []);

  const updateLocationInDb = useCallback(async (lat: number, lng: number) => {
    if (!driverId) return;

    if (lastUpdateCoords.current) {
      const dist = calculateDistance(
        lastUpdateCoords.current[0], 
        lastUpdateCoords.current[1], 
        lat, 
        lng
      );
      if (dist < 0.01) return; 
    }
    
    lastUpdateCoords.current = [lat, lng];

    await supabase
      .from('driver_locations')
      .upsert({
        driver_id: driverId,
        latitude: lat,
        longitude: lng,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'driver_id' });
      
  }, [driverId]);

  useEffect(() => {
    if (!isActive || !driverId || localStorage.getItem('driver_location_permission') !== 'granted') {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      setIsTracking(false);
      return;
    }

    setIsTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation([latitude, longitude]);
        updateLocationInDb(latitude, longitude);
      },
      (err) => console.error("[GPS] Erro:", err),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [isActive, driverId, updateLocationInDb]);

  return { currentLocation, heading, isTracking };
}