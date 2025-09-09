import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OfferListItem from "@/components/OfferListItem";
import { Skeleton } from "@/components/ui/skeleton";
import MobilePageHeader from "@/components/MobilePageHeader";
import { MessageSquare, List } from "lucide-react"; // Import List icon
import { Button } from "@/components/ui/button"; // Import Button
import { Link } from "react-router-dom"; // Import Link

const fetchUserOffersAsSeller = async (userId: string) => {
  const { data, error } = await supabase
    .from('offers')
    .select(`
      id,
      offer_amount,
      status,
      created_at,
      ad_id,
      advertisements ( title, image_urls ),
      buyer:profiles!buyer_id ( full_name, avatar_url )
    `)
    .eq('seller_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const MyOffersReceivedPage = () => {
  const { user } = useAuth();

  const { data: offersReceived, isLoading: isLoadingOffersReceived } = useQuery({
    queryKey: ['userOffersAsSeller', user?.id],
    queryFn: () => fetchUserOffersAsSeller(user!.id),
    enabled: !!user,
  });

  return (
    <div className="flex flex-col h-full bg-background">
      <MobilePageHeader title="Ofertas Recebidas" />
      <main className="flex-1 p-4 space-y-4">
        {isLoadingOffersReceived ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : offersReceived && offersReceived.length > 0 ? (
          <div className="space-y-3">
            {offersReceived.map((offer) => (
              <OfferListItem key={offer.id} offer={offer} isSellerView={true} currentUserId={user!.id} />
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground pt-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">Você ainda não recebeu nenhuma oferta.</p>
            <p className="mb-4">Publique seus anúncios e aguarde as propostas!</p>
            <Button asChild>
              <Link to="/profile/my-ads">
                <List className="mr-2 h-4 w-4" /> Ver Meus Anúncios
              </Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default MyOffersReceivedPage;