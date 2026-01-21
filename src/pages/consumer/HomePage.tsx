import React from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const HomePage = () => {
  return (
    <div className="space-y-6 pb-20"> {/* Added padding-bottom to account for fixed bottom nav */}
      <h1 className="text-4xl font-bold text-indigo-800 text-center">O que você quer pedir hoje?</h1>
      
      <div className="relative">
        <Input
          type="text"
          placeholder="Buscar restaurantes ou pratos..."
          className="w-full pl-10 pr-4 py-2 rounded-full border-2 border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400 shadow-sm"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-indigo-700">Categorias</h2>
        <div className="grid grid-cols-3 gap-4">
          <Card className="flex flex-col items-center justify-center p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border-none bg-white">
            <img src="https://via.placeholder.com/60" alt="Restaurantes" className="rounded-full mb-2" />
            <p className="text-sm font-medium text-gray-700">Restaurantes</p>
          </Card>
          <Card className="flex flex-col items-center justify-center p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border-none bg-white">
            <img src="https://via.placeholder.com/60" alt="Mercados" className="rounded-full mb-2" />
            <p className="text-sm font-medium text-gray-700">Mercados</p>
          </Card>
          <Card className="flex flex-col items-center justify-center p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border-none bg-white">
            <img src="https://via.placeholder.com/60" alt="Padarias" className="rounded-full mb-2" />
            <p className="text-sm font-medium text-gray-700">Padarias</p>
          </Card>
          {/* Add more categories */}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-indigo-700">Estabelecimentos em Destaque</h2>
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
        </div>
      </section>
      <MadeWithDyad />
    </div>
  );
};

export default HomePage;