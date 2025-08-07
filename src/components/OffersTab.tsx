import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { Check, X } from "lucide-react";
import { useEffect } from "react";
import { safeFormatDistanceToNow } from "@/lib/utils";

const fetchOffers = async (userId: string) => {
  const { data, error } = await supabase
    .from('offers')
    .select(`
      id,
      offer_amount,
      status,
      created_at,
      advertisements ( id, title, image_urls ),
      buyer:profiles!offers_buyer_id_fkey ( id, full_name, avatar_url ),
      seller:profiles!offers_seller_id_fkey ( id, full_name, avatar_url )
    `)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

const OffersTab = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  // Tipando explicitamente os dados como `any[]` para contornar a inferência incorreta de tipos em tabelas unidas.
  const { data: offers, isLoading } = useQuery<any[]>({
    queryKey: ["userOffers", user?.id],
    queryFn: () => fetchOffers(user!.id),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`offers:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'offers', filter: `seller_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['userOffers', user.id] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'offers', filter: `buyer_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['userOffers', user.id] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const handleUpdateOffer = async (offerId: string, status: 'accepted' | 'rejected') => {
    const toastId = showLoading("Atualizando oferta...");
    try {
      const { error } = await supabase
        .from("offers")
        .update({ status })
        .eq("id", offerId);
      if (error) throw error;
      dismissToast(toastId);
      showSuccess(`Oferta ${status === 'accepted' ? 'aceita' : 'rejeitada'}.`);
      queryClient.invalidateQueries({ queryKey: ['userOffers', user?.id] });
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Erro ao atualizar oferta.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted': return <Badge className="bg-green-500">Aceita</Badge>;
      case 'pending': return <Badge variant="secondary">Pendente</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejeitada</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const receivedOffers = offers?.filter(o => o.seller?.id === user?.id);
  const sentOffers = offers?.filter(o => o.buyer?.id === user?.id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Ofertas Recebidas</CardTitle>
          <CardDescription>Propostas que outros usuários fizeram em seus anúncios.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && <Skeleton className="h-24 w-full" />}
          {receivedOffers?.length === 0 && <p className="text-muted-foreground text-center py-4">Nenhuma oferta recebida.</p>}
          {receivedOffers?.map((offer: any) => (
            <div key={offer.id} className="p-3 border rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Oferta em <Link to={`/anuncio/${offer.advertisements?.id}`} className="font-semibold text-primary hover:underline">{offer.advertisements?.title || 'Anúncio indisponível'}</Link></p>
                  <p className="text-lg font-bold">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(offer.offer_amount)}</p>
                </div>
                {getStatusBadge(offer.status)}
              </div>
              <div className="flex justify-between items-end mt-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8"><AvatarImage src={offer.buyer.avatar_url} /><AvatarFallback>{offer.buyer.full_name?.[0]}</AvatarFallback></Avatar>
                  <div>
                    <p className="text-sm font-semibold">{offer.buyer.full_name}</p>
                    <p className="text-xs text-muted-foreground">{safeFormatDistanceToNow(offer.created_at)}</p>
                  </div>
                </div>
                {offer.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" className="text-green-600" onClick={() => handleUpdateOffer(offer.id, 'accepted')}><Check className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" className="text-destructive" onClick={() => handleUpdateOffer(offer.id, 'rejected')}><X className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Ofertas Enviadas</CardTitle>
          <CardDescription>Propostas que você fez em anúncios de outros usuários.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && <Skeleton className="h-24 w-full" />}
          {sentOffers?.length === 0 && <p className="text-muted-foreground text-center py-4">Nenhuma oferta enviada.</p>}
          {sentOffers?.map((offer: any) => (
             <div key={offer.id} className="p-3 border rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Sua oferta para <Link to={`/anuncio/${offer.advertisements?.id}`} className="font-semibold text-primary hover:underline">{offer.advertisements?.title || 'Anúncio indisponível'}</Link></p>
                  <p className="text-lg font-bold">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(offer.offer_amount)}</p>
                </div>
                {getStatusBadge(offer.status)}
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-muted-foreground">{safeFormatDistanceToNow(offer.created_at)}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default OffersTab;