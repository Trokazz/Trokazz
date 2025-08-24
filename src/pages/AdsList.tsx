import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdCard from "@/components/AdCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/contexts/SessionContext";
import { Advertisement, Category, UserLevelDetails } from "@/types/database";
import { useSearchParams, useParams, Link } from "react-router-dom";
import { PaginationControls } from "@/components/PaginationControls";
import ErrorState from "@/components/ErrorState";
import usePageMetadata from "@/hooks/usePageMetadata";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, MapPin, LocateFixed, XCircle, Filter, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";

const ADS_PER_PAGE = 12;

type AdWithProfile = Advertisement & {
  profiles: {
    full_name: string | null;
    username: string | null;
    is_verified: boolean | null;
    user_level: string | null;
    userLevelDetails: UserLevelDetails | null;
  } | null;
};

interface UserLocation {
  latitude: number;
  longitude: number;
}

const fetchAds = async ({
  categorySlug,
  searchTerm,
  page,
  priceMin,
  priceMax,
  sortBy,
  sortOrder,
  customFilters,
  userLocation,
  radiusKm,
}: {
  categorySlug?: string;
  searchTerm?: string;
  page: number;
  priceMin?: number;
  priceMax?: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  customFilters: Record<string, string>;
  userLocation: UserLocation | null;
  radiusKm: number;
}) => {
  let query = supabase
    .from("advertisements")
    .select(`
      *,
      profiles (
        full_name, username, is_verified, user_level,
        userLevelDetails:user_levels ( * )
      )
    `, { count: 'exact' });

  query = query.eq("status", "approved");

  if (categorySlug) {
    query = query.eq("category_slug", categorySlug);
  }
  if (searchTerm) {
    query = query.ilike("title", `%${searchTerm}%`);
  }
  if (priceMin) {
    query = query.gte("price", priceMin);
  }
  if (priceMax) {
    query = query.lte("price", priceMax);
  }

  // Apply custom filters
  for (const key in customFilters) {
    if (customFilters[key]) {
      query = query.eq(`metadata->>${key}`, customFilters[key]);
    }
  }

  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  const from = (page - 1) * ADS_PER_PAGE;
  const to = from + ADS_PER_PAGE - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { ads: data as AdWithProfile[], count: count ?? 0 };
};

const fetchUserFavoriteIds = async (userId: string | undefined) => {
  if (!userId) return [];
  const { data, error } = await supabase.from("favorites").select("ad_id").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return data.map(fav => fav.ad_id);
};

const fetchCategories = async () => {
  const { data, error } = await supabase.from("categories").select("slug, name, custom_fields").order("name");
  if (error) throw new Error(error.message);
  console.log("fetchCategories: Raw data from Supabase:", data); // NOVO LOG AQUI
  // Ensure custom_fields is always a parsed object
  return data.map(cat => ({
    ...cat,
    custom_fields: cat.custom_fields ? (typeof cat.custom_fields === 'string' ? JSON.parse(cat.custom_fields) : cat.custom_fields) : null
  }));
};

