"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface CategoryCardProps {
  name: string;
  Icon: React.ElementType;
  onClick?: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ name, Icon, onClick }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Navegar para busca com filtro de categoria
      navigate(`/search?category=${encodeURIComponent(name)}`);
    }
  };

  return (
    <Card
      className="flex flex-col items-center justify-center p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 bg-white h-full w-full"
      onClick={handleClick}
    >
      <div className="rounded-full mb-2 w-16 h-16 object-cover bg-indigo-50 flex items-center justify-center">
        <Icon className="w-8 h-8 text-indigo-600" />
      </div>
      <p className="text-sm font-medium text-gray-700 text-center">{name}</p>
    </Card>
  );
};

export default CategoryCard;