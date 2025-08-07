import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import * as Icons from "lucide-react";

export type ReputationBadgeType = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

interface ReputationBadgeProps {
  badge: ReputationBadgeType;
}

const ReputationBadge = ({ badge }: ReputationBadgeProps) => {
  const Icon = (Icons as any)[badge.icon] || Icons.HelpCircle;

  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge variant="secondary" className="flex items-center gap-1.5 py-1 px-2 border-transparent bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
          <Icon className="h-4 w-4" />
          <span className="font-semibold">{badge.name}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{badge.description}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default ReputationBadge;