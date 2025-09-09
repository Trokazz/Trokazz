"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ReviewSellerButtonProps {
  to: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const ReviewSellerButton: React.FC<ReviewSellerButtonProps> = ({ to, children, onClick, disabled, className }) => {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors",
        "h-10 px-4 py-2 bg-white border border-gray-300 text-foreground hover:bg-gray-100",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      aria-disabled={disabled}
    >
      {children}
    </Link>
  );
};

export default ReviewSellerButton;