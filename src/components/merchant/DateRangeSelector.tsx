"use client";

import React, { useMemo } from "react";
import { DateRange } from "react-day-picker";
import { subDays, startOfMonth, endOfMonth, subMonths, startOfDay } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { Calendar } from "lucide-react";

interface DateRangeSelectorProps {
  dateFilter: string;
  setDateFilter: (value: string) => void;
  customDateRange: DateRange | undefined;
  setCustomDateRange: (date: DateRange | undefined) => void;
  calculatedDateRange: DateRange | undefined;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  dateFilter,
  setDateFilter,
  customDateRange,
  setCustomDateRange,
  calculatedDateRange,
}) => {
  const today = startOfDay(new Date());

  const handleDateFilterChange = (value: string) => {
    setDateFilter(value);
    if (value === '7d') {
      setCustomDateRange({ from: subDays(today, 7), to: today });
    } else if (value === 'thisMonth') {
      setCustomDateRange({ from: startOfMonth(today), to: today });
    } else if (value === 'lastMonth') {
      const lastMonthStart = startOfMonth(subMonths(today, 1));
      const lastMonthEnd = endOfMonth(subMonths(today, 1));
      setCustomDateRange({ from: lastMonthStart, to: lastMonthEnd });
    } else if (value !== 'custom') {
      setCustomDateRange(undefined);
    }
  };

  const displayValue = useMemo(() => {
    switch (dateFilter) {
      case '7d': return 'Últimos 7 dias';
      case 'thisMonth': return 'Este Mês';
      case 'lastMonth': return 'Mês Anterior';
      case 'custom': return 'Período Personalizado';
      default: return 'Selecione o Período';
    }
  }, [dateFilter]);

  return (
    <div className="flex flex-col gap-2">
      <Select value={dateFilter} onValueChange={handleDateFilterChange}>
        <SelectTrigger className="w-full rounded-xl bg-white border-gray-200 shadow-sm h-12">
          <Calendar className="h-4 w-4 mr-2 text-indigo-500" />
          <SelectValue placeholder={displayValue} />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          <SelectItem value="7d">Últimos 7 dias</SelectItem>
          <SelectItem value="thisMonth">Este Mês</SelectItem>
          <SelectItem value="lastMonth">Mês Anterior</SelectItem>
          <SelectItem value="custom">Período Personalizado...</SelectItem>
        </SelectContent>
      </Select>
      
      {dateFilter === 'custom' && (
        <DateRangePicker date={customDateRange} setDate={setCustomDateRange} className="w-full" />
      )}
    </div>
  );
};

export default DateRangeSelector;