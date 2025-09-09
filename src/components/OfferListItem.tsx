import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { formatPrice } from "@/utils/formatters"; // Importando formatPrice

interface OfferListItemProps {
  offer: {
    id: string;
    offer_amount: number;
    status: 'pending' | 'accepted' | 'rejected';
    created_at: string;
    ad_id: string;
    advertisements: {
      title: string;
      image_urls: string[];
    } | null; // Pode ser nulo
    buyer?: { full_name: string; avatar_url: string; }; // Only for seller's view
    seller?: { full_name: string; avatar_url: string; }; // Only for buyer's view
  };
  isSellerView: boolean; // To determine if accept/reject buttons should be shown
  currentUserId: string;
}

const OfferListItem = ({ offer, isSellerView, currentUserId }: OfferListItemProps) => {
  const queryClient = useQueryClient();

  const updateOfferStatusMutation = useMutation({
    mutationFn: async ({ offerId, status }: { offerId: string; status: 'accepted' | 'rejected' }) => {
      const { error } = await supabase
        .from('offers')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', offerId);
      if (error) throw error;

      // If offer is accepted, mark the ad as sold
      if (status === 'accepted' && offer.ad_id) { // Adicionado verificação para offer.ad_id
        const { error: adUpdateError } = await supabase
          .from('advertisements')
          .update({ status: 'sold' })
          .eq('id', offer.ad_id);
        if (adUpdateError) throw adUpdateError;
      }
    },
    onSuccess: (_, variables) => {
      showSuccess(`Oferta ${variables.status === 'accepted' ? 'aceita' : 'rejeitada'} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['userOffersAsSeller', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['userOffersAsBuyer', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['userAds', currentUserId] }); // Invalidate user ads to reflect 'sold' status
    },
    onError: (error: any) => {
      showError(`Erro ao atualizar oferta: ${error.message}`);
    },
  });

  const handleAccept = () => {
    updateOfferStatusMutation.mutate({ offerId: offer.id, status: 'accepted' });
  };

  const handleReject = () => {
    updateOfferStatusMutation.mutate({ offerId: offer.id, status: 'rejected' });
  };

  const statusConfig = {
    pending: { text: "Pendente", className: "bg-orange-100 text-orange-800 border-orange-200" },
    accepted: { text: "Aceita", className: "bg-green-100 text-green-800 border-green-200" },
    rejected: { text: "Rejeitada", className: "bg-red-100 text-red-800 border-red-200" },
  };

  const currentStatus = statusConfig[offer.status] || statusConfig.pending;
  const otherParty = isSellerView ? offer.buyer : offer.seller;

  return (
    <div className="flex p-3 gap-3 items-start shadow-sm"> {/* Substituído Card por div */}
      <Link to={`/ad/${offer.ad_id}`} className="flex-shrink-0">
        <img
          src={offer.advertisements?.image_urls?.[0] || '/placeholder.svg'}
          alt={offer.advertisements?.title || 'Anúncio Removido'}
          className="w-20 h-20 rounded-md object-cover"
          loading="lazy"
        />
      </Link>
      <div className="flex-1 space-y-0.5">
        <Link to={`/ad/${offer.ad_id}`}>
          <h3 className="font-semibold text-sm leading-tight hover:underline">{offer.advertisements?.title || 'Anúncio Removido'}</h3>
        </Link>
        <p className="text-xs text-muted-foreground">
          {isSellerView ? `Oferta de ${otherParty?.full_name || 'Usuário'}` : `Para ${otherParty?.full_name || 'Vendedor'}`}
        </p>
        <p className="font-bold text-sm text-foreground pt-1">{formatPrice(offer.offer_amount)}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Badge className={cn("text-xs", currentStatus.className)}>
          {currentStatus.text}
        </Badge>
        {isSellerView && offer.status === 'pending' && (
          <div className="flex gap-1 mt-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 text-green-600 border-green-600 hover:bg-green-50"
              onClick={handleAccept}
              disabled={updateOfferStatusMutation.isPending}
            >
              {updateOfferStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 text-red-600 border-red-600 hover:bg-red-50"
              onClick={handleReject}
              disabled={updateOfferStatusMutation.isPending}
            >
              {updateOfferStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfferListItem;