import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/utils/toast";

// Coordenadas de simulação (próximas ao centro de SP, usadas para testes de distância)
// ATUALIZADO para a localização solicitada pelo usuário: -22.119707, -51.428802
const FIXED_MOCK_LOCATION: [number, number] = [-22.119707, -51.428802];

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
    
    // console.log(`[DriverTracker] Attempting DB update for ${driverId}: ${lat}, ${lng}`);
    // Removed excessive log
    
    const { error } = await supabase
      .from('driver_locations')
      .upsert({
        driver_id: driverId,
        latitude: lat,
        longitude: lng,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'driver_id'
      });
      
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
    
    const initialUpdate = () => {
      const [lat, lng] = FIXED_MOCK_LOCATION;
      setCurrentLocation([lat, lng]);
      updateLocationInDb(lat, lng);
    };

    // 1. Executa a primeira atualização imediatamente (síncrona)
    initialUpdate();
    
    // 2. Simula location updates a cada 5 segundos
    const interval = setInterval(initialUpdate, 5000);
    
    return () => {
      clearInterval(interval);
      setIsTracking(false);
    };
  }, [isActive, driverId, updateLocationInDb]);

  return { currentLocation, isTracking };
}