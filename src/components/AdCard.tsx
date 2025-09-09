import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/utils/formatters"; // Importando formatPrice

interface AdCardProps {
  id: string;
  title: string;
  price: number | string;
  location: string;
  image: string;
  oldPrice?: string;
}

const fetchUserFavorites = async (userId: string) => {
  const { data, error } = await supabase
    .from('favorites')
    .select('ad_id')
    .eq('user_id', userId);
  if (error) throw error;
  return new Set(data.map(fav => fav.ad_id));
};

const toggleFavoriteStatus = async ({ userId, adId, isFavorited }: { userId: string; adId: string; isFavorited: boolean }) => {
  if (isFavorited) {
    const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('ad_id', adId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('favorites').insert({ user_id: userId, ad_id: adId });
    if (error) throw error;
  }
};

export const AdCard = ({ id, title, price, location, image, oldPrice }: AdCardProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: userFavorites, isLoading: isLoadingFavorites } = useQuery({
    queryKey: ['userFavorites', user?.id],
    queryFn: () => fetchUserFavorites(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const isFavorited = userFavorites?.has(id) || false;

  const toggleFavoriteMutation = useMutation({
    mutationFn: toggleFavoriteStatus,
    onMutate: async ({ adId, isFavorited }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['userFavorites', user?.id] });
      const previousFavorites = queryClient.getQueryData<Set<string>>(['userFavorites', user?.id]);
      
      if (previousFavorites) {
        const newFavorites = new Set(previousFavorites);
        if (isFavorited) {
          newFavorites.delete(adId);
        } else {
          newFavorites.add(adId);
        }
        queryClient.setQueryData(['userFavorites', user?.id], newFavorites);
      }
      return { previousFavorites };
    },
    onError: (err, variables, context) => {
      showError(err.message);
      if (context?.previousFavorites) {
        queryClient.setQueryData(['userFavorites', user?.id], context.previousFavorites);
      }
    },
    onSuccess: (_, variables) => {
      showSuccess(variables.isFavorited ? "Removido dos favoritos!" : "Adicionado aos favoritos!");
      queryClient.invalidateQueries({ queryKey: ['userFavorites', user?.id] });
    },
  });

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to ad details
    if (!user) {
      showError("Você precisa estar logado para favoritar anúncios.");
      return;
    }
    toggleFavoriteMutation.mutate({ userId: user.id, adId: id, isFavorited });
  };

  return (
    <Link to={`/ad/${id}`}>
      <Card className="overflow-hidden group rounded-lg shadow-sm hover:shadow-md transition-shadow h-full">
        <div className="relative">
          <img
            src={image}
            alt={title}
            className="w-full h-40 object-cover md:h-48"
            loading="lazy"
          />
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-full h-8 w-8"
            onClick={handleToggleFavorite}
            disabled={isLoadingFavorites || toggleFavoriteMutation.isPending}
          >
            <Heart className={cn("h-4 w-4", isFavorited ? "text-red-500 fill-red-500" : "text-muted-foreground")} />
          </Button>
        </div>
        <CardContent className="p-3 md:p-4">
          <h3 className="text-sm md:text-md font-semibold mb-1 truncate">{title}</h3>
          <div className="flex items-baseline gap-2">
            <p className="text-md md:text-lg font-bold text-accent">{formatPrice(price)}</p>
            {oldPrice && <p className="text-xs md:text-sm text-muted-foreground line-through">{oldPrice}</p>}
          </div>
          <div className="flex items-center text-xs md:text-sm text-muted-foreground mt-1">
            <MapPin className="h-3 w-3 md:h-4 md:w-4 mr-1" />
            <span>{location}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};