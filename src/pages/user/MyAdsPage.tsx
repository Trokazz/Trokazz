import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { UserAdListItem } from "@/components/UserAdListItem";
import { Skeleton } from "@/components/ui/skeleton";
import MobilePageHeader from "@/components/MobilePageHeader";
import { PlusCircle } from "lucide-react"; // Removed Package2 for empty state icon
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/utils/formatters"; // Importando formatPrice

const fetchUserAds = async (userId: string) => {
  const { data, error } = await supabase
    .from('advertisements')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const MyAdsPage = () => {
  const { user } = useAuth();

  const { data: userAds, isLoading: isLoadingAds } = useQuery({
    queryKey: ['userAds', user?.id],
    queryFn: () => fetchUserAds(user!.id),
    enabled: !!user,
  });

  return (
    <div className="flex flex-col h-full bg-background">
      <MobilePageHeader title="Meus Anúncios" />
      <main className="flex-1 p-4 space-y-4">
        <Button asChild className="w-full bg-accent hover:bg-accent/90">
          <Link to="/sell">
            <PlusCircle className="mr-2 h-4 w-4" /> Publicar Novo Anúncio
          </Link>
        </Button>
        {isLoadingAds ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : userAds && userAds.length > 0 ? (
          <div className="space-y-3">
            {userAds.map((ad) => (
              <Link to={`/manage-ad/${ad.id}`} key={ad.id}>
                <UserAdListItem 
                  id={ad.id}
                  title={ad.title}
                  description={ad.description || ''}
                  price={formatPrice(ad.price)}
                  imageUrl={ad.image_urls?.[0] || '/placeholder.svg'}
                  status={ad.status as any}
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground pt-8">
            <img src="/logo.png" alt="Trokazz Logo" className="h-12 w-12 mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">Você ainda não tem nenhum anúncio.</p>
            <p className="mb-4">Que tal publicar o seu primeiro item?</p>
            <Button asChild>
              <Link to="/sell">
                <PlusCircle className="mr-2 h-4 w-4" /> Publicar Anúncio
              </Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default MyAdsPage;