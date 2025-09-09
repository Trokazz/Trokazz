import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Eye, Gift, Heart } from "lucide-react"; // Removed Package2
import { Link, useNavigate, useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { showError, showSuccess } from "@/utils/toast";
import { formatPrice } from "@/utils/formatters";
import { useAuth } from "@/contexts/AuthContext";

const fetchAdDetails = async (adId: string) => {
  const { data, error } = await supabase
    .from('advertisements')
    .select('id, title, price, image_urls, user_id')
    .eq('id', adId)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

const fetchAdMetrics = async (adId: string) => {
  const { data, error } = await supabase.rpc('get_ad_metrics', { ad_id_param: adId });
  if (error) throw new Error(error.message);
  return data;
};

const ManageAdPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: ad, isLoading, error } = useQuery({
    queryKey: ['manageAd', id],
    queryFn: () => fetchAdDetails(id!),
    enabled: !!id,
  });

  const { data: metrics, isLoading: isLoadingMetrics, error: metricsError } = useQuery({
    queryKey: ['adMetrics', id],
    queryFn: () => fetchAdMetrics(id!),
    enabled: !!id,
  });

  const removeAdMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("ID do anúncio ausente.");
      const { error } = await supabase.from('advertisements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Anúncio removido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['userAds', user?.id] });
      navigate('/profile/my-ads');
    },
    onError: (error: any) => {
      showError(error.message);
    },
  });

  const renewAdMutation = useMutation({
    mutationFn: async () => {
      if (!user || !ad?.id) {
        throw new Error("Usuário não autenticado ou ID do anúncio ausente.");
      }
      const { error } = await supabase.rpc('renew_ad', { p_ad_id: ad.id, p_user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Anúncio renovado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['manageAd', id] });
      queryClient.invalidateQueries({ queryKey: ['userAds', user?.id] });
    },
    onError: (error: any) => {
      showError(error.message);
    },
  });

  if (isLoading || isLoadingMetrics) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-12 w-1/2" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (error || !ad) {
    return <div className="p-4 text-center">Anúncio não encontrado ou erro ao carregar.</div>;
  }

  if (metricsError) {
    console.error("Error fetching ad metrics:", metricsError);
  }

  const isRemoving = removeAdMutation.isPending;
  const isRenewing = renewAdMutation.isPending;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground p-4 flex items-center relative">
        <Button variant="ghost" size="icon" className="absolute left-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex-grow text-center">
          <div className="flex items-center justify-center gap-2">
            <img src="/logo.png" alt="Trokazz Logo" className="h-6 w-6" />
            <span className="font-semibold">Trokazz</span>
          </div>
          <h1 className="text-xl font-bold">Gerenciar Anúncio</h1>
        </div>
      </header>

      <main className="flex-1 p-4">
        <Card className="overflow-hidden shadow-lg">
          <img
            src={ad.image_urls?.[0] || '/placeholder.svg'}
            alt={ad.title}
            className="w-full h-56 object-cover"
            loading="lazy"
          />
          <CardContent className="p-4 text-center space-y-2">
            <h2 className="text-lg font-semibold">{ad.title}</h2>
            <p className="text-2xl font-bold text-accent">{formatPrice(ad.price)}</p>
          </CardContent>
        </Card>

        <div className="mt-6">
          <h2 className="text-xl font-bold mb-4">Métricas do Anúncio</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="flex flex-col items-center justify-center p-4">
              <Eye className="h-6 w-6 text-primary mb-2" />
              <p className="text-lg font-semibold">Visualizações</p>
              <p className="text-2xl font-bold text-accent">{metrics?.view_count?.toLocaleString() || 0}</p>
            </Card>
            <Card className="flex flex-col items-center justify-center p-4">
              <Gift className="h-6 w-6 text-primary mb-2" />
              <p className="text-lg font-semibold">Ofertas Recebidas</p>
              <p className="text-2xl font-bold text-accent">{metrics?.total_offers_received?.toLocaleString() || 0}</p>
            </Card>
            <Card className="flex flex-col items-center justify-center p-4">
              <Heart className="h-6 w-6 text-red-500 mb-2" />
              <p className="text-lg font-semibold">Favoritos</p>
              <p className="text-2xl font-bold text-accent">{metrics?.total_favorites?.toLocaleString() || 0}</p>
            </Card>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Button asChild className="w-full h-12 text-lg bg-accent hover:bg-accent/90" disabled={isRemoving || isRenewing}>
            <Link to={`/edit-ad/${ad.id}`}>
              Editar Anúncio
            </Link>
          </Button>
          
          <Button 
            onClick={() => renewAdMutation.mutate()} 
            disabled={isRemoving || isRenewing}
            className="w-full h-12 text-lg bg-blue-500 hover:bg-blue-600 text-white"
          >
            {isRenewing ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              'Renovar Anúncio'
            )}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full h-12 text-lg bg-destructive hover:bg-destructive/90" disabled={isRemoving || isRenewing}>
                Remover Anúncio
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso removerá permanentemente o seu anúncio.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isRemoving}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => removeAdMutation.mutate()} disabled={isRemoving} className="bg-destructive hover:bg-destructive/90">
                  {isRemoving ? 'Removendo...' : 'Remover'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button asChild className="w-full h-12 text-lg bg-primary hover:bg-primary/90" disabled={isRemoving || isRenewing}>
            <Link to={`/boost/${ad.id}`}>
              Destacar Anúncio
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ManageAdPage;