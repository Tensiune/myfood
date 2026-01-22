import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Store, Bike, ArrowRight } from "lucide-react";

const RegisterPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100 p-4">
      <Card className="w-full max-w-md rounded-xl shadow-lg border-none">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold text-indigo-800">Cadastre-se</CardTitle>
          <CardDescription className="text-gray-600">Escolha como você quer usar o FoodApp.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <Link to="/consumer-register">
            <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl border border-indigo-200 hover:bg-indigo-100 transition-colors">
              <div className="flex items-center gap-4">
                <User className="h-6 w-6 text-indigo-600" />
                <span className="font-bold text-gray-800">Sou Consumidor</span>
              </div>
              <ArrowRight className="h-5 w-5 text-indigo-600" />
            </div>
          </Link>

          <Link to="/merchant-register">
            <div className="flex items-center justify-between p-4 bg-brand-accent/10 rounded-xl border border-brand-accent/50 hover:bg-brand-accent/20 transition-colors">
              <div className="flex items-center gap-4">
                <Store className="h-6 w-6 text-brand-accent" />
                <span className="font-bold text-gray-800">Sou Lojista/Parceiro</span>
              </div>
              <ArrowRight className="h-5 w-5 text-brand-accent" />
            </div>
          </Link>

          <Link to="/driver-register">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors">
              <div className="flex items-center gap-4">
                <Bike className="h-6 w-6 text-blue-600" />
                <span className="font-bold text-gray-800">Sou Entregador</span>
              </div>
              <ArrowRight className="h-5 w-5 text-blue-600" />
            </div>
          </Link>

          <div className="text-center text-sm text-gray-600 pt-4">
            Já tem uma conta?{" "}
            <Link to="/login" className="underline text-indigo-600 hover:text-indigo-800">
              Entrar
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;