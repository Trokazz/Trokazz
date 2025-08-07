import * as React from "react"
import Autoplay from "embla-carousel-autoplay"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
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

const fetchBanners = async () => {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const now = new Date();
  return data.filter(banner => {
    const startsAt = banner.starts_at ? new Date(banner.starts_at) : null;
    const endsAt = banner.ends_at ? new Date(banner.ends_at) : null;
    const isStarted = !startsAt || startsAt <= now;
    const isNotEnded = !endsAt || endsAt >= now;
    return isStarted && isNotEnded;
  });
};

const PromoBanner = () => {
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  )

  const { data: banners, isLoading } = useQuery({
    queryKey: ["promoBanners"],
    queryFn: fetchBanners,
  });

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
        {banners.map((banner) => (
          <CarouselItem key={banner.id}>
            <div
              className="relative rounded-lg overflow-hidden p-8 md:p-12 min-h-[256px] flex items-center bg-cover bg-center"
              style={{ backgroundImage: `url(${banner.image_url})` }}
            >
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
        ))}
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