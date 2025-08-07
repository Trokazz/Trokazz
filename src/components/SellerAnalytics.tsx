import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Heart, Newspaper } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";

const fetchSellerAnalytics = async (userId: string) => {
  // Busca todos os anúncios do usuário para agregar estatísticas
  const { data: ads, error: adsError } = await supabase
    .from("advertisements")
    .select("id, title, view_count, status")
    .eq("user_id", userId);

  if (adsError) throw adsError;

  // Busca todos os favoritos dos anúncios do usuário
  const adIds = ads.map(ad => ad.id);
  const { count: totalFavorites, error: favoritesError } = await supabase
    .from("favorites")
    .select('*', { count: 'exact', head: true })
    .in("ad_id", adIds);

  if (favoritesError) throw favoritesError;

  // Agrega as estatísticas
  const totalViews = ads.reduce((sum, ad) => sum + (ad.view_count || 0), 0);
  const activeAds = ads.filter(ad => ad.status === 'approved' || ad.status === 'paused').length;
  
  const topAds = [...ads].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5);

  return {
    totalViews,
    totalFavorites: totalFavorites ?? 0,
    activeAds,
    topAds,
  };
};

const SellerAnalytics = () => {
  const { user } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ["sellerAnalytics", user?.id],
    queryFn: () => fetchSellerAnalytics(user!.id),
    enabled: !!user,
  });

  const statsCards = [
    { title: "Visualizações Totais", value: data?.totalViews, icon: Eye },
    { title: "Total de Favoritos", value: data?.totalFavorites, icon: Heart },
    { title: "Anúncios Ativos", value: data?.activeAds, icon: Newspaper },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {statsCards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{card.value}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 5 Anúncios Mais Vistos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Anúncio</TableHead>
                    <TableHead className="text-right">Visualizações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.topAds && data.topAds.length > 0 ? data.topAds.map(ad => (
                    <TableRow key={ad.id}>
                      <TableCell>
                        <Link to={`/anuncio/${ad.id}`} className="font-medium hover:underline">
                          {ad.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">{ad.view_count}</TableCell>
                    </TableRow>
                  )) : (
                      <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground">
                              Você ainda não teve visualizações em seus anúncios.
                          </TableCell>
                      </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerAnalytics;