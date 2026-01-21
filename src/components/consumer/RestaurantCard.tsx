"use client";

import React from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Star, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface RestaurantCardProps {
  id?: string;
  name: string;
  cuisine: string;
  imageUrl: string;
  rating: number;
  deliveryTime: string;
  onClick?: () => void;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({
  id,
  name,
  cuisine,
  imageUrl,
  rating,
  deliveryTime,
  onClick,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (id) {
      navigate(`/restaurant/${id}`);
    }
  };

  return (
    <Card
      className="rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer border border-gray-200 bg-white overflow-hidden"
      onClick={handleClick}
    >
      <img src={imageUrl} alt={name} className="rounded-t-xl w-full h-40 object-cover" />
      <CardContent className="p-4">
        <CardTitle className="text-lg font-semibold text-gray-800 mb-1">{name}</CardTitle>
        <p className="text-sm text-gray-600 mb-3">{cuisine}</p>
        <div className="flex items-center text-sm text-gray-500 space-x-4">
          <div className="flex items-center">
            <Star className="h-4 w-4 mr-1 text-yellow-500 fill-yellow-500" /> {rating.toFixed(1)}
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1 text-indigo-500" /> {deliveryTime}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RestaurantCard;