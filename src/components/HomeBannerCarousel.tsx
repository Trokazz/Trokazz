"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Autoplay from 'embla-carousel-autoplay'; // Importar o plugin Autoplay

interface Banner {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  link_url: string | null;
  button_text: string | null;
  text_color: string | null;
  background_color: string | null;
}

const fetchHomeBanners = async (): Promise<Banner[]> => {
  const { data, error } = await supabase.rpc('get_home_banners');
  if (error) throw new Error(error.message);
  return data || [];
};

const HomeBannerCarousel: React.FC = () => {
  const { data: banners, isLoading, error } = useQuery<Banner[], Error>({
    queryKey: ['homeBanners'],
    queryFn: fetchHomeBanners,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutos
  });

  // Configuração do plugin Autoplay
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true }) // 5 segundos de delay, para ao interagir ou passar o mouse
  );

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-lg" />;
  }

  if (error) {
    console.error("Error loading banners:", error);
    return null; // Não renderiza se houver erro
  }

  if (!banners || banners.length === 0) {
    return null; // Não renderiza se não houver banners disponíveis
  }

  return (
    <Carousel
      className="w-full"
      plugins={[plugin.current]} // Adicionar o plugin ao carrossel
      opts={{
        loop: true, // Garante que o carrossel seja infinito
      }}
      onMouseEnter={plugin.current.stop} // Pausa ao passar o mouse
      onMouseLeave={plugin.current.reset} // Retoma ao tirar o mouse
    >
      <CarouselContent>
        {banners.map((banner) => (
          <CarouselItem key={banner.id}>
            <Card 
              className="relative w-full h-48 overflow-hidden rounded-lg flex items-center justify-center p-4"
              style={{ backgroundColor: banner.background_color || 'var(--primary)' }}
            >
              <img 
                src={banner.image_url} 
                alt={banner.title} 
                className="absolute inset-0 w-full h-full object-cover opacity-50" 
                loading="lazy"
              />
              <CardContent className="relative z-10 flex flex-col items-center justify-center text-center p-0 space-y-2">
                <h3 
                  className="text-xl font-bold leading-tight" 
                  style={{ color: banner.text_color || 'var(--primary-foreground)' }}
                >
                  {banner.title}
                </h3>
                {banner.description && (
                  <p 
                    className="text-sm text-balance" 
                    style={{ color: banner.text_color || 'var(--primary-foreground)' }}
                  >
                    {banner.description}
                  </p>
                )}
                {banner.link_url && banner.button_text && (
                  <Button asChild className="mt-3 bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Link to={banner.link_url}>{banner.button_text}</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      {/* As setas de navegação foram removidas daqui */}
    </Carousel>
  );
};

export default HomeBannerCarousel;