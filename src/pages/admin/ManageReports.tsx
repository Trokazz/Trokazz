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
import { CheckCircle, XCircle, Eye, Loader2 } from "lucide-react"; // Import Loader2
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useInView } from 'react-intersection-observer';

interface Report {
  id: string;
  ad_id: string;
  reporter_id: string;
  reason: string;
  status: 'pending' | 'resolved';
  created_at: string;
  advertisements: {
    title: string;
    image_urls: string[];
  };
  profiles: {
    full_name: string;
    email: string;
  };
}

// Modificado para aceitar pageParam e pageSize
const fetchReports = async ({ pageParam = 0, pageSize = 20, statusFilter }: { pageParam?: number; pageSize?: number; statusFilter?: 'pending' | 'resolved'; }) => {
  const offset = pageParam * pageSize;
  let query = supabase
    .from('reports')
    .select(`
      id,
      ad_id,
      reporter_id,
      reason,
      status,
      created_at,
      advertisements ( title, image_urls ),
      profiles!reporter_id ( full_name, email )
    `, { count: 'exact' }) // Solicita a contagem total
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const hasMore = (count || 0) > (offset + (data?.length || 0));
  return { reports: data || [], nextPage: hasMore ? pageParam + 1 : undefined };
};

const resolveReportAndPenalize = async ({ reportId, adminId }: { reportId: string, adminId: string }) => {
  const { data, error } = await supabase.rpc('resolve_report_and_penalize_user', {
    p_report_id: reportId,
    p_admin_id: adminId,
  });
  if (error) throw new Error(error.message);
  return data;
};

const ManageReportsPage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [currentTab, setCurrentTab] = useState<'pending' | 'resolved' | 'all'>('pending');
  const { ref, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingReports,
    error,
  } = useInfiniteQuery({
    queryKey: ['adminReports', currentTab],
    queryFn: ({ pageParam }) => fetchReports({ pageParam, statusFilter: currentTab === 'all' ? undefined : currentTab }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const resolveReportMutation = useMutation({
    mutationFn: resolveReportAndPenalize,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
      queryClient.invalidateQueries({ queryKey: ['adminAds'] }); // Invalidate ads as well, since ad status might change
      showSuccess("Denúncia resolvida e usuário penalizado com sucesso!");
      setIsDetailsDialogOpen(false);
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const handleViewDetails = (report: Report) => {
    setSelectedReport(report);
    setIsDetailsDialogOpen(true);
  };

  const handleResolveReport = () => {
    if (!selectedReport || !user) return;
    resolveReportMutation.mutate({ reportId: selectedReport.id, adminId: user.id });
  };

  const allReports = data?.pages.flatMap(page => page.reports) || [];

  const renderReportsTable = () => {
    if (isLoadingReports) {
      return <div className="space-y-2 mt-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>;
    }

    if (error) {
      return <p className="text-destructive">Falha ao carregar denúncias: {error.message}</p>;
    }

    if (allReports.length === 0) {
      return <p className="text-center text-muted-foreground p-8">Nenhuma denúncia encontrada para esta categoria.</p>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Anúncio</TableHead>
            <TableHead>Denunciante</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allReports.map((report) => (
            <TableRow key={report.id}>
              <TableCell className="font-medium">{report.advertisements?.title || 'Anúncio Removido'}</TableCell>
              <TableCell>{report.profiles?.full_name || 'Usuário Removido'}</TableCell>
              <TableCell className="max-w-[200px] truncate">{report.reason}</TableCell>
              <TableCell>
                <Badge variant={report.status === 'pending' ? 'secondary' : 'default'}>
                  {report.status === 'pending' ? 'Pendente' : 'Resolvido'}
                </Badge>
              </TableCell>
              <TableCell>{format(new Date(report.created_at), 'dd/MM/yyyy')}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => handleViewDetails(report)} disabled={resolveReportMutation.isPending}>
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const isResolving = resolveReportMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Denúncias</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" onValueChange={(value) => setCurrentTab(value as 'pending' | 'resolved' | 'all')}>
            <TabsList>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="resolved">Resolvidas</TabsTrigger>
              <TabsTrigger value="all">Todas</TabsTrigger>
            </TabsList>
            <TabsContent value={currentTab}>
              {renderReportsTable()}
              <div ref={ref} className="col-span-full text-center py-4">
                {isFetchingNextPage && <p>Carregando mais denúncias...</p>}
                {!hasNextPage && allReports.length > 0 && <p>Você viu todas as denúncias!</p>}
              </div>
            </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Denúncia</DialogTitle>
            <DialogDescription>
              Revise os detalhes da denúncia e tome uma ação.
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Anúncio:</Label>
                <div className="col-span-3 flex items-center gap-2">
                  {selectedReport.advertisements?.image_urls?.[0] && (
                    <img src={selectedReport.advertisements.image_urls[0]} alt="Ad" className="w-12 h-12 object-cover rounded-md" loading="lazy" />
                  )}
                  <span className="font-medium">{selectedReport.advertisements?.title || 'Anúncio Removido'}</span>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Denunciante:</Label>
                <span className="col-span-3">{selectedReport.profiles?.full_name || 'Usuário Removido'} ({selectedReport.profiles?.email || 'N/A'})</span>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Motivo:</Label>
                <Textarea readOnly value={selectedReport.reason} className="col-span-3 h-32 resize-none" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Status:</Label>
                <Badge variant={selectedReport.status === 'pending' ? 'secondary' : 'default'}>
                  {selectedReport.status === 'pending' ? 'Pendente' : 'Resolvido'}
                </Badge>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)} disabled={isResolving}>Fechar</Button>
            {selectedReport?.status === 'pending' && (
              <Button
                onClick={handleResolveReport}
                disabled={isResolving}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isResolving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Resolvendo...
                  </>
                ) : (
                  'Resolver e Penalizar'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ManageReportsPage;