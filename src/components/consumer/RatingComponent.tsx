"use client";

import React, { useState } from "react";
import { Star, StarHalf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface RatingComponentProps {
  ratingValue: number;
  onRatingChange: (rating: number) => void;
  commentValue: string;
  onCommentChange: (comment: string) => void;
  readOnly?: boolean;
  showComment?: boolean;
}

const RatingComponent: React.FC<RatingComponentProps> = ({
  ratingValue,
  onRatingChange,
  commentValue,
  onCommentChange,
  readOnly = false,
  showComment = true,
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const handleRatingClick = (selectedRating: number) => {
    if (!readOnly) {
      onRatingChange(selectedRating);
    }
  };

  const renderStars = () => {
    const stars = [];
    const currentRating = hoverRating || ratingValue;
    
    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= currentRating;
      
      stars.push(
        <div 
          key={i}
          className="relative"
          onMouseEnter={() => !readOnly && setHoverRating(i)}
          onMouseLeave={() => !readOnly && setHoverRating(0)}
          onClick={() => handleRatingClick(i)}
        >
          <Star
            className={cn(
              "h-6 w-6 transition-colors",
              readOnly ? "text-yellow-400" : "text-gray-300 cursor-pointer hover:text-yellow-500",
              isFilled && "text-yellow-500 fill-yellow-500"
            )}
            fill={isFilled ? "currentColor" : "none"}
          />
          {/* Half star logic is complex with Lucide, simplifying to full stars for cleaner UX/code */}
        </div>
      );
    }
    return stars;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-1">
        {renderStars()}
        <span className="ml-2 text-lg font-black text-indigo-900">
          {ratingValue.toFixed(1)}
        </span>
      </div>

      {showComment && !readOnly && (
        <div className="space-y-3">
          <Textarea
            placeholder="Deixe um comentário sobre sua experiência (opcional)..."
            value={commentValue}
            onChange={(e) => onCommentChange(e.target.value)}
            className="min-h-[80px] rounded-xl border-gray-200"
          />
        </div>
      )}
    </div>
  );
};

export default RatingComponent;