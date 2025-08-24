import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdCard from "@/components/AdCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/contexts/SessionContext";
import { Database } from "@/types/supabase";
import { Advertisement } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import usePageMetadata from "@/hooks/usePageMetadata";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const fetchFavoriteAds = async (userId: string) => {
  const { data, error } = await supabase
    .from("favorites")
    .select(`
      advertisements (
        id, title, price, image_urls, created_at, boosted_until
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  
  // Definir um tipo preciso para o resultado da query
  type FavoriteAdQueryResult = {
    advertisements: Pick<Database['public']['Tables']['advertisements']['Row'], 'id' | 'title' | 'price' | 'image_urls' | 'created_at' | 'boosted_until'> | null;
  }[];

  return (data as FavoriteAdQueryResult)
    .map(fav => fav.advertisements)
    .filter(Boolean) as Advertisement[];
};

const FavoritesPage = () => {
  const { user } = useSession();
  const navigate = useNavigate();

  const { data: ads, isLoading, isError, error } = useQuery({
    queryKey: ["favoritesPageData", user?.id],
    queryFn: () => fetchFavoriteAds(user!.id),
    enabled: !!user,
  });

  usePageMetadata({
    title: "Meus Favoritos - Trokazz",
    description: "Visualize os anúncios que você favoritou no Trokazz.",
    keywords: "meus favoritos, anúncios salvos, favoritos, trokazz",
    ogUrl: window.location.href,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return <p className="text-red-500 text-center py-4">Erro ao carregar favoritos: {error?.message}</p>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/perfil")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <CardTitle>Meus Favoritos</CardTitle>
          <CardDescription>Anúncios que você salvou para ver mais tarde.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {ads && ads.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {ads.map((ad) => (
              <AdCard key={ad.id} ad={ad} isInitiallyFavorited={true} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">Você ainda não favoritou nenhum anúncio.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default FavoritesPage;