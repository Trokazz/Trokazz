import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  className?: string;
  size?: 'small' | 'default' | 'large';
  onRatingChange?: (newRating: number) => void; // New prop for interactivity
}

const StarRating: React.FC<StarRatingProps> = ({ rating, maxRating = 5, className, size = 'default', onRatingChange }) => {
  const sizeClasses = {
    small: 'h-3 w-3',
    default: 'h-3.5 w-3.5',
    large: 'h-5 w-5',
  };

  const handleStarClick = (index: number) => {
    if (onRatingChange) {
      onRatingChange(index + 1);
    }
  };

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {[...Array(maxRating)].map((_, index) => (
        <Star
          key={index}
          className={cn(
            sizeClasses[size],
            index < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300',
            onRatingChange && 'cursor-pointer' // Add cursor pointer if interactive
          )}
          onClick={() => handleStarClick(index)}
        />
      ))}
    </div>
  );
};

export default StarRating;