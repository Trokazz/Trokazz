"use client";

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import WantedAdCard, { WantedAd } from '@/components/WantedAdCard'; // Importado WantedAdCard

const WantedAdsList: React.FC = () => {
  const [ads, setAds] = useState<WantedAd[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchWantedAds = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('wanted_ads')
          .select('*, profiles(full_name, avatar_url, username), categories(name)') // Incluído categories(name)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        // Mapear os dados para incluir category_name diretamente no objeto WantedAd
        const formattedAds = data.map(ad => ({
          ...ad,
          category_name: (ad.categories as { name: string } | null)?.name || ad.category_slug, // Usa o nome da categoria ou o slug como fallback
        }));

        setAds(formattedAds as WantedAd[]);
      } catch (err) {
        console.error('Error fetching wanted ads:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWantedAds();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Mural de Procurados</h1>
      <p className="text-center text-gray-600 mb-10">
        Encontre o que você precisa! Navegue pelos anúncios de procura ou crie o seu próprio.
      </p>

      <div className="flex justify-center mb-8">
        <Button asChild>
          <Link to="/procurar/novo">Criar Anúncio de Procura</Link>
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-red-500 text-center">Erro ao carregar o mural: {error.message}</p>}
      {!isLoading && !error && ads && ads.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {ads.map((ad) => (
            <WantedAdCard key={ad.id} ad={ad} />
          ))}
        </div>
      ) : (
        !isLoading && !error && <p className="text-center text-gray-500">Nenhum anúncio de procura ativo encontrado.</p>
      )}
    </div>
  );
};

export default WantedAdsList;