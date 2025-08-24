import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Heart, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { showError } from "@/utils/toast";
import { Badge } from "./ui/badge";
import { safeFormatDistanceToNow, getOptimizedImageUrl } from "@/lib/utils";
import { Advertisement, UserLevelDetails } from "@/types/database"; // Importa Advertisement e UserLevelDetails

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import * as Icons from "lucide-react"; // Importar todos os ícones Lucide

interface AdCardProps {
  ad: Advertisement;
  isInitiallyFavorited?: boolean;
}

const AdCard = ({ ad, isInitiallyFavorited = false }: AdCardProps) => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [isFavorited, setIsFavorited] = useState(isInitiallyFavorited);
  const isBoosted = ad.boosted_until && new Date(ad.boosted_until) > new Date();

  const formattedPrice = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(ad.price);

  const handleFavoriteClick = async () => {
    if (!user) {
      showError("Você precisa estar logado para favoritar anúncios.");
      return;
    }

    const currentlyFavorited = isFavorited;
    setIsFavorited(!currentlyFavorited); // Optimistic update

    try {
      if (currentlyFavorited) {
        const { error } = await supabase.from("favorites").delete().match({ user_id: user.id, ad_id: ad.id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("favorites").insert({ user_id: user.id, ad_id: ad.id });
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["favoriteAds"] });
      queryClient.invalidateQueries({ queryKey: ["userFavoriteIds"] });
    } catch (err) {
      setIsFavorited(currentlyFavorited); // Revert on error
      showError("Ocorreu um erro ao atualizar seus favoritos.");
    }
  };

  // Obtém a URL pública da primeira imagem usando o caminho relativo
  // A função getOptimizedImageUrl agora recebe o caminho relativo e o bucket
  const optimizedImageUrl = ad.image_urls?.[0] ? getOptimizedImageUrl(ad.image_urls[0], { width: 400, height: 400 }, 'advertisements') : undefined;

  const sellerLevel: UserLevelDetails | null | undefined = ad.profiles?.userLevelDetails;
  const LevelIcon = sellerLevel?.badge_icon ? (Icons as any)[sellerLevel.badge_icon] || Icons.User : Icons.User;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg h-full flex flex-col group relative">
      <Link to={`/anuncio/${ad.id}`} className="absolute inset-0 z-10" aria-label={ad.title} />
      {isBoosted && (
        <Badge className="absolute top-2 left-2 z-20 bg-yellow-400 text-black hover:bg-yellow-500 pointer-events-none">
          <Zap className="h-3 w-3 mr-1" />
          Destaque
        </Badge>
      )}
      {sellerLevel && sellerLevel.level_name !== 'newbie' && ( // Exibe o badge apenas se não for 'newbie'
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="absolute top-2 right-10 z-20 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50 cursor-help">
              <LevelIcon className="h-3 w-3 mr-1" />
              {sellerLevel.level_name}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{sellerLevel.description}</p>
          </TooltipContent>
        </Tooltip>
      )}
      <div className="flex flex-col h-full bg-card">
        <CardHeader className="p-0">
          <img
            src={optimizedImageUrl || '/placeholder.svg'}
            alt={ad.title}
            className="w-full h-48 object-cover"
            loading="lazy"
          />
        </CardHeader>
        <CardContent className="p-4 flex-grow">
          <CardTitle className="text-lg font-semibold mb-2 truncate">{ad.title}</CardTitle>
          <p className="text-xl font-bold text-foreground">{formattedPrice}</p>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          <p className="text-sm text-muted-foreground">{safeFormatDistanceToNow(ad.created_at)} - Dourados, MS</p>
        </CardFooter>
      </div>
      {user && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-20 bg-black/30 hover:bg-black/50 text-white rounded-full"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFavoriteClick();
          }}
          aria-label="Adicionar aos favoritos"
        >
          <Heart className={`h-5 w-5 transition-colors ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
        </Button>
      )}
    </Card>
  );
};

export default AdCard;