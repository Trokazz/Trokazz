import { Avatar as ShadcnAvatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import React from "react";

interface CustomAvatarProps {
  src?: string | null;
  alt?: string;
  fallback: string;
  className?: string;
}

const Avatar: React.FC<CustomAvatarProps> = ({ src, alt, fallback, className }) => {
  return (
    <ShadcnAvatar className={className}>
      <AvatarImage src={src || undefined} alt={alt} loading="lazy" />
      <AvatarFallback>{fallback}</AvatarFallback>
    </ShadcnAvatar>
  );
};

export default Avatar;