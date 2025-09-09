import { useState, useEffect } from 'react';
import { showError } from './toast';

interface GeolocationResult {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  error: string | null;
}

/**
 * Obtém a localização atual do usuário (latitude e longitude).
 * @returns Promise<GeolocationCoordinates | null>
 */
export const getCurrentPosition = (): Promise<GeolocationCoordinates | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      showError('Geolocalização não é suportada pelo seu navegador.');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(position.coords);
      },
      (error) => {
        let errorMessage = 'Erro ao obter a localização.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permissão de geolocalização negada.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Informações de localização indisponíveis.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Tempo limite excedido ao tentar obter a localização.';
            break;
        }
        showError(errorMessage);
        console.error('Geolocation error:', error);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

/**
 * Função placeholder para geocodificação reversa.
 * Em um ambiente de produção, você integraria uma API de geocodificação reversa real aqui (ex: Google Maps Geocoding API, OpenStreetMap Nominatim).
 * @param latitude Latitude do local.
 * @param longitude Longitude do local.
 * @returns Promise<{ city: string | null; state: string | null; neighborhood: string | null; }>
 */
export const reverseGeocode = async (latitude: number, longitude: number): Promise<{ city: string | null; state: string | null; neighborhood: string | null; }> => {
  console.warn('Usando geocodificação reversa SIMULADA. Integre uma API real para produção.');
  console.log(`Simulating reverse geocode for: Lat ${latitude}, Lng ${longitude}`);

  // Simulação simples:
  if (latitude > -22 && latitude < -21 && longitude > -55 && longitude < -54) { // Exemplo para Dourados, MS
    return { city: 'Dourados', state: 'MS', neighborhood: 'Centro' };
  } else if (latitude > -23 && latitude < -22 && longitude > -47 && longitude < -46) { // Exemplo para São Paulo, SP
    return { city: 'São Paulo', state: 'SP', neighborhood: 'Jardins' };
  }
  // Fallback para uma localização padrão se nenhuma das condições acima for atendida
  return { city: 'Localização Padrão', state: 'BR', neighborhood: null };
};

/**
 * Hook para obter a localização do usuário e realizar geocodificação reversa.
 */
export const useUserLocation = () => {
  const [location, setLocation] = useState<GeolocationResult>({
    latitude: null,
    longitude: null,
    city: null,
    state: null,
    neighborhood: null,
    error: null,
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  useEffect(() => {
    const fetchLocation = async () => {
      setIsLoadingLocation(true);
      const coords = await getCurrentPosition();
      if (coords) {
        const { latitude, longitude } = coords;
        console.log('Detected coordinates:', { latitude, longitude });
        const { city, state, neighborhood } = await reverseGeocode(latitude, longitude);
        console.log('Reverse geocode result:', { city, state, neighborhood });
        setLocation({ latitude, longitude, city, state, neighborhood, error: null });
      } else {
        setLocation(prev => ({ ...prev, error: 'Não foi possível obter a localização.', city: null, state: null, neighborhood: null }));
      }
      setIsLoadingLocation(false);
    };

    fetchLocation();
  }, []);

  return { ...location, isLoadingLocation };
};