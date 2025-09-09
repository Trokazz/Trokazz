import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdCard } from '@/components/AdCard';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllCategorySlugsInHierarchy } from '@/utils/categoryHelpers';

const fetchCategoryInfo = async (slug: string) => {
  const { data, error } = await supabase
    .from('categories')
    .select('name')
    .eq('slug', slug)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

const fetchAdsByCategory = async (slug: string) => {
  const categorySlugs = await getAllCategorySlugsInHierarchy(slug);
  
  const { data, error } = await supabase
    .from('advertisements')
    .select('*')
    .in('category_slug', categorySlugs) // Use 'in' to include subcategories
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
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

const CategoryResultsPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: category, isLoading: isLoadingCategory } = useQuery({
    queryKey: ['categoryInfo', slug],
    queryFn: () => fetchCategoryInfo(slug!),
    enabled: !!slug,
  });

  const { data: ads, isLoading: isLoadingAds } = useQuery({
    queryKey: ['adsByCategory', slug],
    queryFn: () => fetchAdsByCategory(slug!),
    enabled: !!slug,
  });

  const isLoading = isLoadingCategory || isLoadingAds;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">
        {isLoadingCategory ? <Skeleton className="h-8 w-48" /> : category?.name || slug}
      </h1>
      
      {isLoading ? (
        <AdGridSkeleton />
      ) : ads && ads.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ads.map((ad) => (
            <AdCard
              key={ad.id}
              id={ad.id}
              title={ad.title}
              price={ad.price ?? 0}
              location={"N/A"} // Placeholder
              image={ad.image_urls?.[0] || '/placeholder.svg'}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground p-8">
          Nenhum anúncio encontrado nesta categoria.
        </p>
      )}
    </div>
  );
};

export default CategoryResultsPage;