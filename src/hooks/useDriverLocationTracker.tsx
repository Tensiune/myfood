"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/utils/toast";

// Coordenadas de simulação (próximas ao centro de SP, usadas para testes de distância)
// Estas coordenadas simulam o movimento do entregador quando ele está "Online".
const MOCK_LOCATIONS = [
  [-23.5505, -46.6333], // Ponto 1 (Perto da loja mockada)
  [-23.5515, -46.6343], // Ponto 2
  [-23.5495, -46.6323], // Ponto 3
  [-23.5505, -46.6353], // Ponto 4
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
    
    console.log(`[DriverTracker] Attempting DB update for ${driverId}: ${lat}, ${lng}`); // Added log

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