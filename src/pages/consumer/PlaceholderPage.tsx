"use client";

import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  message?: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, message }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-50 p-4 text-center">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full space-y-6">
        <h1 className="text-4xl font-bold text-indigo-800">{title}</h1>
        <p className="text-lg text-gray-600">
          {message || "Esta página está em construção. Volte em breve para mais novidades!"}
        </p>
        <Link to="/profile">
          <Button className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6">
            <ArrowLeft className="h-5 w-5 mr-2" /> Voltar para o Perfil
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default PlaceholderPage;