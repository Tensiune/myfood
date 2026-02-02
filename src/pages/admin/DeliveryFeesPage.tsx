"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bike, Car, Truck, Save, Loader2, Info, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/utils/toast";

const VEHICLES = [
  { id: "moto", label: "Moto", icon: Bike },
  { id: "car", label: "Carro", icon: Car },
  { id: "scooter", label: "Patinete", icon: Truck },
  { id: "bike", label: "Bicicleta", icon: Bike },
];

const DeliveryFeesPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any[]>([]);
  const [offerTimeout, setOfferTimeout] = useState(30);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data: fees } = await supabase.from('delivery_fee_settings').select('*');
    const { data: timeout } = await supabase.from('app_settings').select('*').eq('key', 'driver_offer_timeout').single();
    
    if (fees) setSettings(fees);
    if (timeout) setOfferTimeout(timeout.value.seconds);
    
    setLoading(false);
  };

  const handleUpdateFee = (vehicleId: string, index: number, value: string) => {
    setSettings(prev => prev.map(s => {
      if (s.vehicle_type === vehicleId) {
        const newFees = [...s.fees_json];
        newFees[index] = parseFloat(value) || 0;
        return { ...s, fees_json: newFees };
      }
      return s;
    }));
  };

  const handleUpdateExtra = (vehicleId: string, value: string) => {
    setSettings(prev => prev.map(s => {
      if (s.vehicle_type === vehicleId) {
        return { ...s, extra_fee_per_km: parseFloat(value) || 0 };
      }
      return s;
    }));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      // Salvar taxas
      for (const setting of settings) {
        await supabase.from('delivery_fee_settings').upsert({
          vehicle_type: setting.vehicle_type,
          fees_json: setting.fees_json,
          extra_fee_per_km: setting.extra_fee_per_km,
          updated_at: new Date().toISOString()
        });
      }

      // Salvar Timeout
      await supabase.from('app_settings').upsert({
        key: 'driver_offer_timeout',
        value: { seconds: offerTimeout },
        updated_at: new Date().toISOString()
      });

      showSuccess("Configurações atualizadas!");
    } catch (err: any) {
      showError("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-indigo-600" /></div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-indigo-900">Configurações de Logística</h1>
          <p className="text-gray-500">Gestão de taxas e tempos de resposta.</p>
        </div>
        <Button onClick={saveAll} disabled={saving} className="bg-brand-accent hover:bg-brand-accent/90 text-white rounded-xl h-12 px-8 shadow-lg">
          {saving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5 mr-2" />}
          Salvar Tudo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 rounded-[2rem] border-none shadow-sm bg-indigo-900 text-white p-6">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-indigo-300" />
              <h3 className="font-bold">Tempo de Oferta</h3>
            </div>
            <p className="text-xs text-indigo-200 mb-6">Quanto tempo o entregador tem para aceitar um pedido antes de buscarmos o próximo.</p>
            <div className="mt-auto">
              <Label className="text-[10px] font-black uppercase text-indigo-300">Segundos</Label>
              <Input 
                type="number" 
                value={offerTimeout} 
                onChange={(e) => setOfferTimeout(parseInt(e.target.value) || 30)}
                className="bg-white/10 border-white/20 text-white text-2xl font-black h-14 rounded-2xl focus:ring-brand-accent"
              />
            </div>
          </div>
        </Card>

        <div className="md:col-span-2">
          <Tabs defaultValue="moto" className="w-full">
            <TabsList className="bg-white p-1 rounded-2xl shadow-sm mb-6 border border-gray-100 h-auto flex-wrap">
              {VEHICLES.map(v => (
                <TabsTrigger key={v.id} value={v.id} className="rounded-xl px-6 py-3 font-bold data-[state=active]:bg-indigo-600 data-[state=active]:text-white capitalize">
                  <v.icon className="h-4 w-4 mr-2" /> {v.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {VEHICLES.map(v => {
              const setting = settings.find(s => s.vehicle_type === v.id) || { fees_json: new Array(16).fill(0), extra_fee_per_km: 0 };
              return (
                <TabsContent key={v.id} value={v.id}>
                  <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden bg-white">
                    <CardContent className="p-8">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {setting.fees_json.map((fee: number, i: number) => (
                          <div key={i} className="space-y-1">
                            <Label className="text-[9px] font-black text-gray-400 uppercase">{i} a {i + 1} km</Label>
                            <Input 
                              type="number" 
                              value={fee} 
                              onChange={(e) => handleUpdateFee(v.id, i, e.target.value)}
                              className="rounded-xl font-bold h-10 border-gray-100"
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default DeliveryFeesPage;