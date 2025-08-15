import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, UserCircle, MessageCircle, BadgeCheck, Phone } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useEffect } from "react";
import ReportAdDialog from "@/components/ReportAdDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSession } from "@/contexts/SessionContext";
import SendMessageButton from "@/components/SendMessageButton";
import MakeOfferDialog from "@/components/MakeOfferDialog";
import { safeFormatDate, getOptimizedImageUrl } from "@/lib/utils";
import ShareButtons from "@/components/ShareButtons";
import ErrorState from "@/components/ErrorState";
import usePageMetadata from "@/hooks/usePageMetadata"; // Importando o hook

const fetchAdDetails = async (id: string) => {
  const { data, error } = await supabase
    .from("advertisements")
    .select(`
      *,
      profiles ( id, full_name, phone, username, is_verified )
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

const AdDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useSession();
  const adUrl = window.location.href;

  useEffect(() => {
    if (id) {
      const incrementView = async () => {
        await supabase.rpc('increment_ad_view_count', { ad_id_param: id });
      };
      incrementView();
    }
  }, [id]);

  const { data: ad, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["adDetails", id],
    queryFn: () => fetchAdDetails(id!),
    enabled: !!id,
  });

  // Adicionando o hook usePageMetadata
  usePageMetadata({
    title: ad ? `${ad.title} - Trokazz` : "Detalhes do Anúncio - Trokazz",
    description: ad ? ad.description || `Confira este anúncio no Trokazz: ${ad.title}` : "Detalhes de um anúncio no Trokazz.",
    keywords: ad ? `${ad.title}, ${ad.category_slug}, ${ad.price}, dourados, ms, trokazz` : "anúncio, classificados, dourados, ms",
    ogTitle: ad ? ad.title : "Detalhes do Anúncio",
    ogDescription: ad ? ad.description || `Confira este anúncio no Trokazz: ${ad.title}` : "Detalhes de um anúncio no Trokazz.",
    ogImage: ad?.image_urls?.[0] ? getOptimizedImageUrl(ad.image_urls[0], { width: 1200, height: 630 }) : `${window.location.origin}/logo.png`,
    ogUrl: adUrl,
  });

  const formattedPrice = ad ? new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(ad.price) : "";

  const formattedDate = ad ? safeFormatDate(ad.created_at, "dd 'de' LLLL 'de' yyyy") : "";

  const handleWhatsAppClick = () => {
    if (ad?.profiles?.phone) {
      const phone = ad.profiles.phone.replace(/\D/g, '');
      const message = encodeURIComponent(`Olá, vi seu anúncio "${ad.title}" no Trokazz e tenho interesse!`);
      window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
        <Skeleton className="w-full h-96 rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      </div>
    );
  }

  if (isError) {
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  }

  if (!ad) {
    return (
      <div className="text-center py-10">
        <h2 className="text-xl font-semibold">Anúncio não encontrado</h2>
        <p className="text-muted-foreground mt-2">O anúncio que você está procurando não existe ou foi removido.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/">Voltar para a página inicial</Link>
        </Button>
      </div>
    );
  }

  const isOwner = user && ad.profiles && user.id === ad.profiles.id;

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-5">
          <div className="md:col-span-3">
            {ad.image_urls && ad.image_urls.length > 0 ? (
              <Carousel className="w-full">
                <CarouselContent>
                  {ad.image_urls.map((url, index) => (
                    <CarouselItem key={index}>
                      <div className="aspect-square w-full">
                        <img src={getOptimizedImageUrl(url, { width: 800, height: 800 })} alt={`${ad.title} - Imagem ${index + 1}`} className="w-full h-full object-cover" />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {ad.image_urls.length > 1 && (
                  <>
                    <CarouselPrevious className="absolute left-4" />
                    <CarouselNext className="absolute right-4" />
                  </>
                )}
              </Carousel>
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center aspect-square">
                <p>Sem imagem</p>
              </div>
            )}
          </div>
          <div className="md:col-span-2 p-6 flex flex-col">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-2xl font-bold">{ad.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-grow space-y-4">
              <p className="text-3xl font-bold text-primary">{formattedPrice}</p>
              
              <div className="mt-6 space-y-2">
                {isOwner ? (
                  <Button disabled className="w-full" size="lg">Este é o seu anúncio</Button>
                ) : user ? (
                  ad.profiles && (
                    <>
                      {ad.profiles.phone && (
                        <Button onClick={handleWhatsAppClick} className="w-full bg-green-500 hover:bg-green-600" size="lg">
                          <Phone className="mr-2 h-5 w-5" />
                          Contatar via WhatsApp
                        </Button>
                      )}
                      <SendMessageButton targetUser={ad.profiles} adId={ad.id} />
                      <MakeOfferDialog adId={ad.id} sellerId={ad.profiles.id} adTitle={ad.title} />
                    </>
                  )
                ) : (
                  <Button asChild className="w-full" size="lg">
                    <Link to="/login">
                      <MessageCircle className="mr-2 h-5 w-5" />
                      Faça login para contatar
                    </Link>
                  </Button>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-2 mt-6">Descrição</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{ad.description}</p>
              </div>

              <ShareButtons title={ad.title} url={adUrl} />
            </CardContent>
            <div className="mt-6 border-t pt-4 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                Vendido por:&nbsp;
                <div className="flex items-center gap-1">
                  {ad.profiles && ad.profiles.username ? (
                    <Link to={`/loja/${ad.profiles.username}`} className="font-bold text-primary hover:underline">
                      {ad.profiles.full_name}
                    </Link>
                  ) : (
                    <strong className="font-bold">{ad.profiles?.full_name || 'Usuário anônimo'}</strong>
                  )}
                  {ad.profiles?.is_verified && (
                    <Tooltip>
                      <TooltipTrigger>
                        <BadgeCheck className="h-4 w-4 fill-teal-500 text-white" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Vendedor Verificado</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <span>Publicado em: {formattedDate}</span>
              </div>
              <div className="pt-2">
                <ReportAdDialog adId={ad.id} />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdDetails;