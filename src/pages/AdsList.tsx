import { useSearchParams, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdCard, { Advertisement } from "@/components/AdCard";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControls } from "@/components/PaginationControls";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useForm, Controller } from "react-hook-form";
import { useEffect, useMemo } from "react";
import ConnectedServices from "@/components/ConnectedServices";

const ADS_PER_PAGE = 12;

interface FilterParams {
  categorySlug: string | null;
  searchTerm: string | null;
  page: number;
  [key: string]: any;
}

const fetchFilteredAds = async (filters: FilterParams) => {
  let query = supabase
    .from("advertisements")
    .select("*, boosted_until", { count: 'exact' })
    .eq('status', 'approved');

  if (filters.categorySlug) query = query.eq("category_slug", filters.categorySlug);
  if (filters.searchTerm) query = query.or(`title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%`);
  
  const categoryConfig = filters.categoryData?.custom_fields || {};
  if (categoryConfig.hasPriceFilter !== false) {
    if (filters.minPrice) query = query.gte("price", filters.minPrice);
    if (filters.maxPrice) query = query.lte("price", filters.maxPrice);
  }

  const standardFilterKeys = ['categorySlug', 'searchTerm', 'page', 'sortBy', 'minPrice', 'maxPrice', 'categoryData'];
  for (const key in filters) {
    if (!standardFilterKeys.includes(key) && filters[key]) {
      query = query.eq(`metadata->>${key}`, filters[key]);
    }
  }

  const [sortField, sortOrder] = (filters.sortBy || "created_at-desc").split("-");
  
  query = query.order('boosted_until', { ascending: false, nullsFirst: false });
  if (sortField !== 'boosted_until') {
    query = query.order(sortField, { ascending: sortOrder === 'asc' });
  }

  const from = (filters.page - 1) * ADS_PER_PAGE;
  const to = from + ADS_PER_PAGE - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { ads: data as Advertisement[], count: count ?? 0 };
};

const fetchCategoryData = async (slug: string | null) => {
  if (!slug) return null;
  const { data, error } = await supabase.from("categories").select("name, custom_fields, connected_service_tags").eq("slug", slug).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data || null;
};

const fetchUserFavoriteIds = async (userId: string | undefined) => {
  if (!userId) return [];
  const { data, error } = await supabase.from("favorites").select("ad_id").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return data.map(fav => fav.ad_id);
};

