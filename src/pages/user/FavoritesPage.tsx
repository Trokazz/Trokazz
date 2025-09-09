import MobilePageHeader from "@/components/MobilePageHeader";
import { Heart, Search } from "lucide-react"; // Import Search icon
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdCard } from "@/components/AdCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button"; // Import Button

const fetchFavoriteAds = async (userId: string) => {
  const { data, error } = await supabase
    .from('favorites')
    .select(`
      ad_id,
      advertisements (
        id,
        title,
        price,
        image_urls,
        location_city,
        location_state
      )
    `)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return data.map(fav => fav.advertisements);
};

const FavoritesPage = () => {
  const { user } = useAuth();

  const { data: favoriteAds, isLoading } = useQuery({
    queryKey: ['userFavoriteAds', user?.id],
    queryFn: () => fetchFavoriteAds(user!.id),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="flex flex-col h-full bg-background">
        <MobilePageHeader title="Favoritos" />
        <main className="flex-1 p-4 flex items-center justify-center">
          <div className="text-center text-muted-foreground pt-8">
            <Heart className="h-12 w-12 mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">Faça login para ver seus itens favoritos.</p>
            <p className="mb-4">Salve os anúncios que você mais gostou para encontrá-los facilmente depois.</p>
            <Button asChild>
              <Link to="/auth">Fazer Login</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <MobilePageHeader title="Favoritos" />
      <main className="flex-1 p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : favoriteAds && favoriteAds.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {favoriteAds.map((ad) => (
              <AdCard
                key={ad.id}
                id={ad.id}
                title={ad.title}
                price={ad.price ?? 0}
                location={`${ad.location_city || 'N/A'}, ${ad.location_state || 'N/A'}`}
                image={ad.image_urls?.[0] || '/placeholder.svg'}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground pt-8">
            <Heart className="h-12 w-12 mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">Você ainda não tem nenhum item favorito.</p>
            <p className="mb-4">Explore nossos anúncios e adicione os que mais gostar aos seus favoritos!</p>
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

export default FavoritesPage;