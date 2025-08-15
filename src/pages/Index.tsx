import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdCard, { Advertisement } from "@/components/AdCard"; // Importa Advertisement do AdCard para o AdGrid
import { Skeleton } from "@/components/ui/skeleton";
import PromoBanner from "@/components/PromoBanner";
import { useSession } from "@/contexts/SessionContext";
import ActivityFeed from "@/components/ActivityFeed";
import AdStories from "@/components/AdStories";
import ErrorState from "@/components/ErrorState";
import OnboardingCard from "@/components/OnboardingCard"; // Importando o novo componente
import usePageMetadata from "@/hooks/usePageMetadata";
import { Profile, Advertisement as FullAdvertisementType } from "@/types/database"; // Importa Profile e Advertisement completo do types/database

type GenericAd = Advertisement & { distance?: number };

const fetchHomePageData = async () => {
  const { data, error } = await supabase.rpc('get_home_page_data');
  if (error) throw new Error("Falha ao carregar os dados da página inicial.");
  return data;
};

const fetchUserFavoriteIds = async (userId: string | undefined) => {
  if (!userId) return [];
  const { data, error } = await supabase.from("favorites").select("ad_id").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return data.map(fav => fav.ad_id);
};

// Nova função para buscar dados do perfil e anúncios do usuário logado
const fetchProfileAndAdsForOnboarding = async (userId: string | undefined) => {
  if (!userId) return { profile: null, ads: null };

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*") // Seleciona todos os campos para corresponder ao tipo Profile
    .eq("id", userId)
    .single();

  if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = nenhuma linha encontrada
    throw profileError;
  }

  const { data: adsData, error: adsError } = await supabase
    .from("advertisements")
    .select("id, title, description, price, image_urls, created_at, user_id, category_slug, status, view_count, boosted_until, last_renewed_at, metadata, latitude, longitude, flag_reason, expires_at") // Seleciona todos os campos necessários para FullAdvertisementType
    .eq("user_id", userId);

  if (adsError) {
    throw adsError;
  }

  return { profile: profileData as Profile, ads: adsData as FullAdvertisementType[] };
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

  const { data: homeData, isLoading, isError, error } = useQuery({
    queryKey: ['homePageData'],
    queryFn: fetchHomePageData,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const { data: favoriteIds } = useQuery({
    queryKey: ["userFavoriteIds", user?.id],
    queryFn: () => fetchUserFavoriteIds(user?.id),
    enabled: !!user,
  });

  // Nova query para buscar dados do perfil e anúncios do usuário para o onboarding
  const { data: userOnboardingData, isLoading: isLoadingUserOnboardingData } = useQuery({
    queryKey: ["userOnboardingData", user?.id],
    queryFn: () => fetchProfileAndAdsForOnboarding(user?.id),
    enabled: !!user, // Apenas executa se o usuário estiver logado
  });

  usePageMetadata({
    title: "Trokazz - Compre, Venda e Troque em Dourados e Região",
    description: "Sua nova forma de negociar. Compre, venda e troque com segurança na maior comunidade de classificados de Dourados e região.",
    keywords: "trokazz, classificados, dourados, ms, compra, venda, troca, anúncios, usados, novos, eletrônicos, veículos, imóveis, serviços",
    ogImage: `${window.location.origin}/logo.png`,
    ogUrl: window.location.origin,
  });

  if (isError) {
    return <ErrorState message={error.message} onRetry={() => queryClient.invalidateQueries({ queryKey: ['homePageData'] })} />
  }

  const sectionTitle = "Destaques Recentes";

  return (
    <div className="space-y-8">
      {user && ( // Renderiza o OnboardingCard apenas se o usuário estiver logado
        <OnboardingCard
          profile={userOnboardingData?.profile}
          ads={userOnboardingData?.ads}
          isLoading={isLoadingUserOnboardingData}
        />
      )}
      <AdStories stories={homeData?.stories} isLoading={isLoading} />
      <PromoBanner banners={homeData?.banners} isLoading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <section className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-6">{sectionTitle}</h2>
          
          {isLoading ? (
            <AdGridSkeleton />
          ) : (
            <AdGrid ads={homeData?.ads || []} favoriteIds={favoriteIds || []} />
          )}
        </section>

        <aside className="lg:col-span-1 lg:sticky lg:top-24 space-y-8">
          <ActivityFeed activities={homeData?.activity_feed} isLoading={isLoading} />
        </aside>
      </div>
    </div>
  );
};

export default Index;