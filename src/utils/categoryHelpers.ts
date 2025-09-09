import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  custom_fields: any | null;
  parent_slug: string | null;
  image_url: string | null;
}

export const getAllCategorySlugsInHierarchy = async (startSlug: string): Promise<string[]> => {
  const { data: allCategories, error } = await supabase
    .from('categories')
    .select('slug, parent_slug');

  if (error) {
    console.error("Error fetching all categories:", error.message);
    return [startSlug]; // Fallback to just the start slug
  }

  const categoryMap = new Map<string, Category[]>();
  allCategories.forEach(cat => {
    if (cat.parent_slug) {
      if (!categoryMap.has(cat.parent_slug)) {
        categoryMap.set(cat.parent_slug, []);
      }
      categoryMap.get(cat.parent_slug)?.push(cat as Category);
    }
  });

  const descendantSlugs: string[] = [];
  const queue: string[] = [startSlug];

  while (queue.length > 0) {
    const currentSlug = queue.shift();
    if (currentSlug) {
      descendantSlugs.push(currentSlug);
      const children = categoryMap.get(currentSlug);
      if (children) {
        queue.push(...children.map(c => c.slug));
      }
    }
  }
  return descendantSlugs;
};