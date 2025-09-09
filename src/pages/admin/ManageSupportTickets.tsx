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
import { Eye, MessageSquare, CheckCircle, XCircle, Loader2 } from "lucide-react"; // Import Loader2
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useInView } from 'react-intersection-observer';

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  type: string;
  status: 'new' | 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  profiles: { // Make profiles nullable
    full_name: string;
    email: string;
    avatar_url: string;
  } | null;
  ticket_messages: {
    id: string;
    sender_id: string;
    content: string;
    created_at: string;
    is_admin_message: boolean;
    profiles: { // Make message sender profiles nullable too
      full_name: string;
      avatar_url: string;
    } | null;
  }[];
}

const fetchSupportTickets = async ({ pageParam = 0, pageSize = 20, statusFilter }: { pageParam?: number; pageSize?: number; statusFilter?: Ticket['status'] | 'all'; }) => {
  const offset = pageParam * pageSize;
  let query = supabase
    .from('support_tickets')
    .select(`
      *,
      profiles ( full_name, email, avatar_url ),
      ticket_messages (
        id,
        sender_id,
        content,
        created_at,
        is_admin_message,
        profiles ( full_name, avatar_url )
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  query = query.range(offset, offset + pageSize - 1);

  const { data, error, count } = await query;

  if (error) throw new Error(error.message);

  const hasMore = (count || 0) > (offset + (data?.length || 0));
  return { tickets: data || [], nextPage: hasMore ? pageParam + 1 : undefined };
};

const updateTicketStatus = async ({ ticketId, status }: { ticketId: string, status: Ticket['status'] }) => {
  const { error } = await supabase
    .from('support_tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ticketId);
  if (error) throw new Error(error.message);
};

const sendTicketMessage = async ({ ticketId, senderId, content }: { ticketId: string, senderId: string, content: string }) => {
  const { error } = await supabase
    .from('ticket_messages')
    .insert({
      ticket_id: ticketId,
      sender_id: senderId,
      content,
      is_admin_message: true,
    });
  if (error) throw new Error(error.message);
};

const ManageSupportTicketsPage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [adminReply, setAdminReply] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { ref, inView } = useInView();

  const [currentTab, setCurrentTab] = useState<Ticket['status'] | 'all'>('new');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingTickets,
    error,
  } = useInfiniteQuery({
    queryKey: ['adminSupportTickets', currentTab],
    queryFn: ({ pageParam }) => fetchSupportTickets({ pageParam, statusFilter: currentTab }),
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
    mutationFn: updateTicketStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSupportTickets'] });
      showSuccess("Status do ticket atualizado!");
    },
    onError: (err: unknown) => {
      if (err instanceof Error) {
        showError(err.message);
      } else {
        showError("Ocorreu um erro desconhecido ao atualizar o status do ticket.");
      }
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: sendTicketMessage,
    onSuccess: () => {
      setAdminReply('');
      queryClient.invalidateQueries({ queryKey: ['adminSupportTickets'] });
      showSuccess("Mensagem enviada!");
    },
    onError: (err: unknown) => {
      if (err instanceof Error) {
        showError(err.message);
      } else {
        showError("Ocorreu um erro desconhecido ao enviar a mensagem.");
      }
    },
  });

  useEffect(() => {
    if (isDetailsDialogOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedTicket, isDetailsDialogOpen]);

  useEffect(() => {
    if (!selectedTicket?.id) return;

    const channel = supabase
      .channel(`ticket_messages:${selectedTicket.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${selectedTicket.id}` },
        (payload) => {
          queryClient.setQueryData(['adminSupportTickets'], (oldData: Ticket[] | undefined) => {
            if (!oldData) return [];
            return oldData.map(ticket =>
              ticket.id === selectedTicket.id
                ? { ...ticket, ticket_messages: [...(ticket.ticket_messages || []), payload.new] }
                : ticket
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicket?.id, queryClient]);

  const handleViewDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsDetailsDialogOpen(true);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTicket || adminReply.trim() === '') return;
    sendMessageMutation.mutate({ ticketId: selectedTicket.id, senderId: user.id, content: adminReply });
  };

  const allTickets = data?.pages.flatMap(page => page.tickets) || [];

  const renderTicketsTable = () => {
    if (isLoadingTickets) {
      return <div className="space-y-2 mt-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>;
    }

    if (error) {
      return <p className="text-destructive">Falha ao carregar tickets: {error.message}</p>;
    }

    if (allTickets.length === 0) {
      return <p className="text-center text-muted-foreground p-8">Nenhum ticket encontrado para esta categoria.</p>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Assunto</TableHead>
            <TableHead>Usuário</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Última Atualização</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allTickets.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell className="font-medium">{ticket.subject}</TableCell>
              <TableCell>{ticket.profiles?.full_name || 'Usuário Removido'}</TableCell>
              <TableCell>{ticket.type}</TableCell>
              <TableCell>
                <Badge variant={ticket.status === 'resolved' || ticket.status === 'closed' ? 'default' : 'secondary'}>
                  {ticket.status}
                </Badge>
              </TableCell>
              <TableCell>{format(new Date(ticket.updated_at), 'dd/MM/yyyy HH:mm')}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => handleViewDetails(ticket)} disabled={updateStatusMutation.isPending || sendMessageMutation.isPending}>
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
  const isSendingMessage = sendMessageMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Tickets de Suporte</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="new" onValueChange={setCurrentTab}>
            <TabsList>
              <TabsTrigger value="new">Novos</TabsTrigger>
              <TabsTrigger value="open">Abertos</TabsTrigger>
              <TabsTrigger value="in_progress">Em Progresso</TabsTrigger>
              <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
              <TabsTrigger value="closed">Fechados</TabsTrigger>
              <TabsTrigger value="all">Todos</TabsTrigger>
            </TabsList>
            <TabsContent value={currentTab}>
              {renderTicketsTable()}
              <div ref={ref} className="col-span-full text-center py-4">
                {isFetchingNextPage && <p>Carregando mais tickets...</p>}
                {!hasNextPage && allTickets.length > 0 && <p>Você viu todos os tickets!</p>}
              </div>
            </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Ticket #{selectedTicket?.id?.substring(0, 8)} - {selectedTicket?.subject}</DialogTitle>
            {/* Correção aplicada aqui: Verificação explícita para selectedTicket.profiles */}
            {selectedTicket?.profiles ? (
              <DialogDescription>
                Usuário: {selectedTicket.profiles.full_name || 'N/A'} ({selectedTicket.profiles.email || 'N/A'})
              </DialogDescription>
            ) : (
              <DialogDescription>Usuário: Usuário Removido ou Não Encontrado</DialogDescription>
            )}
          </DialogHeader>
          {selectedTicket && (
            <div className="flex-1 overflow-y-auto p-4 border rounded-md bg-muted/50 space-y-4">
              {/* Initial Message */}
              <div className="flex items-end gap-2 justify-start">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedTicket.profiles?.avatar_url || undefined} loading="lazy" />
                  <AvatarFallback>{selectedTicket.profiles?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="rounded-2xl p-3 max-w-[75%] bg-card text-card-foreground rounded-bl-none">
                  {/* Correção aplicada aqui: Verificação explícita para selectedTicket.profiles */}
                  <p className="font-semibold">{selectedTicket.profiles?.full_name || 'Usuário'}</p>
                  <p>{selectedTicket.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(selectedTicket.created_at), 'dd/MM/yyyy HH:mm')}</p>
                </div>
              </div>

              {/* Subsequent Messages */}
              {selectedTicket.ticket_messages?.map((msg) => (
                <div key={msg.id} className={cn("flex items-end gap-2", msg.is_admin_message ? "justify-end" : "justify-start")}>
                  {!msg.is_admin_message && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={msg.profiles?.avatar_url || undefined} loading="lazy" />
                      <AvatarFallback>{msg.profiles?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl p-3 max-w-[75%]",
                      msg.is_admin_message ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card text-card-foreground rounded-bl-none"
                    )}
                  >
                    <p className="font-semibold">{msg.profiles?.full_name || (msg.is_admin_message ? 'Admin' : 'Usuário')}</p>
                    <p>{msg.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(msg.created_at), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                  {msg.is_admin_message && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.user_metadata.avatar_url || undefined} loading="lazy" /> {/* Admin's avatar */}
                      <AvatarFallback>{user?.user_metadata.full_name?.charAt(0) || 'A'}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 mt-4">
            <Textarea
              placeholder="Digite sua resposta..."
              value={adminReply}
              onChange={(e) => setAdminReply(e.target.value)}
              className="flex-1 resize-none"
              rows={1}
              disabled={isSendingMessage}
            />
            <Button type="submit" size="icon" disabled={isSendingMessage || adminReply.trim() === ''}>
              {isSendingMessage ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageSquare className="h-5 w-5" />}
            </Button>
          </form>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)} disabled={isUpdatingStatus || isSendingMessage}>Fechar</Button>
            {selectedTicket?.status !== 'resolved' && selectedTicket?.status !== 'closed' && (
              <Button
                onClick={() => updateStatusMutation.mutate({ ticketId: selectedTicket!.id, status: 'resolved' })}
                disabled={isUpdatingStatus || isSendingMessage}
                className="bg-green-500 hover:bg-green-600"
              >
                {isUpdatingStatus ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Resolvendo...
                  </>
                ) : (
                  'Marcar como Resolvido'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ManageSupportTicketsPage;