"use client";

import React, { useState } from "react";
import { Star, StarHalf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showError } from "@/utils/toast";

interface RatingComponentProps {
  initialRating?: number;
  onRatingSubmit?: (rating: number, comment?: string) => void;
  readOnly?: boolean;
}

const RatingComponent: React.FC<RatingComponentProps> = ({
  initialRating = 0,
  onRatingSubmit,
  readOnly = false,
}) => {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleRatingClick = (selectedRating: number) => {
    if (!readOnly) {
      setRating(selectedRating);
    }
  };

  const handleSubmit = async () => {
    if (readOnly) return;

    if (rating === 0) {
      showError("Por favor, selecione uma avaliação.");
      return;
    }

    setSubmitting(true);
    try {
      await onRatingSubmit?.(rating, comment);
      showSuccess("Avaliação enviada com sucesso!");
    } catch (error) {
      showError("Erro ao enviar avaliação.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= (hoverRating || rating)) {
        stars.push(
          <Star
            key={i}
            className={`h-6 w-6 cursor-pointer ${
              readOnly ? "text-yellow-400" : "text-yellow-500 hover:text-yellow-600"
            }`}
            fill={readOnly ? "currentColor" : "none"}
            onClick={() => handleRatingClick(i)}
            onMouseEnter={() => !readOnly && setHoverRating(i)}
            onMouseLeave={() => !readOnly && setHoverRating(0)}
          />
        );
      } else if (i - 0.5 === (hoverRating || rating)) {
        stars.push(
          <StarHalf
            key={i}
            className={`h-6 w-6 cursor-pointer ${
              readOnly ? "text-yellow-400" : "text-yellow-500 hover:text-yellow-600"
            }`}
            fill={readOnly ? "currentColor" : "none"}
            onClick={() => handleRatingClick(i - 0.5)}
            onMouseEnter={() => !readOnly && setHoverRating(i - 0.5)}
            onMouseLeave={() => !readOnly && setHoverRating(0)}
          />
        );
      } else {
        stars.push(
          <Star
            key={i}
            className={`h-6 w-6 cursor-pointer ${
              readOnly ? "text-gray-300" : "text-gray-300 hover:text-yellow-500"
            }`}
            fill="none"
            onClick={() => handleRatingClick(i)}
            onMouseEnter={() => !readOnly && setHoverRating(i)}
            onMouseLeave={() => !readOnly && setHoverRating(0)}
          />
        );
      }
    }
    return stars;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-1">
        {renderStars()}
        <span className="ml-2 text-lg font-medium text-gray-700">
          {rating.toFixed(1)}
        </span>
      </div>

      {!readOnly && (
        <div className="space-y-3">
          <Textarea
            placeholder="Deixe um comentário sobre sua experiência..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[100px]"
          />
          <Button
            className="rounded-lg bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Enviando..." : "Enviar Avaliação"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default RatingComponent;