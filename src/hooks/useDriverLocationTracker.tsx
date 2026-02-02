"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { calculateDistance } from "@/utils/geo";
import { showError } from "@/utils/toast";

export function useDriverLocationTracker(isActive: boolean) {
  const [currentLocation, setCurrentLocation] = useState<[number, number]>([0, 0]);
  const [heading, setHeading] = useState<number>(0);
  const [isTracking, setIsTracking] = useState(false);
  const [driverId, setDriverId] = useState<string | null>(null);
  
  const lastUpdateCoords = useRef<[number, number] | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setDriverId(user?.id || null);
    };
    fetchUser();

    // Listener para bússola/direção do dispositivo
    const handleOrientation = (e: DeviceOrientationEvent) => {
      // webkitCompassHeading é específico para iOS (mais preciso)
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

    // Lógica de economia de bateria: Só envia se moveu mais de 10 metros (0.01 km)
    if (lastUpdateCoords.current) {
      const dist = calculateDistance(
        lastUpdateCoords.current[0], 
        lastUpdateCoords.current[1], 
        lat, 
        lng
      );
      if (dist < 0.01) return; // Menos de 10 metros, ignora o upload
    }
    
    lastUpdateCoords.current = [lat, lng];

    const { error } = await supabase
      .from('driver_locations')
      .upsert({
        driver_id: driverId,
        latitude: lat,
        longitude: lng,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'driver_id' });
      
    if (error) console.error("[GPS] Erro DB:", error);
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
      (err) => console.error(err),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [isActive, driverId, updateLocationInDb]);

  return { currentLocation, heading, isTracking };
}