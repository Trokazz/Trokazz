import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdCard, { Advertisement } from "@/components/AdCard";
import { Skeleton } from "@/components/ui/skeleton";
import PromoBanner from "@/components/PromoBanner";
import { useSession } from "@/contexts/SessionContext";
import ActivityFeed from "@/components/ActivityFeed";
import AdStories from "@/components/AdStories";
import ErrorState from "@/components/ErrorState";

type GenericAd = Advertisement & { distance?: number };

// Funções de busca independentes
const fetchBanners = async () => {
  const { data, error } = await supabase.rpc('get_home_banners');
  if (error) throw new Error("Falha ao carregar banners.");
  return data;
};
const fetchStories = async () => {
  const { data, error } = await supabase.rpc('get_home_stories');
  if (error) throw new Error("Falha ao carregar destaques.");
  return data;
};
const fetchAds = async () => {
  const { data, error } = await supabase.rpc('get_home_ads');
  if (error) throw new Error("Falha ao carregar anúncios.");
  return data;
};
const fetchActivityFeed = async () => {
  const { data, error } = await supabase.rpc('get_home_activity_feed');
  if (error) throw new Error("Falha ao carregar feed de atividades.");
  return data;
};

const fetchUserFavoriteIds = async (userId: string | undefined) => {
  if (!userId) return [];
  const { data, error } = await supabase.from("favorites").select("ad_id").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return data.map(fav => fav.ad_id);
};

const AdGrid = ({ ads, favoriteIds }: { ads: GenericAd[], favoriteIds: string[] }) => {
  if (ads.length === 0) {
    return (
      <div className="text-center py-10">
        <h3 className="text-xl font-semibold">Nenhum anúncio encontrado</h3>
        <p className="text-muted-foreground mt-2">Seja o primeiro a anunciar na sua região!</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {ads.map((ad) => (
        <AdCard key={ad.id} ad={ad} isInitiallyFavorited={favoriteIds?.includes(ad.id)} />
      ))}
    </div>
  );
};

const AdGridSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
      </div>
    ))}
  </div>
);

const Index = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();

  const [
    bannersQuery,
    storiesQuery,
    adsQuery,
    feedQuery
  ] = useQueries({
    queries: [
      { queryKey: ['homeBanners'], queryFn: fetchBanners, staleTime: 5 * 60 * 1000 },
      { queryKey: ['homeStories'], queryFn: fetchStories, staleTime: 5 * 60 * 1000 },
      { queryKey: ['homeAds'], queryFn: fetchAds, staleTime: 5 * 60 * 1000 },
      { queryKey: ['homeActivityFeed'], queryFn: fetchActivityFeed, staleTime: 5 * 60 * 1000 },
    ]
  });

  const { data: favoriteIds } = useQuery({
    queryKey: ["userFavoriteIds", user?.id],
    queryFn: () => fetchUserFavoriteIds(user?.id),
    enabled: !!user,
  });

  // O conteúdo principal (anúncios) é o único que deve mostrar um erro de página inteira.
  if (adsQuery.isError) {
    return <ErrorState message={adsQuery.error.message} onRetry={() => queryClient.invalidateQueries({ queryKey: ['homeAds'] })} />
  }

  const sectionTitle = "Destaques Recentes";

  return (
    <div className="space-y-8">
      {storiesQuery.isError ? <div className="text-destructive text-center p-4 rounded-md bg-destructive/10">Não foi possível carregar os destaques.</div> : <AdStories stories={storiesQuery.data} isLoading={storiesQuery.isLoading} />}
      {bannersQuery.isError ? <div className="text-destructive text-center p-4 rounded-md bg-destructive/10">Não foi possível carregar os banners.</div> : <PromoBanner banners={bannersQuery.data} isLoading={bannersQuery.isLoading} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <section className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-6">{sectionTitle}</h2>
          
          {adsQuery.isLoading ? (
            <AdGridSkeleton />
          ) : (
            <AdGrid ads={adsQuery.data || []} favoriteIds={favoriteIds || []} />
          )}
        </section>

        <aside className="lg:col-span-1 lg:sticky lg:top-24">
          {feedQuery.isError ? <div className="text-destructive text-center p-4 rounded-md bg-destructive/10">Não foi possível carregar as atividades.</div> : <ActivityFeed activities={feedQuery.data} isLoading={feedQuery.isLoading} />}
        </aside>
      </div>
    </div>
  );
};

export default Index;