import { Link } from "react-router-dom";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import * as Icons from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl } from "@/lib/utils"; // Importar getOptimizedImageUrl

// Atualizado: Adicionado image_url à Category
type Category = { slug: string; name: string; icon: string; parent_slug: string | null; image_url: string | null };

const fetchCategories = async () => {
  // Atualizado: Selecionar a nova coluna image_url
  const { data, error } = await supabase.from("categories").select("slug, name, icon, parent_slug, image_url").order("name");
  if (error) throw new Error(error.message);
  return data;
};

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

const categoryStyles: { [key: string]: { bg: string; text: string; hoverBg: string } } = {
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

const SubHeader = () => {
  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const topLevelCategories = categories?.filter(cat => !cat.parent_slug) || [];

  return (
    <div className="bg-background border-b hidden md:block">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex w-max space-x-6 py-4">
            {isLoading && Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center justify-center gap-2 w-24">
                <Skeleton className="h-16 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
            {topLevelCategories?.map((cat: Category) => { // Renderiza apenas categorias principais
              const Icon = categoryIconMap[cat.slug] || (Icons as any)[cat.icon] || Icons.HelpCircle;
              const styles = categoryStyles[cat.slug] || categoryStyles.default;
              
              // NOVO: Usar image_url se disponível, caso contrário, usar o ícone
              const imageUrl = cat.image_url ? getOptimizedImageUrl(cat.image_url, { width: 64, height: 64, resize: 'cover' }, 'category_images') : undefined;

              return (
                <Link
                  key={cat.slug}
                  to={`/anuncios/categoria/${cat.slug}`}
                  className="group flex flex-col items-center justify-start gap-2 text-center w-24"
                >
                  <div className={cn(
                    "flex items-center justify-center h-16 w-16 rounded-full transition-all duration-300 ease-in-out group-hover:shadow-md group-hover:scale-105 overflow-hidden",
                    !imageUrl && styles.bg, // Aplica background color apenas se não houver imagem
                    !imageUrl && styles.hoverBg
                  )}>
                    {imageUrl ? (
                      <img src={imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                    ) : (
                      <Icon className={cn("h-8 w-8 flex-shrink-0", styles.text)} />
                    )}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors duration-300 whitespace-normal leading-tight line-clamp-2 overflow-hidden text-ellipsis">
                    {cat.name}
                  </span>
                </Link>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
};

export default SubHeader;