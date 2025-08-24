import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdCard from "@/components/AdCard";
import { Skeleton } from "@/components/ui/skeleton";
import PromoBanner from "@/components/PromoBanner";
import { useSession } from "@/contexts/SessionContext";
import ActivityFeed from "@/components/ActivityFeed";
import ErrorState from "@/components/ErrorState";
import OnboardingCard from "@/components/OnboardingCard";
import usePageMetadata from "@/hooks/usePageMetadata";
import { Profile, HomePageData, Advertisement, Category } from "@/types/database"; // Importar Category
// REMOVIDO: import SearchBar from "@/components/SearchBar";
import { Link } from "react-router-dom";
import CategoryGrid from "@/components/CategoryGrid"; // Importar o novo CategoryGrid

type GenericAd = Advertisement & { distance?: number };

const fetchHomePageData = async (): Promise<HomePageData> => {
  console.log("Chamando supabase.rpc('get_home_page_data')...");
  const { data, error } = await supabase.rpc('get_home_page_data');
  if (error) {
    console.error("Erro na RPC get_home_page_data:", error);
    throw new Error("Falha ao carregar os dados da página inicial.");
  }
  console.log("Dados da RPC get_home_page_data recebidos:", data);
  return data as HomePageData;
};

const fetchUserFavoriteIds = async (userId: string | undefined) => {
  if (!userId) return [];
  const { data, error } = await supabase.from("favorites").select("ad_id").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return data.map(fav => fav.ad_id);
};

const fetchProfileAndAdsForOnboarding = async (userId: string | undefined) => {
  if (!userId) return { profile: null, ads: null };

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    throw profileError;
  }

  const { data: adsData, error: adsError } = await supabase
    .from("advertisements")
    .select("id, title, description, price, image_urls, created_at, user_id, category_slug, status, view_count, boosted_until, last_renewed_at, metadata, latitude, longitude, flag_reason, expires_at")
    .eq("user_id", userId);

  if (adsError) {
    throw adsError;
  }

  return { profile: profileData as Profile, ads: adsData as Advertisement[] };
};

// Função para buscar categorias (reutilizada do SubHeader)
const fetchCategories = async () => {
  const { data, error } = await supabase.from("categories").select("slug, name, icon, parent_slug").order("name");
  if (error) throw new Error(error.message);
  return data;
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
    <div className="grid grid-cols-2 gap-6"> {/* Alterado para grid-cols-2 */}
      {ads.map((ad) => (
        <AdCard key={ad.id} ad={ad} isInitiallyFavorited={favoriteIds?.includes(ad.id)} />
      ))}
    </div>
  );
};

const AdGridSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="grid grid-cols-2 gap-6"> {/* Alterado para grid-cols-2 */}
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

  const { data: homeData, isLoading, isError, error } = useQuery<HomePageData>({
    queryKey: ['homePageData'],
    queryFn: fetchHomePageData,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const { data: categories, isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const { data: favoriteIds } = useQuery({
    queryKey: ["userFavoriteIds", user?.id],
    queryFn: () => fetchUserFavoriteIds(user?.id),
    enabled: !!user,
  });

  const { data: userOnboardingData, isLoading: isLoadingUserOnboardingData } = useQuery({
    queryKey: ["userOnboardingData", user?.id],
    queryFn: () => fetchProfileAndAdsForOnboarding(user?.id),
    enabled: !!user,
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

  return (
    <div className="space-y-8">
      {/* REMOVIDO: <SearchBar /> */}
      {user && (
        <OnboardingCard
          profile={userOnboardingData?.profile}
          ads={userOnboardingData?.ads}
          isLoading={isLoadingUserOnboardingData}
        />
      )}
      <PromoBanner banners={homeData?.banners} isLoading={isLoading} />
      
      {/* Agora usa CategoryGrid para todas as visualizações */}
      <CategoryGrid categories={categories} isLoading={isLoadingCategories} />

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Anúncios populares</h2>
        <Link to="/anuncios" className="text-primary hover:underline">
          Veja tudo
        </Link>
      </div>
      
      <section>
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
  );
};

export default Index;