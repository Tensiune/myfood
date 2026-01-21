"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearch?: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ placeholder = "Buscar restaurantes ou pratos...", value, onChange, onSearch }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onSearch) {
      onSearch();
    }
  };

  return (
    <div className="relative">
      <Input
        type="text"
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-3 rounded-full border-2 border-indigo-200 focus:border-brand-accent focus:ring-brand-accent shadow-sm text-base transition-all duration-200"
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
      />
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
    </div>
  );
};

export default SearchBar;