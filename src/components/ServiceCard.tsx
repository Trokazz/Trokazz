import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getOptimizedImageUrl } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client"; // Importar supabase

export type Service = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  pricing_type: string;
  image_url: string | null; // Agora armazena caminho relativo
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
};

interface ServiceCardProps {
  service: Service;
}

const ServiceCard = ({ service }: ServiceCardProps) => {
  const getPriceDisplay = () => {
    if (service.pricing_type === 'on_quote') return "Sob Orçamento";
    if (!service.price) return "Consulte";
    const formattedPrice = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(service.price);
    return service.pricing_type === 'hourly' ? `${formattedPrice}/hora` : formattedPrice;
  };

  // Obtém a URL pública da imagem de serviço usando o caminho relativo
  // A função getOptimizedImageUrl agora recebe o caminho relativo e o bucket
  const optimizedImageUrl = service.image_url ? getOptimizedImageUrl(service.image_url, { width: 400, height: 400 }, 'service_images') : undefined;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg h-full flex flex-col group">
      <Link to={`/servico/${service.id}`} className="flex flex-col h-full">
        <CardHeader className="p-0">
          <img
            src={optimizedImageUrl || '/placeholder.svg'}
            alt={service.title}
            className="w-full h-48 object-cover"
            loading="lazy"
          />
        </CardHeader>
        <CardContent className="p-4 flex-grow">
          <CardTitle className="text-lg font-semibold mb-2 truncate">{service.title}</CardTitle>
          <p className="text-xl font-bold text-foreground">{getPriceDisplay()}</p>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          {service.profiles && (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={getOptimizedImageUrl(service.profiles.avatar_url, { width: 80, height: 80 }, 'avatars')} loading="lazy" />
                <AvatarFallback>{service.profiles.full_name?.[0] || 'P'}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">{service.profiles.full_name}</span>
            </div>
          )}
        </CardFooter>
      </Link>
    </Card>
  );
};

export default ServiceCard;