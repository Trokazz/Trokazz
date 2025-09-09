import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

const fetchAds = async () => {
  const { data, error } = await supabase
    .from('advertisements')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

const updateAdStatus = async ({ id, status }: { id: string, status: string }) => {
  const { error } = await supabase
    .from('advertisements')
    .update({ status })
    .eq('id', id);
  if (error) throw new Error(error.message);
};

const ManageAdsPage = () => {
  const queryClient = useQueryClient();
  const { data: ads, isLoading, error } = useQuery({
    queryKey: ['adminAds'],
    queryFn: fetchAds,
  });

  const mutation = useMutation({
    mutationFn: updateAdStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAds'] });
      showSuccess("Status do anúncio atualizado!");
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const handleUpdateStatus = (id: string, status: string) => {
    mutation.mutate({ id, status });
  };

  const renderAdsTable = (statusFilter?: string) => {
    const filteredAds = statusFilter ? ads?.filter(ad => ad.status === statusFilter) : ads;

    if (isLoading) {
        return <div className="space-y-2 mt-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
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
          {filteredAds?.map((ad) => (
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
        {error ? <p className="text-destructive">Falha ao carregar anúncios.</p> : (
            <Tabs defaultValue="pending">
                <TabsList>
                    <TabsTrigger value="pending">Pendentes</TabsTrigger>
                    <TabsTrigger value="approved">Aprovados</TabsTrigger>
                    <TabsTrigger value="rejected">Rejeitados</TabsTrigger>
                    <TabsTrigger value="all">Todos</TabsTrigger>
                </TabsList>
                <TabsContent value="pending">{renderAdsTable('pending_approval')}</TabsContent>
                <TabsContent value="approved">{renderAdsTable('approved')}</TabsContent>
                <TabsContent value="rejected">{renderAdsTable('rejected')}</TabsContent>
                <TabsContent value="all">{renderAdsTable()}</TabsContent>
            </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default ManageAdsPage;