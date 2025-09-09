import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { showError, showSuccess } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Trash2, Loader2 } from "lucide-react"; // Import Loader2
import { formatPrice } from "@/utils/formatters"; // Importando formatPrice
import { useState, useEffect } from "react";
import { useInView } from 'react-intersection-observer';

// Modificado para aceitar pageParam e pageSize
const fetchAds = async ({ pageParam = 0, pageSize = 20, statusFilter }: { pageParam?: number; pageSize?: number; statusFilter?: string; }) => {
  const offset = pageParam * pageSize;
  let query = supabase
    .from('advertisements')
    .select('*, profiles(full_name)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const hasMore = (count || 0) > (offset + (data?.length || 0));
  return { ads: data || [], nextPage: hasMore ? pageParam + 1 : undefined };
};

const ManageAdsPage = () => {
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState<string>('pending');
  const { ref, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingAds,
    error,
  } = useInfiniteQuery({
    queryKey: ['adminAds', currentTab],
    queryFn: ({ pageParam }) => fetchAds({ pageParam, statusFilter: currentTab === 'all' ? undefined : currentTab }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase
        .from('advertisements')
        .update({ status })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAds'] }); // Invalida todas as tabs para recarregar
      showSuccess("Status do anúncio atualizado!");
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const handleUpdateStatus = (id: string, status: string) => {
    mutation.mutate({ id, status });
  };

  const allAds = data?.pages.flatMap(page => page.ads) || [];

  const renderAdsTable = () => {
    if (isLoadingAds) {
        return <div className="space-y-2 mt-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
    }

    if (error) {
      return <p className="text-destructive">Falha ao carregar anúncios: {error.message}</p>;
    }

    if (allAds.length === 0) {
      return <p className="text-center text-muted-foreground p-8">Nenhum anúncio encontrado para esta categoria.</p>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Usuário</TableHead>
            <TableHead>Preço</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allAds.map((ad) => (
            <TableRow key={ad.id}>
              <TableCell className="font-medium">{ad.title}</TableCell>
              <TableCell>{(ad.profiles as any)?.full_name || 'N/A'}</TableCell>
              <TableCell>{formatPrice(ad.price || 0)}</TableCell>
              <TableCell><Badge variant={ad.status === 'approved' ? 'default' : 'secondary'}>{ad.status}</Badge></TableCell>
              <TableCell>{format(new Date(ad.created_at!), 'dd/MM/yyyy')}</TableCell>
              <TableCell className="text-right">
                {ad.status === 'pending_approval' && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleUpdateStatus(ad.id, 'approved')} disabled={mutation.isPending}>
                      {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleUpdateStatus(ad.id, 'rejected')} disabled={mutation.isPending}>
                      {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 text-red-500" />}
                    </Button>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Anúncios</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" onValueChange={setCurrentTab}>
            <TabsList>
                <TabsTrigger value="pending_approval">Pendentes</TabsTrigger>
                <TabsTrigger value="approved">Aprovados</TabsTrigger>
                <TabsTrigger value="rejected">Rejeitados</TabsTrigger>
                <TabsTrigger value="all">Todos</TabsTrigger>
            </TabsList>
            <TabsContent value={currentTab}>
              {renderAdsTable()}
              <div ref={ref} className="col-span-full text-center py-4">
                {isFetchingNextPage && <p>Carregando mais anúncios...</p>}
                {!hasNextPage && allAds.length > 0 && <p>Você viu todos os anúncios!</p>}
              </div>
            </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ManageAdsPage;