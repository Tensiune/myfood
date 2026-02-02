"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { showError } from "@/utils/toast";

export function useDriverLocationTracker(isActive: boolean) {
  const [currentLocation, setCurrentLocation] = useState<[number, number]>([0, 0]);
  const [isTracking, setIsTracking] = useState(false);
  const [driverId, setDriverId] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

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
      }, {
        onConflict: 'driver_id'
      });
      
    if (error) {
      console.error("[useDriverLocationTracker] Erro ao atualizar banco:", error);
    }
  }, [driverId]);

  useEffect(() => {
    // Só inicia se estiver ativo, tiver ID do motorista e permissão local concedida
    if (!isActive || !driverId || localStorage.getItem('driver_location_permission') !== 'granted') {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTracking(false);
      setCurrentLocation([0, 0]);
      return;
    }

    if (!("geolocation" in navigator)) {
      showError("Seu navegador não suporta geolocalização.");
      return;
    }

    setIsTracking(true);

    // Inicia o monitoramento contínuo do GPS
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation([latitude, longitude]);
        updateLocationInDb(latitude, longitude);
      },
      (error) => {
        console.error("[GPS Error]", error);
        if (error.code === 1) {
          showError("Permissão de localização negada pelo sistema.");
        }
      },
      {
        enableHighAccuracy: true, // Força uso do GPS (mais preciso)
        maximumAge: 1000,         // Cache de no máximo 1 segundo
        timeout: 10000            // Tempo limite de 10 segundos para obter sinal
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      setIsTracking(false);
    };
  }, [isActive, driverId, updateLocationInDb]);

  return { currentLocation, isTracking };
}