const AdGridSkeleton = ({ count = ADS_PER_PAGE }: { count?: number }) => (
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

const AdsList = () => {
  const { slug: categorySlug } = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSession();

  const currentPage = Number(searchParams.get("page") || "1");
  const currentSearchTerm = searchParams.get("q") || "";

  // Filter states
  const [priceMin, setPriceMin] = useState<string>(searchParams.get("priceMin") || "");
  const [priceMax, setPriceMax] = useState<string>(searchParams.get("priceMax") || "");
  const [sortBy, setSortBy] = useState<string>(searchParams.get("sortBy") || "created_at");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get("sortOrder") as 'asc' | 'desc') || "desc"
  );
  const [customFilters, setCustomFilters] = useState<Record<string, string>>({});
  const [selectedCategoryDetails, setSelectedCategoryDetails] = useState<Category | null>(null);

  const { data: allCategories, isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  useEffect(() => {
    console.log("AdsList: useEffect triggered for categorySlug or allCategories change.");
    if (categorySlug && allCategories) {
      const category = allCategories.find(cat => cat.slug === categorySlug);
      
      // Ensure custom_fields is always an object, even if null in DB
      // And ensure hasPriceFilter defaults to true if not explicitly set to false
      const resolvedCustomFields = { 
        hasPriceFilter: true, // Default to true
        fields: [],
        ...(category?.custom_fields || {}) // Merge existing custom_fields, if any
      };

      console.log("AdsList: Category found:", category);
      console.log("AdsList: Raw custom_fields from DB (inside useEffect):", category?.custom_fields); // Add this log
      console.log("AdsList: Resolved Custom Fields (after merge):", resolvedCustomFields); // Add this log
      
      setSelectedCategoryDetails({ ...category, custom_fields: resolvedCustomFields } || null);

      if (resolvedCustomFields.fields) {
        const initialCustomFilters: Record<string, string> = {};
        (resolvedCustomFields.fields || []).forEach((field: any) => {
          initialCustomFilters[field.name] = searchParams.get(field.name) || "";
        });
        setCustomFilters(initialCustomFilters);
      } else {
        setCustomFilters({});
      }
    } else {
      console.log("AdsList: No categorySlug or allCategories not loaded. Resetting filters.");
      setSelectedCategoryDetails(null);
      setCustomFilters({});
    }
  }, [categorySlug, allCategories, searchParams]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["adsList", categorySlug, currentSearchTerm, currentPage, priceMin, priceMax, sortBy, sortOrder, customFilters],
    queryFn: () => fetchAds({
      categorySlug,
      searchTerm: currentSearchTerm,
      page: currentPage,
      priceMin: priceMin ? parseFloat(priceMin) : undefined,
      priceMax: priceMax ? parseFloat(priceMax) : undefined,
      sortBy,
      sortOrder,
      customFilters,
      userLocation: null, // Not directly integrated here for now
      radiusKm: 0, // Not directly integrated here for now
    }),
  });

  const { data: favoriteIds } = useQuery({
    queryKey: ["userFavoriteIds", user?.id],
    queryFn: () => fetchUserFavoriteIds(user?.id),
    enabled: !!user,
  });

  const totalPages = data?.count ? Math.ceil(data.count / ADS_PER_PAGE) : 0;

  const handleApplyFilters = () => {
    const newSearchParams = new URLSearchParams();
    if (currentSearchTerm) newSearchParams.set("q", currentSearchTerm);
    if (priceMin) newSearchParams.set("priceMin", priceMin);
    if (priceMax) newSearchParams.set("priceMax", priceMax);
    if (sortBy) newSearchParams.set("sortBy", sortBy);
    if (sortOrder) newSearchParams.set("sortOrder", sortOrder);
    for (const key in customFilters) {
      if (customFilters[key]) newSearchParams.set(key, customFilters[key]);
    }
    newSearchParams.set("page", "1"); // Reset to first page on filter apply
    setSearchParams(newSearchParams);
  };

  const handleClearFilters = () => {
    setPriceMin("");
    setPriceMax("");
    setSortBy("created_at");
    setSortOrder("desc");
    setCustomFilters({});
    setSearchParams({}); // Clear all search params
  };

  const pageTitle = categorySlug ? `Anúncios em ${selectedCategoryDetails?.name || categorySlug.replace(/-/g, ' ')}` : (currentSearchTerm ? `Resultados para "${currentSearchTerm}"` : "Todos os Anúncios");
  const pageDescription = categorySlug ? `Encontre anúncios na categoria ${selectedCategoryDetails?.name || categorySlug.replace(/-/g, ' ')} no Trokazz.` : (currentSearchTerm ? `Veja os resultados da busca por "${currentSearchTerm}" no Trokazz.` : "Explore todos os anúncios disponíveis no Trokazz.");

  usePageMetadata({
    title: `${pageTitle} - Trokazz`,
    description: pageDescription,
    keywords: `${categorySlug || ''}, ${currentSearchTerm || ''}, anúncios, classificados, dourados, ms, trokazz`,
    ogUrl: window.location.href,
  });

  if (isError) {
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold capitalize">
        {categorySlug ? selectedCategoryDetails?.name || categorySlug.replace(/-/g, ' ') : (currentSearchTerm ? `Busca por "${currentSearchTerm}"` : "Todos os Anúncios")}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Filter className="h-5 w-5" /> Filtros
            </CardTitle>
            <CardDescription>Refine sua busca por anúncios.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Price Filter */}
            {console.log("AdsList: Rendering Price Filter. hasPriceFilter:", selectedCategoryDetails?.custom_fields?.hasPriceFilter)}
            {selectedCategoryDetails?.custom_fields?.hasPriceFilter !== false && (
              <div className="space-y-2">
                <Label htmlFor="price-min">Preço (R$)</Label>
                <div className="flex gap-2">
                  <Input
                    id="price-min"
                    type="number"
                    placeholder="Mín."
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                  />
                  <Input
                    id="price-max"
                    type="number"
                    placeholder="Máx."
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Custom Fields Filters */}
            {selectedCategoryDetails?.custom_fields?.fields?.map((field: any) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={`custom-filter-${field.name}`}>{field.label}</Label>
                {field.type === 'select' ? (
                  <Select
                    value={customFilters[field.name] || ""}
                    onValueChange={(value) => setCustomFilters(prev => ({ ...prev, [field.name]: value }))}
                  >
                    <SelectTrigger id={`custom-filter-${field.name}`}>
                      <SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {field.options.map((option: string) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={`custom-filter-${field.name}`}
                    type={field.type}
                    placeholder={`Buscar por ${field.label.toLowerCase()}`}
                    value={customFilters[field.name] || ""}
                    onChange={(e) => setCustomFilters(prev => ({ ...prev, [field.name]: e.target.value }))}
                  />
                )}
              </div>
            ))}

            {/* Sort By */}
            <div className="space-y-2">
              <Label htmlFor="sort-by">Ordenar por</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sort-by">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Mais Recentes</SelectItem>
                  <SelectItem value="price">Preço</SelectItem>
                  <SelectItem value="view_count">Mais Vistos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <Label htmlFor="sort-order">Ordem</Label>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger id="sort-order">
                  <SelectValue placeholder="Ordem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Decrescente</SelectItem>
                  <SelectItem value="asc">Crescente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleApplyFilters} className="w-full">
                Aplicar Filtros
              </Button>
              <Button variant="outline" onClick={handleClearFilters} className="w-full">
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ads Grid */}
        <div className="md:col-span-3 space-y-6">
          <section>
            {isLoading ? (
              <AdGridSkeleton />
            ) : data?.ads.length === 0 ? (
              <div className="text-center py-10">
                <h3 className="text-xl font-semibold">Nenhum anúncio encontrado</h3>
                <p className="text-muted-foreground mt-2">
                  {categorySlug ? `Não há anúncios na categoria "${selectedCategoryDetails?.name || categorySlug.replace(/-/g, ' ')}" com esses filtros.` : "Nenhum anúncio corresponde à sua busca ou filtros."}
                </p>
                <Link to="/novo-anuncio" className="text-primary hover:underline mt-4 block">
                  Publique seu anúncio grátis!
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {data?.ads.map((ad) => (
                  <AdCard key={ad.id} ad={ad} isInitiallyFavorited={favoriteIds?.includes(ad.id)} />
                ))}
              </div>
            )}
          </section>

          <PaginationControls currentPage={currentPage} totalPages={totalPages} />
        </div>
      </div>
    </div>
  );
};

export default AdsList;