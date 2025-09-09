import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/utils/formatters"; // Importando formatPrice

interface UserAdListItemProps {
  id: string;
  title: string;
  description: string;
  price: number | string; // Alterado para aceitar number ou string
  imageUrl: string;
  status: 'approved' | 'pending_approval' | 'sold' | 'rejected';
}

const statusConfig: { [key: string]: { text: string; className: string } } = {
  approved: {
    text: "Ativo",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  pending_approval: {
    text: "Pendente",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  sold: {
    text: "Vendido",
    className: "bg-gray-200 text-gray-800 border-gray-300",
  },
  rejected: {
    text: "Rejeitado",
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

export const UserAdListItem = ({ title, description, price, imageUrl, status }: UserAdListItemProps) => {
  const currentStatus = statusConfig[status] || statusConfig.pending_approval;

  return (
    <Card className="flex p-3 gap-3 items-start shadow-sm">
      <img src={imageUrl} alt={title} className="w-20 h-20 rounded-md object-cover flex-shrink-0" loading="lazy" />
      <div className="flex-1 space-y-0.5">
        <h3 className="font-semibold text-sm leading-tight">{title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
        <p className="font-bold text-sm text-foreground pt-1">{formatPrice(price)}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Badge className={cn("text-xs", currentStatus.className)}>
          {currentStatus.text}
        </Badge>
      </div>
    </Card>
  );
};