import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import * as Icons from "lucide-react";
import { Category } from "@/types/database";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getOptimizedImageUrl } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile"; // Importar useIsMobile

interface CategoryGridProps {
  categories: Category[] | null | undefined;
  isLoading: boolean;
}

const categoryIconMap: { [key: string]: React.ElementType } = {
  'imoveis': Icons.Building2,
  'para-sua-casa': Icons.Armchair,
  'utilidade-publica': Icons.Siren,
  'beleza': Icons.Wand2,
  'agro-e-industria': Icons.Factory,
  'doacao-e-ajuda': Icons.HeartHandshake,
  'eletronicos-e-celulares': Icons.Smartphone,
  'gastronomia': Icons.Utensils,
  'servicos': Icons.Wrench,
  'vagas-de-emprego': Icons.Briefcase,
  'veiculos': Icons.Car,
  // Adicione mais mapeamentos conforme necessário
};

const categoryColors: { [key: string]: { bg: string; text: string; hoverBg: string } } = {
  'agro-e-industria':       { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-700 dark:text-green-300', hoverBg: 'hover:bg-green-200 dark:hover:bg-green-800/50' },
  'beleza':                 { bg: 'bg-rose-100 dark:bg-rose-900/50', text: 'text-rose-700 dark:text-rose-300', hoverBg: 'hover:bg-rose-200 dark:hover:bg-rose-800/50' },
  'doacao-e-ajuda':         { bg: 'bg-pink-100 dark:bg-pink-900/50', text: 'text-pink-700 dark:text-pink-300', hoverBg: 'hover:bg-pink-200 dark:hover:bg-pink-800/50' },
  'eletronicos-e-celulares':{ bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-700 dark:text-blue-300', hoverBg: 'hover:bg-blue-200 dark:hover:bg-blue-800/50' },
  'gastronomia':            { bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-700 dark:text-orange-300', hoverBg: 'hover:bg-orange-200 dark:hover:bg-orange-800/50' },
  'imoveis':                { bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-700 dark:text-purple-300', hoverBg: 'hover:bg-purple-200 dark:hover:bg-purple-800/50' },
  'para-sua-casa':          { bg: 'bg-teal-100 dark:bg-teal-900/50', text: 'text-teal-700 dark:text-teal-300', hoverBg: 'hover:bg-teal-200 dark:hover:bg-teal-800/50' },
  'servicos':               { bg: 'bg-indigo-100 dark:bg-indigo-900/50', text: 'text-indigo-700 dark:text-indigo-300', hoverBg: 'hover:bg-indigo-200 dark:hover:bg-indigo-800/50' },
  'utilidade-publica':      { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-700 dark:text-red-300', hoverBg: 'hover:bg-red-200 dark:hover:bg-red-800/50' },
  'vagas-de-emprego':       { bg: 'bg-cyan-100 dark:bg-cyan-900/50', text: 'text-cyan-700 dark:text-cyan-300', hoverBg: 'hover:bg-cyan-200 dark:hover:bg-cyan-800/50' },
  'veiculos':               { bg: 'bg-slate-100 dark:bg-slate-800/50', text: 'text-slate-700 dark:text-slate-300', hoverBg: 'hover:bg-slate-200 dark:hover:bg-slate-700/50' },
  'default':                { bg: 'bg-gray-100 dark:bg-gray-800/50', text: 'text-gray-700 dark:text-gray-300', hoverBg: 'hover:bg-gray-200 dark:hover:bg-gray-700/50' },
};

const CategoryGrid = ({ categories, isLoading }: CategoryGridProps) => {
  const topLevelCategories = categories?.filter(cat => !cat.parent_slug) || [];
  const isMobile = useIsMobile(); // Usar o hook para detectar mobile

  if (isLoading) {
    return (
      <div className="w-full">
        <h2 className="text-2xl font-bold mb-4">Categorias</h2>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex w-max space-x-4 pb-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className={cn("flex-shrink-0", isMobile ? "h-20 w-20 rounded-full" : "h-28 w-28 rounded-lg")} />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    );
  }

  if (!topLevelCategories || topLevelCategories.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4">Categorias</h2>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex w-max space-x-4 pb-4">
          {topLevelCategories.map((category) => {
            const Icon = categoryIconMap[category.slug] || (Icons as any)[category.icon] || Icons.HelpCircle;
            const colors = categoryColors[category.slug] || categoryColors.default;
            
            const imageUrl = category.image_url ? getOptimizedImageUrl(category.image_url, { width: 112, height: 112, resize: 'cover' }, 'category_images') : undefined;

            return (
              <Link key={category.slug} to={`/anuncios/categoria/${category.slug}`} className={cn("flex-shrink-0", isMobile ? "w-24 flex flex-col items-center text-center" : "w-28")}>
                {isMobile ? (
                  // Layout para mobile: ícone circular
                  <>
                    <div className={cn(
                      "flex items-center justify-center h-20 w-20 rounded-full transition-all duration-300 ease-in-out group-hover:shadow-md group-hover:scale-105 overflow-hidden",
                      !imageUrl && colors.bg, // Aplica background color apenas se não houver imagem
                      !imageUrl && colors.hoverBg
                    )}>
                      {imageUrl ? (
                        <img src={imageUrl} alt={category.name} className="w-full h-full object-cover" />
                      ) : (
                        <Icon className={cn("h-10 w-10 flex-shrink-0", colors.text)} />
                      )}
                    </div>
                    <p className={cn("text-xs font-medium mt-2 w-full line-clamp-2 overflow-hidden text-ellipsis", colors.text)}>
                      {category.name}
                    </p>
                  </>
                ) : (
                  // Layout para desktop: Card
                  <Card className={cn(
                    "flex flex-col items-center justify-center h-28 w-full text-center transition-all duration-300 ease-in-out group hover:shadow-md",
                    !imageUrl && colors.bg,
                    !imageUrl && colors.hoverBg
                  )}>
                    <CardContent className="flex flex-col items-center justify-center p-2 h-full overflow-hidden">
                      {imageUrl ? (
                        <img src={imageUrl} alt={category.name} className="w-full h-full object-cover rounded-md" />
                      ) : (
                        <Icon className={cn("h-8 w-8 mb-2", colors.text)} />
                      )}
                      <p className={cn("text-xs font-medium w-full h-full flex items-center justify-center text-center line-clamp-2 overflow-hidden text-ellipsis", colors.text)}>
                        {category.name}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </Link>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default CategoryGrid;