import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/IconMapper";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const fetchAllCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  if (error) throw new Error(error.message);
  return data;
};

const CategoriesPage = () => {
  const { data: allCategories, isLoading, error } = useQuery({
    queryKey: ['allCategories'],
    queryFn: fetchAllCategories,
  });

  const parentCategories = allCategories?.filter(c => !c.parent_slug) || [];
  
  const categoriesWithSubcategories = parentCategories.map(parent => ({
    ...parent,
    subcategories: allCategories?.filter(sub => sub.parent_slug === parent.slug) || []
  }));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-center md:text-left">Categorias</h1>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">Failed to load categories.</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-center md:text-left">Categorias</h1>
      
      <Accordion type="single" collapsible className="w-full space-y-3">
        {categoriesWithSubcategories.map((category) => {
          const mainLink = `/category/${category.slug}`;

          return (
            <AccordionItem value={category.slug} key={category.slug} className="bg-card rounded-lg border-none shadow-sm overflow-hidden">
              <AccordionTrigger className="p-4 hover:no-underline">
                <div className="flex items-center gap-4">
                  <Icon name={category.icon} className="h-6 w-6 text-primary" />
                  <span className="font-semibold text-md">{category.name}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3 ml-7 pl-7">
                  {category.subcategories.length > 0 ? (
                    <>
                      {category.subcategories.map((sub) => {
                        const subCategoryLink = `/category/${sub.slug}`;
                        return (
                          <Link to={subCategoryLink} key={sub.slug} className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors">
                            <Icon name={sub.icon} className="h-5 w-5" />
                            <span>{sub.name}</span>
                          </Link>
                        );
                      })}
                      <div className="border-t border-muted-foreground/20 my-3" />
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm mb-2">Nenhuma subcategoria encontrada.</p>
                  )}
                  <Link to={mainLink} className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors font-semibold">
                    Ver todos em {category.name}
                  </Link>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default CategoriesPage;