const AdsList = () => {
  const { user } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const { slug } = useParams<{ slug?: string }>();

  const filters = useMemo(() => {
    const currentParams = new URLSearchParams(searchParams.toString());
    const params: FilterParams = {
      categorySlug: slug || currentParams.get("categoria"),
      searchTerm: currentParams.get("q"),
      page: Number(currentParams.get("page") || "1"),
    };
    currentParams.forEach((value, key) => {
      if (!['categoria', 'q', 'page'].includes(key)) {
        params[key] = value;
      }
    });
    return params;
  }, [slug, searchParams]);

  const { data: categoryData, isLoading: isLoadingCategoryData } = useQuery({
    queryKey: ["categoryData", filters.categorySlug],
    queryFn: () => fetchCategoryData(filters.categorySlug),
    enabled: !!filters.categorySlug,
  });

  const { data, isLoading: isLoadingAds, error } = useQuery({
    queryKey: ["filteredAds", filters, categoryData],
    queryFn: () => fetchFilteredAds({ ...filters, categoryData }),
    enabled: !isLoadingCategoryData,
  });

  const { data: favoriteIds } = useQuery({
    queryKey: ["userFavoriteIds", user?.id],
    queryFn: () => fetchUserFavoriteIds(user?.id),
    enabled: !!user,
  });

  const { control, handleSubmit, reset } = useForm();

  useEffect(() => {
    const categoryConfig = categoryData?.custom_fields || {};
    const initialFormState: { [key: string]: any } = { ...filters };

    if (categoryConfig.fields && Array.isArray(categoryConfig.fields)) {
      categoryConfig.fields.forEach((field: any) => {
        if (field?.name) {
          initialFormState[field.name] = filters[field.name] || '';
        }
      });
    }
    reset(initialFormState);
  }, [filters, categoryData, reset]);

  const isLoading = isLoadingAds || isLoadingCategoryData;
  const totalPages = data?.count ? Math.ceil(data.count / ADS_PER_PAGE) : 0;
  const title = filters.searchTerm ? `Resultados para "${filters.searchTerm}"` : categoryData?.name || (filters.categorySlug ? filters.categorySlug.replace(/-/g, ' ') : "Todos os Anúncios");
  
  const onFilterSubmit = (formValues: any) => {
    const newParams = new URLSearchParams();
    if (filters.searchTerm) {
      newParams.set('q', filters.searchTerm);
    }
    if (filters.categorySlug) {
      newParams.set('categoria', filters.categorySlug);
    }

    for (const key in formValues) {
      if (formValues[key] && formValues[key] !== 'all' && !['q', 'categoria', 'categorySlug', 'page', 'searchTerm'].includes(key)) {
        newParams.set(key, String(formValues[key]));
      }
    }
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const categoryConfig = useMemo(() => {
    const config = categoryData?.custom_fields || { hasPriceFilter: true, fields: [] };
    if (config && !Array.isArray(config.fields)) {
      config.fields = [];
    }
    return config;
  }, [categoryData]);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold capitalize">{title}</h1>

      {categoryData && (
        <ConnectedServices tags={categoryData.connected_service_tags} categoryName={categoryData.name.toLowerCase()} />
      )}

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit(onFilterSubmit)} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            {categoryConfig.hasPriceFilter !== false && (
              <>
                <Controller name="minPrice" control={control} render={({ field }) => (<div className="space-y-1"><label className="text-sm font-medium">Preço Mín.</label><Input type="number" placeholder="R$" {...field} value={field.value || ''} /></div>)} />
                <Controller name="maxPrice" control={control} render={({ field }) => (<div className="space-y-1"><label className="text-sm font-medium">Preço Máx.</label><Input type="number" placeholder="R$" {...field} value={field.value || ''} /></div>)} />
              </>
            )}
            
            {categoryConfig.fields?.map((field: any) => {
              if (!field || typeof field !== 'object' || !field.name || !field.label) {
                return null;
              }
              
              return (
                <Controller
                  key={field.name}
                  name={field.name}
                  control={control}
                  render={({ field: formField }) => (
                    <div className="space-y-1">
                      <label className="text-sm font-medium">{field.label}</label>
                      {field.type === 'select' ? (
                        <Select onValueChange={formField.onChange} value={formField.value || 'all'}>
                          <SelectTrigger><SelectValue placeholder={field.label} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {Array.isArray(field.options) && field.options?.map((option: string) => (
                              <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input type={field.type} placeholder={field.label} {...formField} value={formField.value || ''} />
                      )}
                    </div>
                  )}
                />
              );
            })}

            <Controller name="sortBy" control={control} render={({ field }) => (<div className="space-y-1"><label className="text-sm font-medium">Ordenar por</label><Select onValueChange={field.onChange} value={field.value || 'created_at-desc'}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="created_at-desc">Mais Recentes</SelectItem>{categoryConfig.hasPriceFilter !== false && <><SelectItem value="price-asc">Menor Preço</SelectItem><SelectItem value="price-desc">Maior Preço</SelectItem></>}</SelectContent></Select></div>)} />
            <Button type="submit" className="w-full">Filtrar</Button>
          </form>
        </CardContent>
      </Card>

      <section>
        {isLoading && (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">{Array.from({ length: 8 }).map((_, i) => (<div key={i} className="space-y-2"><Skeleton className="h-48 w-full" /><Skeleton className="h-6 w-3/4" /><Skeleton className="h-6 w-1/2" /></div>))}</div>)}
        {error && (<div className="text-center py-10"><p className="text-red-500">Ocorreu um erro ao carregar os anúncios.</p></div>)}
        {!isLoading && !error && data?.ads && data.ads.length > 0 && (<><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">{data.ads.map((ad) => (<AdCard key={ad.id} ad={ad} isInitiallyFavorited={favoriteIds?.includes(ad.id)} />))}</div><PaginationControls currentPage={filters.page} totalPages={totalPages} /></>)}
        {!isLoading && !error && data?.ads && data.ads.length === 0 && (<div className="text-center py-10"><p className="text-gray-500">Nenhum anúncio encontrado para estes filtros.</p></div>)}
      </section>
    </div>
  );
};

export default AdsList;