import React from 'react';
import { Icon } from '@/components/IconMapper';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BadgeDetail {
  id: string;
  name: string;
  description: string;
  icon: string;
  awarded_at: string;
}

interface BadgeDisplayProps {
  badges: BadgeDetail[];
  className?: string;
}

const BadgeDisplay: React.FC<BadgeDisplayProps> = ({ badges, className }) => {
  if (!badges || badges.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {badges.map((badge) => (
        <TooltipProvider key={badge.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1 text-xs">
                <Icon name={badge.icon} className="h-3 w-3" />
                {badge.name}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold">{badge.name}</p>
              <p className="text-sm">{badge.description}</p>
              <p className="text-xs text-muted-foreground mt-1">Conquistado em: {format(new Date(badge.awarded_at), 'dd/MM/yyyy', { locale: ptBR })}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
};

export default BadgeDisplay;