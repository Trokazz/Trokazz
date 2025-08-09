import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdCard, { Advertisement } from "@/components/AdCard";
import { Skeleton } from "@/components/ui/skeleton";
import PromoBanner from "@/components/PromoBanner";
import { useSession } from "@/contexts/SessionContext";
import { useState, useEffect } from "react";
import ActivityFeed from "@/components/ActivityFeed";
import AdStories from "@/components/AdStories";

type GenericAd = Advertisement & { distance?: number };

const fetchNearbyAds = async (coords: { latitude: number; longitude: number }) => {
  const { data, error } = await supabase.rpc('nearby_ads', {
    lat: coords.latitude,
    long: coords.longitude
  });
  if (error) throw new Error("Falha ao carregar anúncios próximos.");
  return (data || []) as GenericAd[];
};

const fetchLatestAds = async () => {
  const { data, error } = await supabase.rpc('latest_ads');
  if (error) throw new Error("Falha ao carregar anúncios recentes.");
  return (data || []) as GenericAd[];
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
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(true);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsRequestingLocation(false);
      },
      () => {
        setIsRequestingLocation(false);
      },
      { timeout: 10000 }
    );
  }, []);

  const { data: nearbyAds, isLoading: isLoadingNearby, isError: isNearbyError } = useQuery({
    queryKey: ["nearbyAds", coords],
    queryFn: () => fetchNearbyAds(coords!),
    enabled: !!coords,
  });

  const showFallback = !isRequestingLocation && (isNearbyError || !nearbyAds || nearbyAds.length === 0);

  const { data: latestAds, isLoading: isLoadingLatest } = useQuery({
    queryKey: ["latestAds"],
    queryFn: fetchLatestAds,
    enabled: showFallback,
  });

  const { data: favoriteIds } = useQuery({
    queryKey: ["userFavoriteIds", user?.id],
    queryFn: () => fetchUserFavoriteIds(user?.id),
    enabled: !!user,
  });

  const isLoading = isRequestingLocation || (!!coords && isLoadingNearby) || (showFallback && isLoadingLatest);
  const adsToDisplay = showFallback ? latestAds : nearbyAds;
  const sectionTitle = showFallback ? "Destaques Recentes" : "Oportunidades Perto de Você";

  return (
    <div className="space-y-8">
      <AdStories />
      <PromoBanner />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <section className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-6">{sectionTitle}</h2>
          
          {isLoading ? (
            <AdGridSkeleton />
          ) : (
            <AdGrid ads={adsToDisplay || []} favoriteIds={favoriteIds || []} />
          )}
        </section>

        <aside className="lg:col-span-1 lg:sticky lg:top-24">
          <ActivityFeed />
        </aside>
      </div>
    </div>
  );
};

export default Index;