import { AdCard } from "@/components/AdCard";
import FilterBar from "@/components/FilterBar";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import FilterSheet from "@/components/FilterSheet";
import { showError } from "@/utils/toast";
import { formatPrice } from "@/utils/formatters";
import useDebounce from "@/hooks/useDebounce";
import SearchWithAutocomplete from "@/components/SearchWithAutocomplete";
import HomeBannerCarousel from "@/components/HomeBannerCarousel";
import { useInView } from 'react-intersection-observer';
import { useUserLocation } from '@/utils/geolocation';

interface AdFilters {
  category: string | null;
  subcategory: string | null;
  condition: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationNeighborhood: string | null;
  minPrice: number;
  maxPrice: number;
  sortBy: string | null;
}

const fetchAds = async ({ pageParam = 0, pageSize = 20, searchTerm, filters }: { pageParam?: number; pageSize?: number; searchTerm: string; filters: AdFilters; }) => {
  const offset = pageParam * pageSize;
  let query = supabase
    .from('advertisements')
    .select('*', { count: 'exact' })
    .eq('status', 'approved')
    .order('boosted_until', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (searchTerm) {
    query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
  }

  if (filters.category) {
    query = query.eq('category_slug', filters.category);
  }
  if (filters.subcategory) {
    query = query.eq('subcategory_slug', filters.subcategory);
  }
  if (filters.condition) {
    query = query.eq('condition', filters.condition);
  }
  if (filters.locationCity) {
    query = query.ilike('location_city', `%${filters.locationCity}%`);
  }
  if (filters.locationState) {
    query = query.ilike('location_state', `%${filters.locationState}%`);
  }
  if (filters.locationNeighborhood) {
    query = query.ilike('location_neighborhood', `%${filters.locationNeighborhood}%`);
  }

  query = query.gte('price', filters.minPrice);
  query = query.lte('price', filters.maxPrice);

  switch (filters.sortBy) {
    case 'price_asc':
      query = query.order('price', { ascending: true });
      break;
    case 'price_desc':
      query = query.order('price', { ascending: false });
      break;
    case 'title_asc':
      query = query.order('title', { ascending: true });
      break;
    case 'title_desc':
      query = query.order('title', { ascending: false });
      break;
    case 'oldest':
      query = query.order('created_at', { ascending: true });
      break;
    case 'newest':
    default:
      break;
  }

  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) throw new Error(error.message);

  const hasMore = (count || 0) > (offset + (data?.length || 0));
  return { ads: data || [], nextPage: hasMore ? pageParam + 1 : undefined };
};

const logSearchQuery = async (queryText: string, userId: string | undefined) => {
  const { error } = await supabase.from('search_queries').insert({
    query_text: queryText,
    user_id: userId || null,
  });
  if (error) console.error("Error logging search query:", error.message);
};

const fetchPriceRangeSettings = async () => {
  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['min_price_filter', 'max_price_filter']);
  if (error) throw new Error(error.message);

  const minPrice = parseInt(data?.find(s => s.key === 'min_price_filter')?.value || '0');
  const maxPrice = parseInt(data?.find(s => s.key === 'max_price_filter')?.value || '10000');
  return { minPrice, maxPrice };
};

const AdGridSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    ))}
  </div>
);

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { ref, inView } = useInView();
  const { city: detectedCity, state: detectedState, neighborhood: detectedNeighborhood, isLoadingLocation } = useUserLocation();

  const { data: priceSettings, isLoading: isLoadingPriceSettings } = useQuery({
    queryKey: ['priceRangeSettings'],
    queryFn: fetchPriceRangeSettings,
  });

  const defaultMinPrice = priceSettings?.minPrice || 0;
  const defaultMaxPrice = priceSettings?.maxPrice || 10000;

  const [currentInputSearchTerm, setCurrentInputSearchTerm] = useState(() => searchParams.get('q') || '');
  const debouncedInputSearchTerm = useDebounce(currentInputSearchTerm, 500);
  
  const [filters, setFilters] = useState<AdFilters>({
    category: searchParams.get('category') || null,
    subcategory: searchParams.get('subcategory') || null,
    condition: searchParams.get('condition') || null,
    locationCity: searchParams.get('locationCity') || null,
    locationState: searchParams.get('locationState') || null,
    locationNeighborhood: searchParams.get('locationNeighborhood') || null,
    minPrice: parseInt(searchParams.get('minPrice') || String(defaultMinPrice)),
    maxPrice: parseInt(searchParams.get('maxPrice') || String(defaultMaxPrice)),
    sortBy: searchParams.get('sortBy') || 'newest',
  });
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const queryClient = useQueryClient();
  const logSearchMutation = useMutation({
    mutationFn: (queryText: string) => logSearchQuery(queryText, user?.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['search_queries'] }),
  });

  const activeSearchTermFromUrl = searchParams.get('q') || '';

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingAds,
    error,
  } = useInfiniteQuery({
    queryKey: ['ads', activeSearchTermFromUrl, filters],
    queryFn: ({ pageParam }) => fetchAds({ pageParam, searchTerm: activeSearchTermFromUrl, filters }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !isLoadingPriceSettings,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    const categoryParam = searchParams.get('category') || null;
    const subcategoryParam = searchParams.get('subcategory') || null;
    const conditionParam = searchParams.get('condition') || null;
    const locationCityParam = searchParams.get('locationCity') || null;
    const locationStateParam = searchParams.get('locationState') || null;
    const locationNeighborhoodParam = searchParams.get('locationNeighborhood') || null;
    const minPriceParam = parseInt(searchParams.get('minPrice') || String(defaultMinPrice));
    const maxPriceParam = parseInt(searchParams.get('maxPrice') || String(defaultMaxPrice));
    const sortByParam = searchParams.get('sortBy') || 'newest';

    setFilters(prevFilters => {
      if (
        prevFilters.category === categoryParam &&
        prevFilters.subcategory === subcategoryParam &&
        prevFilters.condition === conditionParam &&
        prevFilters.locationCity === locationCityParam &&
        prevFilters.locationState === locationStateParam &&
        prevFilters.locationNeighborhood === locationNeighborhoodParam &&
        prevFilters.minPrice === minPriceParam &&
        prevFilters.maxPrice === maxPriceParam &&
        prevFilters.sortBy === sortByParam
      ) {
        return prevFilters;
      }
      return {
        category: categoryParam,
        subcategory: subcategoryParam,
        condition: conditionParam,
        locationCity: locationCityParam,
        locationState: locationStateParam,
        locationNeighborhood: locationNeighborhoodParam,
        minPrice: minPriceParam,
        maxPrice: maxPriceParam,
        sortBy: sortByParam,
      };
    });
  }, [searchParams, defaultMinPrice, defaultMaxPrice]);

  useEffect(() => {
    if (!isLoadingLocation && detectedCity && !searchParams.get('locationCity')) {
      setFilters(prevFilters => ({
        ...prevFilters,
        locationCity: detectedCity,
        locationState: detectedState,
        locationNeighborhood: detectedNeighborhood,
      }));
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('locationCity', detectedCity);
      if (detectedState) newSearchParams.set('locationState', detectedState);
      if (detectedNeighborhood) newSearchParams.set('locationNeighborhood', detectedNeighborhood);
      navigate(`/?${newSearchParams.toString()}`, { replace: true });
    }
  }, [isLoadingLocation, detectedCity, detectedState, detectedNeighborhood, searchParams, navigate]);

  useEffect(() => {
    const currentUrlSearchParam = searchParams.get('q') || '';
    if (debouncedInputSearchTerm !== currentUrlSearchParam) {
      const newSearchParams = new URLSearchParams(searchParams);
      if (debouncedInputSearchTerm.trim()) {
        newSearchParams.set('q', debouncedInputSearchTerm.trim());
        logSearchMutation.mutate(debouncedInputSearchTerm.trim());
      } else {
        newSearchParams.delete('q');
      }
      navigate(`/?${newSearchParams.toString()}`, { replace: true });
    }
  }, [debouncedInputSearchTerm, searchParams, navigate, logSearchMutation]);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSearchSubmit = (searchTerm: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (searchTerm.trim()) newSearchParams.set('q', searchTerm.trim());
    else newSearchParams.delete('q');

    if (filters.category) newSearchParams.set('category', filters.category); else newSearchParams.delete('category');
    if (filters.subcategory) newSearchParams.set('subcategory', filters.subcategory); else newSearchParams.delete('subcategory');
    if (filters.condition) newSearchParams.set('condition', filters.condition); else newSearchParams.delete('condition');
    if (filters.locationCity) newSearchParams.set('locationCity', filters.locationCity); else newSearchParams.delete('locationCity');
    if (filters.locationState) newSearchParams.set('locationState', filters.locationState); else newSearchParams.delete('locationState');
    if (filters.locationNeighborhood) newSearchParams.set('locationNeighborhood', filters.locationNeighborhood); else newSearchParams.delete('locationNeighborhood');
    if (filters.minPrice !== defaultMinPrice) newSearchParams.set('minPrice', String(filters.minPrice)); else newSearchParams.delete('minPrice');
    if (filters.maxPrice !== defaultMaxPrice) newSearchParams.set('maxPrice', String(filters.maxPrice)); else newSearchParams.delete('maxPrice');
    if (filters.sortBy !== 'newest') newSearchParams.set('sortBy', filters.sortBy || 'newest'); else newSearchParams.delete('sortBy');
    
    navigate(`/?${newSearchParams.toString()}`);
    queryClient.invalidateQueries({ queryKey: ['ads', searchTerm, filters] });
  };

  const handleApplyFilters = (newFilters: AdFilters) => {
    setFilters(newFilters);
    const newSearchParams = new URLSearchParams(searchParams);
    if (currentInputSearchTerm.trim()) newSearchParams.set('q', currentInputSearchTerm.trim());
    else newSearchParams.delete('q');

    if (newFilters.category) newSearchParams.set('category', newFilters.category); else newSearchParams.delete('category');
    if (newFilters.subcategory) newSearchParams.set('subcategory', newFilters.subcategory); else newSearchParams.delete('subcategory');
    if (newFilters.condition) newSearchParams.set('condition', newFilters.condition); else newSearchParams.delete('condition');
    if (newFilters.locationCity) newSearchParams.set('locationCity', newFilters.locationCity); else newSearchParams.delete('locationCity');
    if (newFilters.locationState) newSearchParams.set('locationState', newFilters.locationState); else newSearchParams.delete('locationState');
    if (newFilters.locationNeighborhood) newSearchParams.set('locationNeighborhood', newFilters.locationNeighborhood); else newSearchParams.delete('locationNeighborhood');
    if (newFilters.minPrice !== defaultMinPrice) newSearchParams.set('minPrice', String(newFilters.minPrice)); else newSearchParams.delete('minPrice');
    if (newFilters.maxPrice !== defaultMaxPrice) newSearchParams.set('maxPrice', String(newFilters.maxPrice)); else newSearchParams.delete('maxPrice');
    if (newFilters.sortBy !== 'newest') newSearchParams.set('sortBy', newFilters.sortBy || 'newest'); else newSearchParams.delete('sortBy');
    navigate(`/?${newSearchParams.toString()}`);
    queryClient.invalidateQueries({ queryKey: ['ads', currentInputSearchTerm, newFilters] });
  };

  if (isLoadingPriceSettings) {
    return <AdGridSkeleton />;
  }

  const allAds = data?.pages.flatMap(page => page.ads) || [];

  return (
    <div className="space-y-6">
      {/* Desktop Filter Bar */}
      <div className="hidden md:block">
        <FilterBar initialFilters={filters} onApplyFilters={handleApplyFilters} />
      </div>

      {/* Mobile Search & Filter */}
      <div className="md:hidden space-y-3">
        <SearchWithAutocomplete
          initialSearchTerm={currentInputSearchTerm}
          onSearchSubmit={handleSearchSubmit}
          className="relative"
          placeholder="Buscar itens..."
        />
        <Button variant="link" className="text-primary p-0 flex items-center gap-1" onClick={() => setIsFilterSheetOpen(true)}>
          <SlidersHorizontal className="h-4 w-4" /> Filtro Avançado
        </Button>
      </div>
      
      {/* Banner Carousel - Visible on both desktop and mobile */}
      <HomeBannerCarousel />

      <h2 className="text-xl font-bold text-foreground pt-2">Anúncios Recentes</h2>
      {error ? (
        <p className="text-destructive">Falha ao carregar anúncios. Por favor, tente novamente mais tarde.</p>
      ) : (allAds.length > 0) ? (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {allAds.map((ad) => (
            <AdCard
              key={ad.id}
              id={ad.id}
              title={ad.title}
              price={ad.price ?? 0}
              location={`${ad.location_city || 'N/A'}, ${ad.location_state || 'N/A'}${ad.location_neighborhood ? `, ${ad.location_neighborhood}` : ''}`}
              image={ad.image_urls?.[0] || '/placeholder.svg'}
            />
          ))}
          <div ref={ref} className="col-span-full text-center py-4">
            {isFetchingNextPage && <p>Carregando mais anúncios...</p>}
            {!hasNextPage && allAds.length > 0 && <p>Você viu todos os anúncios!</p>}
          </div>
        </div>
      ) : isLoadingAds ? (
        <AdGridSkeleton />
      ) : (
        <p className="text-center text-muted-foreground p-8">
          Nenhum anúncio encontrado.
        </p>
        )}
      <FilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        onApplyFilters={handleApplyFilters}
        initialFilters={filters}
      />
    </div>
  );
};

export default Index;