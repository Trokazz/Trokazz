import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OfferListItem from "@/components/OfferListItem";
import { Skeleton } from "@/components/ui/skeleton";
import MobilePageHeader from "@/components/MobilePageHeader";
import { Gift, Search } from "lucide-react"; // Import Search icon
import { Button } from "@/components/ui/button"; // Import Button
import { Link } from "react-router-dom"; // Import Link

const fetchUserOffersAsBuyer = async (userId: string) => {
  const { data, error } = await supabase
    .from('offers')
    .select(`
      id,
      offer_amount,
      status,
      created_at,
      ad_id,
      advertisements ( title, image_urls ),
      seller:profiles!seller_id ( full_name, avatar_url )
    `)
    .eq('buyer_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const MyOffersMadePage = () => {
  const { user } = useAuth();

  const { data: offersMade, isLoading: isLoadingOffersMade } = useQuery({
    queryKey: ['userOffersAsBuyer', user?.id],
    queryFn: () => fetchUserOffersAsBuyer(user!.id),
    enabled: !!user,
  });

  return (
    <div className="flex flex-col h-full bg-background">
      <MobilePageHeader title="Minhas Ofertas" />
      <main className="flex-1 p-4 space-y-4">
        {isLoadingOffersMade ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : offersMade && offersMade.length > 0 ? (
          <div className="space-y-3">
            {offersMade.map((offer) => (
              <OfferListItem key={offer.id} offer={offer} isSellerView={false} currentUserId={user!.id} />
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground pt-8">
            <Gift className="h-12 w-12 mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">Você ainda não fez nenhuma oferta.</p>
            <p className="mb-4">Que tal explorar alguns anúncios e fazer sua primeira oferta?</p>
            <Button asChild>
              <Link to="/">
                <Search className="mr-2 h-4 w-4" /> Explorar Anúncios
              </Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default MyOffersMadePage;