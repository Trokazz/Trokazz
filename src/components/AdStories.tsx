import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Skeleton } from "./ui/skeleton";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { getOptimizedImageUrl } from "@/lib/utils";

type AdStory = {
  id: string;
  title: string;
  image_urls: string[];
  category_name: string;
  category_slug: string;
};

const fetchAdStories = async () => {
  const { data, error } = await supabase.rpc('get_latest_ad_per_category');
  if (error) throw new Error("Falha ao carregar os destaques.");
  return (data || []) as AdStory[];
};

const placeholderStories: AdStory[] = [
    { id: '1', title: 'Carro Novo', image_urls: ['/placeholder.svg'], category_name: 'Veículos', category_slug: 'veiculos' },
    { id: '2', title: 'Apartamento', image_urls: ['/placeholder.svg'], category_name: 'Imóveis', category_slug: 'imoveis' },
    { id: '3', title: 'iPhone Usado', image_urls: ['/placeholder.svg'], category_name: 'Eletrônicos', category_slug: 'eletronicos' },
    { id: '4', title: 'Serviço de Frete', image_urls: ['/placeholder.svg'], category_name: 'Serviços', category_slug: 'servicos' },
    { id: '5', title: 'Mesa de Jantar', image_urls: ['/placeholder.svg'], category_name: 'Para sua Casa', category_slug: 'para-sua-casa' },
    { id: '6', title: 'Vaga de Dev', image_urls: ['/placeholder.svg'], category_name: 'Empregos', category_slug: 'vagas-de-emprego' },
    { id: '7', title: 'Hambúrguer', image_urls: ['/placeholder.svg'], category_name: 'Gastronomia', category_slug: 'gastronomia' },
    { id: '8', title: 'Trator Agrícola', image_urls: ['/placeholder.svg'], category_name: 'Agro', category_slug: 'agro-e-industria' },
];

const AdStories = () => {
  const { data: stories, isLoading } = useQuery({
    queryKey: ["adStories"],
    queryFn: fetchAdStories,
  });

  const displayStories = !isLoading && (!stories || stories.length === 0) ? placeholderStories : stories;
  const isPlaceholder = !isLoading && (!stories || stories.length === 0);

  if (isLoading) {
    return (
      <div className="w-full">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex w-max space-x-4 pb-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 w-20">
                <Skeleton className="h-20 w-20 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    );
  }

  if (!displayStories || displayStories.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4">Destaques por Categoria</h2>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex w-max space-x-4 pb-4">
          {displayStories.map((story) => (
            <Link
              key={story.id}
              to={isPlaceholder ? `/anuncios/categoria/${story.category_slug}` : `/anuncio/${story.id}`}
              className="group flex flex-col items-center gap-2 w-20 text-center"
            >
              <div className="h-20 w-20 rounded-full p-1 bg-gradient-to-tr from-primary to-accent-gradient transition-transform duration-300 group-hover:scale-105">
                <div className="h-full w-full bg-background rounded-full p-1">
                  <img
                    src={isPlaceholder ? story.image_urls[0] : getOptimizedImageUrl(story.image_urls[0], { width: 150, height: 150, resize: 'cover' }) || '/placeholder.svg'}
                    alt={story.title}
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>
              </div>
              <p className="text-xs font-medium text-muted-foreground truncate w-full group-hover:text-primary transition-colors">
                {story.category_name}
              </p>
            </Link>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default AdStories;