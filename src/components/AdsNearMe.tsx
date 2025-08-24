import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { MapPin, LocateFixed, XCircle } from 'lucide-react';
import AdCard from './AdCard';
import { Advertisement } from '@/types/database';
import { showError } from '@/utils/toast';
import { Link } from 'react-router-dom';

interface UserLocation {
  latitude: number;
  longitude: number;
}

// Extend Advertisement type to include distance_km and flattened profile data from RPC
type NearbyAd = Advertisement & {
  distance_km: number;
  profiles_id: string;
  profiles_full_name: string | null;
  profiles_username: string | null;
  profiles_is_verified: boolean | null;
  profiles_user_level: string | null;
  profiles_userLevelDetails_level_name: string | null;
  profiles_userLevelDetails_description: string | null;
  profiles_userLevelDetails_badge_icon: string | null;
  profiles_userLevelDetails_boost_discount_percentage: number | null;
  profiles_userLevelDetails_min_transactions: number | null;
  profiles_userLevelDetails_min_avg_rating: number | null;
  profiles_userLevelDetails_priority: number | null;
};

const fetchNearbyAds = async (location: UserLocation | null, favoriteIds: string[]): Promise<Advertisement[]> => {
  if (!location) return [];

  const { data, error } = await supabase.rpc('get_nearby_ads', {
    p_latitude: location.latitude,
    p_longitude: location.longitude,
    p_radius_km: 20, // Default radius
    p_limit: 8,
  });

  if (error) {
    console.error("Error fetching nearby ads:", error);
    throw new Error(error.message);
  }

  // Map the flattened RPC data back to the expected Advertisement type structure
  return (data as NearbyAd[]).map(ad => ({
    ...ad,
    profiles: {
      id: ad.profiles_id,
      full_name: ad.profiles_full_name,
      username: ad.profiles_username,
      is_verified: ad.profiles_is_verified,
      user_level: ad.profiles_user_level,
      userLevelDetails: {
        level_name: ad.profiles_userLevelDetails_level_name,
        description: ad.profiles_userLevelDetails_description,
        badge_icon: ad.profiles_userLevelDetails_badge_icon,
        boost_discount_percentage: ad.profiles_userLevelDetails_boost_discount_percentage,
        min_transactions: ad.profiles_userLevelDetails_min_transactions,
        min_avg_rating: ad.profiles_userLevelDetails_min_avg_rating,
        priority: ad.profiles_userLevelDetails_priority,
      },
    },
    isInitiallyFavorited: favoriteIds.includes(ad.id),
  }));
};

interface AdsNearMeProps {
  favoriteIds: string[];
  isEnabled: boolean; // Novo prop para ativar/desativar
}

const AdsNearMe = ({ favoriteIds, isEnabled }: AdsNearMeProps) => {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unavailable'>('prompt');
  const [isLocating, setIsLocating] = useState(false);

  // Efeito para gerenciar a obtenção da localização com base em `isEnabled`
  useEffect(() => {
    if (isEnabled) {
      // Se ativado, tenta obter a localização
      if (navigator.permissions) {
        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
          setLocationPermissionStatus(result.state);
          if (result.state === 'granted') {
            getUserLocation();
          }
          result.onchange = () => {
            setLocationPermissionStatus(result.state);
            if (result.state === 'granted') {
              getUserLocation();
            } else {
              setUserLocation(null);
            }
          };
        });
      } else if (navigator.geolocation) {
        setLocationPermissionStatus('prompt');
        getUserLocation(); // Tenta obter a localização diretamente se Permissions API não estiver disponível
      } else {
        setLocationPermissionStatus('unavailable');
      }
    } else {
      // Se desativado, limpa a localização e o status
      setUserLocation(null);
      setLocationPermissionStatus('prompt'); // Reseta para 'prompt' quando desativado
      setIsLocating(false);
    }
  }, [isEnabled]); // Depende apenas de isEnabled

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      showError("Geolocalização não é suportada pelo seu navegador.");
      setLocationPermissionStatus('unavailable');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationPermissionStatus('granted');
        setIsLocating(false);
      },
      (err) => {
        console.error("Error getting location:", err);
        showError("Não foi possível obter sua localização. Verifique as permissões do navegador.");
        setLocationPermissionStatus('denied');
        setUserLocation(null);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const { data: nearbyAds, isLoading, isError, error, refetch } = useQuery<Advertisement[]>({
    queryKey: ['nearbyAds', userLocation, favoriteIds],
    queryFn: () => fetchNearbyAds(userLocation, favoriteIds),
    enabled: !!userLocation && isEnabled, // Só busca se a localização estiver disponível E o componente estiver ativado
  });

  const handleRetryLocation = () => {
    setUserLocation(null); // Clear previous location
    getUserLocation();
  };

  if (!isEnabled) {
    return null; // Não renderiza nada se não estiver ativado
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" /> Anúncios Perto de Você
          </CardTitle>
          <CardDescription>
            Descubra itens à venda na sua região.
          </CardDescription>
        </div>
        {locationPermissionStatus === 'denied' && (
          <Button onClick={handleRetryLocation} variant="outline" size="sm">
            <LocateFixed className="mr-2 h-4 w-4" /> Tentar Localização
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLocating ? (
          <div className="flex flex-col items-center justify-center py-8">
            <LocateFixed className="h-12 w-12 animate-pulse text-primary mb-4" />
            <p className="text-muted-foreground">Buscando sua localização...</p>
            <Skeleton className="h-4 w-1/2 mt-4" />
          </div>
        ) : locationPermissionStatus === 'unavailable' ? (
          <div className="text-center py-8">
            <XCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-xl font-semibold">Geolocalização Indisponível</h3>
            <p className="text-muted-foreground mt-2">Seu navegador não suporta ou bloqueou a geolocalização.</p>
          </div>
        ) : locationPermissionStatus === 'denied' && !userLocation ? (
          <div className="text-center py-8">
            <XCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-xl font-semibold">Permissão de Localização Negada</h3>
            <p className="text-muted-foreground mt-2">
              Para ver anúncios próximos, por favor, permita o acesso à sua localização nas configurações do navegador.
            </p>
            <Button onClick={handleRetryLocation} className="mt-4">
              <LocateFixed className="mr-2 h-4 w-4" /> Tentar Novamente
            </Button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-8 text-destructive">
            <XCircle className="mx-auto h-12 w-12 mb-4" />
            <p>Erro ao carregar anúncios próximos: {error?.message}</p>
            <Button onClick={() => refetch()} className="mt-4">Tentar Novamente</Button>
          </div>
        ) : nearbyAds && nearbyAds.length > 0 ? (
          <div className="grid grid-cols-2 gap-6">
            {nearbyAds.map((ad) => (
              <AdCard key={ad.id} ad={ad} isInitiallyFavorited={favoriteIds.includes(ad.id)} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">Nenhum anúncio encontrado perto de você</h3>
            <p className="text-muted-foreground mt-2">
              Tente ajustar seu raio de busca ou publique seu próprio anúncio!
            </p>
            <Button asChild className="mt-4">
              <Link to="/novo-anuncio">Publicar Anúncio</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdsNearMe;