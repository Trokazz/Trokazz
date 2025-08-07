import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import WantedAdCard, { WantedAd } from "@/components/WantedAdCard";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const fetchWantedAds = async () => {
  const { data: ads, error } = await supabase
    .from("wanted_ads")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!ads || ads.length === 0) return [];

  const userIds = [...new Set(ads.map(ad => ad.user_id))];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, username")
    .in("id", userIds);

  if (profilesError) throw profilesError;

  const combinedData = ads.map(ad => ({
    ...ad,
    profiles: profiles.find(p => p.id === ad.user_id) || null,
  }));

  return combinedData as WantedAd[];
};

const WantedAdsList = () => {
  const { data: ads, isLoading, error } = useQuery({
    queryKey: ["wantedAds"],
    queryFn: fetchWantedAds,
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Mural de Procurados</h1>
          <p className="text-muted-foreground">Veja o que as pessoas estão precisando e venda mais rápido.</p>
        </div>
        <Button asChild>
          <Link to="/procurar/novo">Anunciar Procura</Link>
        </Button>
      </div>

      <section>
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2 border p-4 rounded-lg">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        )}
        {error && <p className="text-red-500">Erro ao carregar o mural: {error.message}</p>}
        {!isLoading && !error && ads && ads.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {ads.map((ad) => (
              <WantedAdCard key={ad.id} ad={ad} />
            ))}
          </div>
        )}
        {!isLoading && !error && ads?.length === 0 && (
          <div className="text-center py-16 border-dashed border-2 rounded-lg">
            <h2 className="text-xl font-semibold">O mural está vazio por enquanto.</h2>
            <p className="text-muted-foreground mt-2">Seja o primeiro a anunciar o que você procura!</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default WantedAdsList;