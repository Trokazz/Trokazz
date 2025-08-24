import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, UserCircle, MessageCircle, BadgeCheck } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";
import { safeFormatDate, getOptimizedImageUrl } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const fetchServiceDetails = async (id: string) => {
  const { data, error } = await supabase
    .from("services")
    .select(`*, profiles ( id, full_name, username, is_verified )`)
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

const ServiceDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useSession();

  const { data: service, isLoading, isError, error } = useQuery({
    queryKey: ["serviceDetails", id],
    queryFn: () => fetchServiceDetails(id!),
    enabled: !!id,
  });

  const getPriceDisplay = () => {
    if (!service) return "";
    if (service.pricing_type === 'on_quote') return "Sob Orçamento";
    if (!service.price) return "Consulte";
    const formattedPrice = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(service.price);
    return service.pricing_type === 'hourly' ? `${formattedPrice}/hora` : formattedPrice;
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
    return <div className="text-center py-10 text-red-500">Erro: {error.message}</div>;
  }
  if (!service) {
    return <div className="text-center py-10">Serviço não encontrado.</div>;
  }

  const isOwner = user && service.profiles && user.id === service.profiles.id;

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-5">
          <div className="md:col-span-3">
            <img src={getOptimizedImageUrl(service.image_url, { width: 800, height: 800 }, 'service_images') || '/placeholder.svg'} alt={service.title} className="w-full h-full object-cover aspect-square" />
          </div>
          <div className="md:col-span-2 p-6 flex flex-col">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-2xl font-bold">{service.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-grow space-y-4">
              <p className="text-3xl font-bold text-primary">{getPriceDisplay()}</p>
              <div className="mt-6 space-y-2">
                {isOwner ? (
                  <Button disabled className="w-full" size="lg">Este é o seu serviço</Button>
                ) : user ? (
                  <Button className="w-full" size="lg">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Contatar Profissional
                  </Button>
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
                <h3 className="font-semibold mb-2 mt-6">Descrição do Serviço</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{service.description}</p>
              </div>
            </CardContent>
            <div className="mt-6 border-t pt-4 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                Oferecido por:&nbsp;
                <div className="flex items-center gap-1">
                  {service.profiles && service.profiles.username ? (
                    <Link to={`/loja/${service.profiles.username}`} className="font-bold text-primary hover:underline">
                      {service.profiles.full_name}
                    </Link>
                  ) : (
                    <strong className="font-bold">{service.profiles?.full_name || 'Profissional'}</strong>
                  )}
                  {service.profiles?.is_verified && (
                    <Tooltip>
                      <TooltipTrigger>
                        <BadgeCheck className="h-4 w-4 fill-teal-500 text-white" />
                      </TooltipTrigger>
                      <TooltipContent><p>Profissional Verificado</p></TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <span>Publicado em: {safeFormatDate(service.created_at, "dd 'de' LLLL 'de' yyyy")}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ServiceDetails;