"use client";

import React from "react";
import { Card } from "@/components/ui/card";

interface CategoryCardProps {
  name: string;
  imageUrl: string;
  onClick: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ name, imageUrl, onClick }) => {
  return (
    <Card
      className="flex flex-col items-center justify-center p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border-none bg-white h-full w-full"
      onClick={onClick}
    >
      <img src={imageUrl} alt={name} className="rounded-full mb-2 w-16 h-16 object-cover" />
      <p className="text-sm font-medium text-gray-700 text-center">{name}</p>
    </Card>
  );
};

export default CategoryCard;