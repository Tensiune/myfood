import React from "react";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

const SearchPage = () => {
  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-4xl font-bold text-indigo-800 text-center">Buscar Estabelecimentos</h1>
      
      <div className="flex items-center space-x-2">
        <div className="relative flex-grow">
          <Input
            type="text"
            placeholder="Buscar por nome, categoria..."
            className="w-full pl-10 pr-4 py-2 rounded-full border-2 border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400 shadow-sm"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        </div>
        <Button variant="outline" size="icon" className="rounded-full border-indigo-200 text-indigo-600 hover:bg-indigo-50">
          <Filter className="h-5 w-5" />
        </Button>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-indigo-700">Resultados da Busca</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border-none bg-white">
            <img src="https://via.placeholder.com/300x150" alt="Restaurante A" className="rounded-t-xl w-full h-32 object-cover" />
            <CardContent className="p-4">
              <CardTitle className="text-lg font-semibold text-gray-800">Restaurante Sabor</CardTitle>
              <p className="text-sm text-gray-600">Culinária Brasileira</p>
              <div className="flex items-center text-sm text-gray-500 mt-2">
                <span>⭐ 4.5</span>
                <span className="ml-4">🕒 30-45 min</span>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border-none bg-white">
            <img src="https://via.placeholder.com/300x150" alt="Restaurante B" className="rounded-t-xl w-full h-32 object-cover" />
            <CardContent className="p-4">
              <CardTitle className="text-lg font-semibold text-gray-800">Pizzaria Delícia</CardTitle>
              <p className="text-sm text-gray-600">Pizzas e Massas</p>
              <div className="flex items-center text-sm text-gray-500 mt-2">
                <span>⭐ 4.8</span>
                <span className="ml-4">🕒 20-35 min</span>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border-none bg-white">
            <img src="https://via.placeholder.com/300x150" alt="Mercado Fresco" className="rounded-t-xl w-full h-32 object-cover" />
            <CardContent className="p-4">
              <CardTitle className="text-lg font-semibold text-gray-800">Mercado Fresco</CardTitle>
              <p className="text-sm text-gray-600">Supermercado</p>
              <div className="flex items-center text-sm text-gray-500 mt-2">
                <span>⭐ 4.2</span>
                <span className="ml-4">🕒 40-60 min</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default SearchPage;