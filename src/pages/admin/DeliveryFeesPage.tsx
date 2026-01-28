"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bike, Car, Truck, Save, Loader2, Info } from "lucide-react";
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

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('delivery_fee_settings').select('*');
    if (error) showError("Erro ao carregar configurações.");
    else setSettings(data || []);
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
      for (const setting of settings) {
        const { error } = await supabase
          .from('delivery_fee_settings')
          .upsert({
            vehicle_type: setting.vehicle_type,
            fees_json: setting.fees_json,
            extra_fee_per_km: setting.extra_fee_per_km,
            updated_at: new Date().toISOString()
          });
        if (error) throw error;
      }
      showSuccess("Taxas de entrega atualizadas!");
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
          <h1 className="text-3xl font-black text-indigo-900">Taxas de Entrega</h1>
          <p className="text-gray-500">Defina os valores que os entregadores recebem por distância.</p>
        </div>
        <Button onClick={saveAll} disabled={saving} className="bg-brand-accent hover:bg-brand-accent/90 text-white rounded-xl h-12 px-8">
          {saving ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5 mr-2" />}
          Salvar Tudo
        </Button>
      </div>

      <Tabs defaultValue="moto" className="w-full">
        <TabsList className="bg-white p-1 rounded-2xl shadow-sm mb-8 border border-gray-100 h-auto flex-wrap">
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
              <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-indigo-50/50 p-8">
                  <CardTitle className="flex items-center gap-2 text-indigo-900">
                    <Info className="h-5 w-5" /> Tabela de Distâncias (KM)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    {setting.fees_json.map((fee: number, i: number) => (
                      <div key={i} className="space-y-2">
                        <Label className="text-[10px] font-black text-gray-400 uppercase">
                          {i === 15 ? "14 a 15 km" : `${i} a ${i + 1} km`}
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">R$</span>
                          <Input 
                            type="number" 
                            value={fee} 
                            onChange={(e) => handleUpdateFee(v.id, i, e.target.value)}
                            className="pl-8 rounded-xl font-bold h-12"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-10 pt-8 border-t border-gray-100">
                    <div className="max-w-xs space-y-2">
                      <Label className="font-black text-indigo-900 uppercase text-xs">Adicional por KM (Acima de 15km)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">R$</span>
                        <Input 
                          type="number" 
                          value={setting.extra_fee_per_km} 
                          onChange={(e) => handleUpdateExtra(v.id, e.target.value)}
                          className="pl-8 rounded-xl font-bold h-12"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default DeliveryFeesPage;