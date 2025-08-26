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
  tags, // NOVO: Adicionado tags ao fetchAds
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
  tags?: string; // NOVO: Tipo para tags
}) => {
  console.log("fetchAds: Called with parameters:", { categorySlug, searchTerm, page, priceMin, priceMax, sortBy, sortOrder, customFilters, userLocation, radiusKm, tags }); // NEW LOG
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
    if (customFilters[key]) { // Only add if value is not empty
      query = query.eq(`metadata->>${key}`, customFilters[key]);
    }
  }

  // NOVO: Filtro por tags
  if (tags) {
    const tagArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    if (tagArray.length > 0) {
      // Usa o operador '@>' para verificar se o array JSONB de tags contém todos os elementos do array fornecido
      // Ou '?' para verificar se o array JSONB de tags contém qualquer um dos elementos
      // Para uma busca mais flexível (qualquer tag), usaremos '?'
      query = query.overlaps('metadata->tags', tagArray);
    }
  }

  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  const from = (page - 1) * ADS_PER_PAGE;
  const to = from + ADS_PER_PAGE - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  console.log("fetchAds: Supabase query result count:", count); // NEW LOG
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
  return data.map(cat => {
    let hasPriceFilter = false; // Default to false
    let fields: any[] = [];

    if (cat.custom_fields && typeof cat.custom_fields === 'object' && cat.custom_fields !== null) {
      const rawCustomFields = cat.custom_fields as { hasPriceFilter?: boolean; fields?: any[] };
      if (rawCustomFields.hasPriceFilter === true) { // Only set to true if explicitly true
        hasPriceFilter = true;
      }
      if (Array.isArray(rawCustomFields.fields)) {
        fields = rawCustomFields.fields;
      }
    }
    
    return {
      ...cat,
      custom_fields: { hasPriceFilter, fields } // Ensure it's always an object with these properties
    };
  });
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
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>("desc");
  const [customFilters, setCustomFilters] = useState<Record<string, string>>({});
  const [tagsFilter, setTagsFilter] = useState<string>(""); // NOVO: Estado para o filtro de tags
  
  // Define effectiveCategoryConfig here, and update it in useEffect
  const [effectiveCategoryConfig, setEffectiveCategoryConfig] = useState<{ hasPriceFilter: boolean; fields: any[] }>({ hasPriceFilter: false, fields: [] });
  const [currentCategoryName, setCurrentCategoryName] = useState<string | null>(null); // For page title

  const { data: allCategories, isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  useEffect(() => {
    console.log("AdsList: useEffect for categorySlug/allCategories/searchParams fired.");
    console.log("AdsList: Current searchParams:", Object.fromEntries(searchParams.entries()));
    
    // Initialize filter states directly from searchParams, with fallbacks
    setPriceMin(searchParams.get("priceMin") || "");
    setPriceMax(searchParams.get("priceMax") || "");
    setSortBy(searchParams.get("sortBy") || "created_at");
    setSortOrder((searchParams.get("sortOrder") as 'asc' | 'desc') || "desc");
    setTagsFilter(searchParams.get("tags") || ""); // NOVO: Inicializa tagsFilter
    
    let newEffectiveCategoryConfig: { hasPriceFilter: boolean; fields: any[] } = { hasPriceFilter: false, fields: [] };
    let newCurrentCategoryName: string | null = null;

    if (categorySlug && allCategories) {
      const foundCategory = allCategories.find(cat => cat.slug === categorySlug);
      console.log("AdsList: Current category found:", foundCategory);
      if (foundCategory) {
        // Ensure newEffectiveCategoryConfig is always a well-formed object
        const rawCustomFields = (typeof foundCategory.custom_fields === 'object' && foundCategory.custom_fields !== null)
          ? foundCategory.custom_fields
          : {};
        
        let hasPriceFilter = false; // Default to false
        let fields: any[] = [];

        if (rawCustomFields.hasPriceFilter === true) { // Only set to true if explicitly true
          hasPriceFilter = true;
        }
        if (Array.isArray(rawCustomFields.fields)) {
          fields = rawCustomFields.fields;
        }

        newEffectiveCategoryConfig = { hasPriceFilter, fields };
        newCurrentCategoryName = foundCategory.name;
      } else {
        console.log("AdsList: No category found for slug:", categorySlug);
      }
    } else {
      console.log("AdsList: No categorySlug or allCategories not loaded. Using default category config.");
    }
    setEffectiveCategoryConfig(newEffectiveCategoryConfig); // Update the state here
    setCurrentCategoryName(newCurrentCategoryName); // Update category name for title
    console.log("AdsList: newEffectiveCategoryConfig after update:", newEffectiveCategoryConfig); // ADDED LOG
    console.log("AdsList: effectiveCategoryConfig state after update:", newEffectiveCategoryConfig); // ADDED LOG

    const initialCustomFilters: Record<string, string> = {};
    (newEffectiveCategoryConfig.fields || []).forEach((field: any) => { 
      const paramValue = searchParams.get(field.name);
      if (paramValue !== null) {
        initialCustomFilters[field.name] = paramValue;
      }
    });
    setCustomFilters(initialCustomFilters);
    console.log("AdsList: initialCustomFilters after update:", initialCustomFilters); // ADDED LOG
  }, [categorySlug, allCategories, searchParams]); // Dependencies

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["adsList", categorySlug, currentSearchTerm, currentPage, priceMin, priceMax, sortBy, sortOrder, customFilters, tagsFilter], // NOVO: Adicionado tagsFilter
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
      tags: tagsFilter, // NOVO: Passa tagsFilter para fetchAds
    }),
  });

  const { data: favoriteIds } = useQuery({
    queryKey: ["userFavoriteIds", user?.id],
    queryFn: () => fetchUserFavoriteIds(user?.id),
    enabled: !!user,
  });

  const totalPages = data?.count ? Math.ceil(data.count / ADS_PER_PAGE) : 0;

  const handleApplyFilters = () => {
    console.log("handleApplyFilters: Applying filters with current state:", { priceMin, priceMax, sortBy, sortOrder, customFilters, tagsFilter }); // NEW LOG
    const newSearchParams = new URLSearchParams();
    if (currentSearchTerm) newSearchParams.set("q", currentSearchTerm);
    if (priceMin) newSearchParams.set("priceMin", priceMin);
    if (priceMax) newSearchParams.set("priceMax", priceMax);
    if (sortBy) newSearchParams.set("sortBy", sortBy);
    if (sortOrder) newSearchParams.set("sortOrder", sortOrder);
    if (tagsFilter) newSearchParams.set("tags", tagsFilter); // NOVO: Adiciona tagsFilter aos searchParams
    
    // Add custom filters
    for (const key in customFilters) {
      if (customFilters[key]) { // Only add if value is not empty
        newSearchParams.set(key, customFilters[key]);
      }
    }

    newSearchParams.set("page", "1"); // Reset to first page on filter apply
    console.log("handleApplyFilters: New searchParams to set:", Object.fromEntries(newSearchParams.entries())); // NEW LOG
    setSearchParams(newSearchParams);
  };

  const handleClearFilters = () => {
    console.log("handleClearFilters: Clearing all filters."); // NEW LOG
    setPriceMin("");
    setPriceMax("");
    setSortBy("created_at");
    setSortOrder("desc");
    setCustomFilters({}); // Clear custom filters
    setTagsFilter(""); // NOVO: Limpa o filtro de tags
    setSearchParams({}); // Clear all search params
  };

  const pageTitle = categorySlug ? `Anúncios em ${currentCategoryName || categorySlug.replace(/-/g, ' ')}` : (currentSearchTerm ? `Resultados para "${currentSearchTerm}"` : "Todos os Anúncios");
  const pageDescription = categorySlug ? `Encontre anúncios na categoria ${currentCategoryName || categorySlug.replace(/-/g, ' ')} no Trokazz.` : (currentSearchTerm ? `Veja os resultados da busca por "${currentSearchTerm}" no Trokazz.` : "Explore todos os anúncios disponíveis no Trokazz.");

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
        {categorySlug ? currentCategoryName || categorySlug.replace(/-/g, ' ') : (currentSearchTerm ? `Busca por "${currentSearchTerm}"` : "Todos os Anúncios")}
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
            {console.log("AdsList: Rendering price filter. hasPriceFilter:", effectiveCategoryConfig.hasPriceFilter)}
            {effectiveCategoryConfig.hasPriceFilter === true && (
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
            {isLoadingCategories ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              effectiveCategoryConfig.fields?.map((field: any) => (
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
              ))
            )}

            {/* NOVO: Filtro por Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags-filter">Tags / Palavras-Chave</Label>
              <Input
                id="tags-filter"
                type="text"
                placeholder="Ex: usado, urgente, promoção"
                value={tagsFilter}
                onChange={(e) => setTagsFilter(e.target.value)}
              />
              <CardDescription className="text-xs">Separe as tags por vírgula.</CardDescription>
            </div>

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
                      {categorySlug ? `Não há anúncios na categoria "${currentCategoryName || categorySlug.replace(/-/g, ' ')}" com esses filtros.` : "Nenhum anúncio corresponde à sua busca ou filtros."}
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