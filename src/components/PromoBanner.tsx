import * as React from "react"
import Autoplay from "embla-carousel-autoplay"
import { Link } from "react-router-dom"

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Button } from "./ui/button"
import { Skeleton } from "./ui/skeleton"
import { getOptimizedImageUrl } from "@/lib/utils"
import { supabase } from "@/integrations/supabase/client"; // Importar supabase
import { Banner } from "@/types/database"; // Importar Banner do types/database

interface PromoBannerProps {
  banners: Banner[] | null | undefined;
  isLoading: boolean; // Adicionado isLoading para o componente
}

const PromoBanner = ({ banners, isLoading }: PromoBannerProps) => {
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  )

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-lg" />;
  }

  if (!banners || banners.length === 0) {
    return null;
  }

  return (
    <Carousel
      plugins={[plugin.current]}
      className="w-full"
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
    >
      <CarouselContent>
        {banners.map((banner) => {
          // A função getOptimizedImageUrl agora recebe o caminho relativo e o bucket
          const optimizedImageUrl = banner.image_url ? getOptimizedImageUrl(banner.image_url, { width: 1200, height: 400 }, 'banners') : undefined;
          return (
            <CarouselItem key={banner.id}>
              <div
                className="relative rounded-lg overflow-hidden p-8 md:p-12 min-h-[256px] flex items-center bg-cover bg-center"
                style={{
                  backgroundColor: banner.background_color || '#f1f5f9',
                  // Remove backgroundImage do style para usar a tag img abaixo
                }}
              >
                {optimizedImageUrl && (
                  <img
                    src={optimizedImageUrl}
                    alt={banner.title}
                    className="absolute inset-0 w-full h-full object-cover z-0"
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 z-0" />
                <div className="relative z-10 text-left max-w-lg">
                  <h2
                    className="text-3xl lg:text-4xl font-bold leading-tight animate-fade-in-up"
                    style={{ color: banner.text_color || '#ffffff' }}
                  >
                    {banner.title}
                  </h2>
                  {banner.description && (
                    <p
                      className="mt-2 text-lg animate-fade-in-up"
                      style={{ color: banner.text_color || '#ffffff', opacity: 0.9, animationDelay: '0.2s' }}
                    >
                      {banner.description}
                    </p>
                  )}
                  {banner.button_text && banner.link_url && (
                    <Button asChild className="mt-4 rounded-full px-8 py-6 text-lg font-bold animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                      <Link to={banner.link_url}>{banner.button_text}</Link>
                    </Button>
                  )}
                </div>
              </div>
            </CarouselItem>
          )
        })}
      </CarouselContent>
      {banners.length > 1 && (
        <>
          <CarouselPrevious className="hidden sm:flex left-4" />
          <CarouselNext className="hidden sm:flex right-4" />
        </>
      )}
    </Carousel>
  )
}

export default PromoBanner