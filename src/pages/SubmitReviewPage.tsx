import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import SubmitReviewForm from '@/components/SubmitReviewForm';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const fetchSellerProfile = async (sellerId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', sellerId)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

const SubmitReviewPage: React.FC = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();

  const { data: sellerProfile, isLoading, error } = useQuery({
    queryKey: ['sellerProfileForReview', sellerId],
    queryFn: () => fetchSellerProfile(sellerId!),
    enabled: !!sellerId,
  });

  if (!sellerId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-destructive p-4">
        <p className="text-lg font-semibold">ID do vendedor não fornecido.</p>
        <Button onClick={() => navigate(-1)} className="mt-4">Voltar</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary text-primary-foreground flex flex-col p-4">
        <header className="flex items-center p-4 text-center relative">
          <Skeleton className="h-6 w-6 absolute left-4 top-1/2 -translate-y-1/2" />
          <Skeleton className="h-8 w-48 mx-auto" />
        </header>
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <Skeleton className="h-8 w-3/4 mx-auto mb-2" />
              <Skeleton className="h-5 w-1/2 mx-auto" />
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-10 w-full" />
              <div className="grid grid-cols-3 gap-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (error || !sellerProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-destructive p-4">
        <p className="text-lg font-semibold">Erro ao carregar perfil do vendedor: {error?.message || "Vendedor não encontrado."}</p>
        <Button onClick={() => navigate(-1)} className="mt-4">Voltar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary text-primary-foreground flex flex-col">
      <header className="flex items-center p-4 text-center relative">
        <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold flex-grow">Avaliar Vendedor</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Avaliar {sellerProfile.full_name}</CardTitle>
            <p className="text-muted-foreground text-sm">
              Sua opinião é importante para a comunidade Trokazz.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <SubmitReviewForm sellerId={sellerId} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SubmitReviewPage;