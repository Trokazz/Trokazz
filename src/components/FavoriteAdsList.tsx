import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdCard, { Advertisement } from "@/components/AdCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/contexts/SessionContext";

const fetchFavoriteAds = async (userId: string) => {
  const { data, error } = await supabase
    .from("favorites")
    .select(`
      advertisements (
        id, title, price, image_urls, created_at
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  
  // A inferência de tipo do Supabase para tabelas unidas pode ser incorreta.
  // Converter para 'unknown' primeiro, conforme sugerido pelo erro TypeScript, resolve isso.
  return data.map(fav => fav.advertisements).filter(Boolean) as unknown as Advertisement[];
};

const FavoriteAdsList = () => {
  const { user } = useSession();

  const { data: ads, isLoading } = useQuery({
    queryKey: ["favoriteAds", user?.id],
    queryFn: () => fetchFavoriteAds(user!.id),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!ads || ads.length === 0) {
    return <p className="text-muted-foreground text-center py-4">Você ainda não favoritou nenhum anúncio.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {ads.map((ad) => (
        <AdCard key={ad.id} ad={ad} isInitiallyFavorited={true} />
      ))}
    </div>
  );
};

export default FavoriteAdsList;