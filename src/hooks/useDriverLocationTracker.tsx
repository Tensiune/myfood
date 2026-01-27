"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/utils/toast";

// Mock location data for simulation purposes (simulating movement)
const MOCK_LOCATIONS = [
  [-23.5505, -46.6333], // São Paulo center
  [-23.5510, -46.6340],
  [-23.5515, -46.6347],
  [-23.5520, -46.6354],
  [-23.5525, -46.6361],
  [-23.5530, -46.6368],
  [-23.5535, -46.6375],
  [-23.5540, -46.6382],
];

// This hook simulates the background tracking required for drivers.
// In a real Capacitor app, this would integrate with a native plugin.
export function useDriverLocationTracker(isActive: boolean) {
  // Inicializa com [0, 0] para forçar a espera pela primeira localização real/simulada
  const [currentLocation, setCurrentLocation] = useState<[number, number]>([0, 0]);
  const [isTracking, setIsTracking] = useState(false);
  const [driverId, setDriverId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setDriverId(user?.id || null);
    };
    fetchUser();
  }, []);

  const updateLocationInDb = useCallback(async (lat: number, lng: number) => {
    if (!driverId) return;

    const { error } = await supabase
      .from('driver_locations')
      .upsert({
        driver_id: driverId,
        latitude: lat,
        longitude: lng,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'driver_id' });

    if (error) {
      console.error("[useDriverLocationTracker] Failed to update location:", error);
    }
  }, [driverId]);

  useEffect(() => {
    if (!isActive || !driverId || localStorage.getItem('driver_location_permission') !== 'granted') {
      setIsTracking(false);
      // Se desativado, volta para o fallback inicial
      setCurrentLocation([0, 0]);
      return;
    }

    setIsTracking(true);
    let mockIndex = 0;
    
    // Dispara a primeira atualização imediatamente
    const initialUpdate = () => {
      const [lat, lng] = MOCK_LOCATIONS[mockIndex % MOCK_LOCATIONS.length];
      setCurrentLocation([lat, lng]);
      updateLocationInDb(lat, lng);
      mockIndex++;
    };
    
    initialUpdate();

    // Simula location updates every 5 seconds
    const interval = setInterval(initialUpdate, 5000);

    return () => {
      clearInterval(interval);
      setIsTracking(false);
    };
  }, [isActive, driverId, updateLocationInDb]);

  return { currentLocation, isTracking };
}