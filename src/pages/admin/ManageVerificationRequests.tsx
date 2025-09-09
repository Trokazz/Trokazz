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

interface VerificationRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  document_urls: string[] | null;
  rejection_reason: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

// Modificado para aceitar pageParam e pageSize
const fetchVerificationRequests = async ({ pageParam = 0, pageSize = 20, statusFilter }: { pageParam?: number; pageSize?: number; statusFilter?: 'pending' | 'approved' | 'rejected'; }) => {
  const offset = pageParam * pageSize;
  let query = supabase
    .from('verification_requests')
    .select(`
      *,
      profiles!user_id ( full_name, email )
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const hasMore = (count || 0) > (offset + (data?.length || 0));
  return { requests: data || [], nextPage: hasMore ? pageParam + 1 : undefined };
};

const updateVerificationRequestStatus = async ({ requestId, status, rejectionReason, adminId }: { requestId: string, status: 'approved' | 'rejected', rejectionReason?: string, adminId: string }) => {
  const { error } = await supabase
    .from('verification_requests')
    .update({
      status,
      rejection_reason: rejectionReason || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
    })
    .eq('id', requestId);
  if (error) throw new Error(error.message);

  // Also update the user's profile is_verified status
  const { data: requestData, error: fetchError } = await supabase
    .from('verification_requests')
    .select('user_id')
    .eq('id', requestId)
    .single();

  if (fetchError) throw new Error(`Failed to fetch user_id for request: ${fetchError.message}`);

  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({ is_verified: status === 'approved' })
    .eq('id', requestData.user_id);
  if (profileUpdateError) throw new Error(`Failed to update user profile: ${profileUpdateError.message}`);
};

const ManageVerificationRequestsPage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [currentTab, setCurrentTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const { ref, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingRequests,
    error,
  } = useInfiniteQuery({
    queryKey: ['adminVerificationRequests', currentTab],
    queryFn: ({ pageParam }) => fetchVerificationRequests({ pageParam, statusFilter: currentTab === 'all' ? undefined : currentTab }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const updateStatusMutation = useMutation({
    mutationFn: updateVerificationRequestStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminVerificationRequests'] });
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] }); // Invalidate users to reflect verification status
      showSuccess("Status da solicitação de verificação atualizado!");
      setIsDetailsDialogOpen(false);
      setRejectionReason('');
    },
    onError: (err) => showError(err.message),
  });

  const handleViewDetails = (request: VerificationRequest) => {
    setSelectedRequest(request);
    setRejectionReason(request.rejection_reason || '');
    setIsDetailsDialogOpen(true);
  };

  const handleApprove = () => {
    if (!selectedRequest || !user) return;
    updateStatusMutation.mutate({ requestId: selectedRequest.id, status: 'approved', adminId: user.id });
  };

  const handleReject = () => {
    if (!selectedRequest || !user) return;
    if (rejectionReason.trim() === '') {
      showError("Por favor, forneça um motivo para a rejeição.");
      return;
    }
    updateStatusMutation.mutate({ requestId: selectedRequest.id, status: 'rejected', rejectionReason, adminId: user.id });
  };

  const allRequests = data?.pages.flatMap(page => page.requests) || [];

  const renderRequestsTable = () => {
    if (isLoadingRequests) {
      return <div className="space-y-2 mt-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>;
    }

    if (error) {
      return <p className="text-destructive">Falha ao carregar solicitações: {error.message}</p>;
    }

    if (allRequests.length === 0) {
      return <p className="text-center text-muted-foreground p-8">Nenhuma solicitação de verificação encontrada para esta categoria.</p>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuário</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data da Solicitação</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allRequests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-medium">{request.profiles?.full_name || 'Usuário Removido'}</TableCell>
              <TableCell>{request.profiles?.email || 'N/A'}</TableCell>
              <TableCell>
                <Badge variant={request.status === 'approved' ? 'default' : request.status === 'rejected' ? 'destructive' : 'secondary'}>
                  {request.status}
                </Badge>
              </TableCell>
              <TableCell>{format(new Date(request.created_at), 'dd/MM/yyyy')}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => handleViewDetails(request)} disabled={updateStatusMutation.isPending}>
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const isUpdatingStatus = updateStatusMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Solicitações de Verificação</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" onValueChange={(value) => setCurrentTab(value as 'pending' | 'approved' | 'rejected' | 'all')}>
            <TabsList>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="approved">Aprovadas</TabsTrigger>
              <TabsTrigger value="rejected">Rejeitadas</TabsTrigger>
              <TabsTrigger value="all">Todas</TabsTrigger>
            </TabsList>
            <TabsContent value={currentTab}>
              {renderRequestsTable()}
              <div ref={ref} className="col-span-full text-center py-4">
                {isFetchingNextPage && <p>Carregando mais solicitações...</p>}
                {!hasNextPage && allRequests.length > 0 && <p>Você viu todas as solicitações!</p>}
              </div>
            </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação de Verificação</DialogTitle>
            <DialogDescription>
              Revise os documentos e decida sobre a verificação do usuário.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Usuário:</Label>
                <span className="col-span-3 font-medium">{selectedRequest.profiles?.full_name || 'Usuário Removido'} ({selectedRequest.profiles?.email || 'N/A'})</span>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Documentos:</Label>
                <div className="col-span-3 space-y-2">
                  {selectedRequest.document_urls && selectedRequest.document_urls.length > 0 ? (
                    selectedRequest.document_urls.map((url, index) => (
                      <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="block text-blue-500 hover:underline">
                        Documento {index + 1}
                      </a>
                    ))
                  ) : (
                    <span>Nenhum documento enviado.</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Status:</Label>
                <Badge variant={selectedRequest.status === 'approved' ? 'default' : selectedRequest.status === 'rejected' ? 'destructive' : 'secondary'}>
                  {selectedRequest.status}
                </Badge>
              </div>
              {selectedRequest.status === 'rejected' && selectedRequest.rejection_reason && (
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">Motivo da Rejeição:</Label>
                  <Textarea readOnly value={selectedRequest.rejection_reason} className="col-span-3 h-24 resize-none" />
                </div>
              )}
              {selectedRequest.status === 'pending' && (
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="rejection-reason" className="text-right pt-2">Motivo da Rejeição (se rejeitar):</Label>
                  <Textarea
                    id="rejection-reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Opcional, se a solicitação for rejeitada."
                    className="col-span-3 h-24 resize-none"
                    disabled={isUpdatingStatus}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)} disabled={isUpdatingStatus}>Fechar</Button>
            {selectedRequest?.status === 'pending' && (
              <>
                <Button
                  onClick={handleReject}
                  disabled={isUpdatingStatus}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {isUpdatingStatus ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Rejeitando...
                    </>
                  ) : (
                    'Rejeitar'
                  )}
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isUpdatingStatus}
                  className="bg-green-500 hover:bg-green-600"
                >
                  {isUpdatingStatus ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Aprovando...
                    </>
                  ) : (
                    'Aprovar'
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ManageVerificationRequestsPage;