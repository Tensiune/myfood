"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Clock } from "lucide-react";

export interface TimeWindow {
  id: string;
  open: string;
  close: string;
}

export interface DayHours {
  closed: boolean;
  windows: TimeWindow[];
}

interface BusinessHoursManagerProps {
  hours: Record<string, DayHours>;
  onChange: (hours: Record<string, DayHours>) => void;
}

const dayNames: Record<string, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo"
};

const BusinessHoursManager: React.FC<BusinessHoursManagerProps> = ({ hours, onChange }) => {
  const toggleDayClosed = (day: string) => {
    const newHours = { ...hours };
    newHours[day] = {
      ...newHours[day],
      closed: !newHours[day].closed,
      // Se estiver abrindo e não tiver janelas, adiciona uma padrão
      windows: !newHours[day].closed === false && newHours[day].windows.length === 0 
        ? [{ id: Date.now().toString(), open: "08:00", close: "18:00" }] 
        : newHours[day].windows
    };
    onChange(newHours);
  };

  const addWindow = (day: string) => {
    const newHours = { ...hours };
    newHours[day].windows.push({
      id: Date.now().toString(),
      open: "08:00",
      close: "18:00"
    });
    onChange(newHours);
  };

  const removeWindow = (day: string, windowId: string) => {
    const newHours = { ...hours };
    newHours[day].windows = newHours[day].windows.filter(w => w.id !== windowId);
    // Se removeu todas as janelas, marca como fechado
    if (newHours[day].windows.length === 0) {
      newHours[day].closed = true;
    }
    onChange(newHours);
  };

  const updateWindow = (day: string, windowId: string, field: "open" | "close", value: string) => {
    const newHours = { ...hours };
    newHours[day].windows = newHours[day].windows.map(w => 
      w.id === windowId ? { ...w, [field]: value } : w
    );
    onChange(newHours);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.entries(dayNames).map(([day, label]) => (
        <div key={day} className="border border-gray-200 rounded-2xl p-4 bg-white shadow-sm space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-indigo-900">{label}</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Aberto</span>
              <Switch
                checked={!hours[day].closed}
                onCheckedChange={() => toggleDayClosed(day)}
                className="data-[state=checked]:bg-green-500"
              />
            </div>
          </div>

          {!hours[day].closed ? (
            <div className="space-y-3">
              {hours[day].windows.map((window, index) => (
                <div key={window.id} className="flex items-end gap-2 animate-in fade-in slide-in-from-top-1">
                  <div className="flex-1">
                    {index === 0 && <Label className="text-[10px] text-gray-400 font-bold uppercase">Abertura</Label>}
                    <Input
                      type="time"
                      value={window.open}
                      onChange={(e) => updateWindow(day, window.id, "open", e.target.value)}
                      className="rounded-xl h-10"
                    />
                  </div>
                  <div className="flex-1">
                    {index === 0 && <Label className="text-[10px] text-gray-400 font-bold uppercase">Fechamento</Label>}
                    <Input
                      type="time"
                      value={window.close}
                      onChange={(e) => updateWindow(day, window.id, "close", e.target.value)}
                      className="rounded-xl h-10"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeWindow(day, window.id)}
                    className="h-10 w-10 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addWindow(day)}
                className="w-full rounded-xl border-dashed border-2 border-indigo-100 text-indigo-600 font-bold text-xs h-9 hover:bg-indigo-50"
              >
                <Plus className="h-3 w-3 mr-1" /> Adicionar Intervalo
              </Button>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl py-6 flex flex-col items-center justify-center border-2 border-dashed border-gray-100">
              <Clock className="h-5 w-5 text-gray-200 mb-1" />
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Fechado o dia todo</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default BusinessHoursManager;