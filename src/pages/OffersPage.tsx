import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { Check, X, ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { safeFormatDistanceToNow, getOptimizedImageUrl } from "@/lib/utils";
import { Database } from "@/types/supabase";
import usePageMetadata from "@/hooks/usePageMetadata";

// Definindo um tipo preciso para o resultado da query de ofertas
type OfferQueryResult = Pick<Database['public']['Tables']['offers']['Row'], 'id' | 'offer_amount' | 'status' | 'created_at'> & {
  advertisements: Pick<Database['public']['Tables']['advertisements']['Row'], 'id' | 'title' | 'image_urls'> | null;
  buyer: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url'> | null;
  seller: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url'> | null;
};

const fetchOffers = async (userId: string): Promise<OfferQueryResult[]> => {
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
  return data as OfferQueryResult[];
};

const OffersPage = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: offers, isLoading, isError, error } = useQuery<OfferQueryResult[]>({
    queryKey: ["userOffersPageData", user?.id],
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
        () => queryClient.invalidateQueries({ queryKey: ['userOffersPageData', user.id] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'offers', filter: `buyer_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['userOffersPageData', user.id] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  usePageMetadata({
    title: "Minhas Ofertas - Trokazz",
    description: "Gerencie as ofertas que você fez e recebeu em seus anúncios no Trokazz.",
    keywords: "minhas ofertas, ofertas, propostas, trokazz",
    ogUrl: window.location.href,
  });

  const handleUpdateOffer = async (offer: OfferQueryResult, status: 'accepted' | 'rejected') => {
    const toastId = showLoading("Atualizando oferta...");
    try {
      // 1. Atualiza o status da oferta
      const { error: offerUpdateError } = await supabase
        .from("offers")
        .update({ status })
        .eq("id", offer.id);
      if (offerUpdateError) throw offerUpdateError;

      if (status === 'accepted') {
        // 2. Marca o anúncio como vendido
        if (!offer.advertisements?.id) {
          throw new Error("ID do anúncio não encontrado para marcar como vendido.");
        }
        const { error: adUpdateError } = await supabase
          .from("advertisements")
          .update({ status: 'sold' })
          .eq("id", offer.advertisements.id);
        if (adUpdateError) throw adUpdateError;

        // 3. Cria ou encontra a conversa e envia mensagem inicial
        if (!user) throw new Error("Usuário não logado.");
        if (!offer.buyer?.id) throw new Error("ID do comprador não encontrado.");

        let conversationId: string;

        // Verifica se a conversa já existe para este anúncio e comprador
        const { data: existingConversation, error: convoSelectError } = await supabase
          .from("conversations")
          .select("id")
          .match({ ad_id: offer.advertisements.id, buyer_id: offer.buyer.id, seller_id: user.id })
          .single();

        if (convoSelectError && convoSelectError.code !== 'PGRST116') { // PGRST116 = nenhuma linha encontrada
          throw convoSelectError;
        }

        if (existingConversation) {
          conversationId = existingConversation.id;
        } else {
          const { data: newConversation, error: convoInsertError } = await supabase
            .from("conversations")
            .insert({
              ad_id: offer.advertisements.id,
              buyer_id: offer.buyer.id,
              seller_id: user.id,
              conversation_type: 'ad_chat',
            })
            .select("id")
            .single();
          if (convoInsertError) throw convoInsertError;
          if (!newConversation) throw new Error("Falha ao criar nova conversa.");
          conversationId = newConversation.id;
        }

        // Envia mensagem inicial
        const messageContent = `Olá ${offer.buyer.full_name || 'comprador'}! Aceitei sua oferta de ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(offer.offer_amount)} para o anúncio "${offer.advertisements.title}". Podemos combinar a entrega por aqui.`;
        const { error: messageError } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: messageContent,
        });
        if (messageError) throw messageError;

        dismissToast(toastId);
        showSuccess(`Oferta aceita! Anúncio "${offer.advertisements.title}" marcado como vendido. Você será redirecionado para o chat.`);
        
        // Invalida queries para atualizar a UI
        queryClient.invalidateQueries({ queryKey: ['userOffersPageData', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['myAdsPageData', user?.id] }); // Para atualizar o status do anúncio no perfil
        queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] }); // Para mostrar a nova conversa
        queryClient.invalidateQueries({ queryKey: ['adDetails', offer.advertisements.id] }); // Para atualizar o status do anúncio na página de detalhes

        // Redireciona para o chat após um pequeno atraso para o toast ser visível
        setTimeout(() => {
          navigate(`/chat/${conversationId}`);
        }, 2000);
      } else { // Oferta rejeitada
        dismissToast(toastId);
        showSuccess(`Oferta rejeitada.`);
        queryClient.invalidateQueries({ queryKey: ['userOffersPageData', user?.id] });
      }
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

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (isError) {
    return <p className="text-red-500 text-center py-4">Erro ao carregar ofertas: {error?.message}</p>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/perfil")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <CardTitle>Ofertas Recebidas</CardTitle>
            <CardDescription>Propostas que outros usuários fizeram em seus anúncios.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {receivedOffers?.length === 0 && <p className="text-muted-foreground text-center py-4">Nenhuma oferta recebida.</p>}
          {receivedOffers?.map((offer) => (
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
                  <Avatar className="h-8 w-8"><AvatarImage src={getOptimizedImageUrl(offer.buyer?.avatar_url, { width: 64, height: 64 }, 'avatars')} /><AvatarFallback>{offer.buyer?.full_name?.[0]}</AvatarFallback></Avatar>
                  <div>
                    <p className="text-sm font-semibold">{offer.buyer?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{safeFormatDistanceToNow(offer.created_at)}</p>
                  </div>
                </div>
                {offer.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" className="text-green-600" onClick={() => handleUpdateOffer(offer, 'accepted')}><Check className="h-4 w-4" /></Button>
                    <Button size="icon" variant="outline" className="text-destructive" onClick={() => handleUpdateOffer(offer, 'rejected')}><X className="h-4 w-4" /></Button>
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
          {sentOffers?.length === 0 && <p className="text-muted-foreground text-center py-4">Nenhuma oferta enviada.</p>}
          {sentOffers?.map((offer) => (
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

export default OffersPage;