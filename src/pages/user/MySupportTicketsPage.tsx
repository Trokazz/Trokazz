"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MobilePageHeader from '@/components/MobilePageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LifeBuoy, MessageSquare, Loader2, Send, PlusCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/utils/toast';

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string; // Initial message
  type: string;
  status: 'new' | 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  ticket_messages: {
    id: string;
    sender_id: string;
    content: string;
    created_at: string;
    is_admin_message: boolean;
    profiles: { full_name: string; avatar_url: string; } | null;
  }[];
}

const fetchUserTickets = async (userId: string): Promise<Ticket[]> => {
  const { data, error } = await supabase
    .from('support_tickets')
    .select(`
      *,
      ticket_messages (
        id,
        sender_id,
        content,
        created_at,
        is_admin_message,
        profiles ( full_name, avatar_url )
      )
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false }); // Order by last update

  if (error) throw new Error(error.message);
  return data as Ticket[];
};

const sendTicketMessage = async ({ ticketId, senderId, content }: { ticketId: string, senderId: string, content: string }) => {
  const { error } = await supabase
    .from('ticket_messages')
    .insert({
      ticket_id: ticketId,
      sender_id: senderId,
      content,
      is_admin_message: false, // User message
    });
  if (error) throw new Error(error.message);
};

const MySupportTicketsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isTicketDetailsOpen, setIsTicketDetailsOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: tickets, isLoading, error } = useQuery<Ticket[], Error>({
    queryKey: ['userSupportTickets', user?.id],
    queryFn: () => fetchUserTickets(user!.id),
    enabled: !!user,
  });

  const sendMessageMutation = useMutation({
    mutationFn: sendTicketMessage,
    onSuccess: () => {
      setNewMessage('');
      // Invalidate to refetch the specific ticket with new message
      queryClient.invalidateQueries({ queryKey: ['userSupportTickets', user?.id] });
      // Also update the selectedTicket state directly for immediate UI feedback
      if (selectedTicket) {
        queryClient.setQueryData(['userSupportTickets', user?.id], (oldData: Ticket[] | undefined) => {
          if (!oldData) return [];
          return oldData.map(ticket =>
            ticket.id === selectedTicket.id
              ? {
                  ...ticket,
                  ticket_messages: [...(ticket.ticket_messages || []), {
                    id: 'temp-' + Date.now(), // Temporary ID for optimistic update
                    sender_id: user!.id,
                    content: newMessage,
                    created_at: new Date().toISOString(),
                    is_admin_message: false,
                    profiles: { full_name: user?.user_metadata.full_name || 'Você', avatar_url: user?.user_metadata.avatar_url || '' }
                  }],
                  updated_at: new Date().toISOString(),
                }
              : ticket
          );
        });
      }
    },
    onError: (err: any) => showError(err.message),
  });

  useEffect(() => {
    if (isTicketDetailsOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedTicket, isTicketDetailsOpen]);

  useEffect(() => {
    if (!selectedTicket?.id || !user) return;

    const channel = supabase
      .channel(`ticket_messages:${selectedTicket.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${selectedTicket.id}` },
        (payload) => {
          // Only update if the message is not from the current user (optimistic update already handled it)
          if (payload.new.sender_id !== user.id) {
            queryClient.setQueryData(['userSupportTickets', user.id], (oldData: Ticket[] | undefined) => {
              if (!oldData) return [];
              return oldData.map(ticket =>
                ticket.id === selectedTicket.id
                  ? { ...ticket, ticket_messages: [...(ticket.ticket_messages || []), payload.new], updated_at: new Date().toISOString() }
                  : ticket
              );
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicket?.id, user, queryClient]);

  const handleOpenTicketDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsTicketDetailsOpen(true);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTicket || newMessage.trim() === '') return;
    sendMessageMutation.mutate({ ticketId: selectedTicket.id, senderId: user.id, content: newMessage });
  };

  if (!user) {
    return (
      <div className="flex flex-col h-full bg-background">
        <MobilePageHeader title="Meus Tickets de Suporte" />
        <main className="flex-1 p-4 flex items-center justify-center">
          <div className="text-center text-muted-foreground pt-8">
            <LifeBuoy className="h-12 w-12 mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">Faça login para ver seus tickets de suporte.</p>
            <Button asChild>
              <Link to="/auth">Fazer Login</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <MobilePageHeader title="Meus Tickets de Suporte" />
      <main className="flex-1 p-4 space-y-4">
        <Button asChild className="w-full bg-accent hover:bg-accent/90">
          <Link to="/support">
            <PlusCircle className="mr-2 h-4 w-4" /> Abrir Novo Ticket
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Meus Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : tickets && tickets.length > 0 ? (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-3 border rounded-lg shadow-sm cursor-pointer hover:bg-secondary transition-colors"
                    onClick={() => handleOpenTicketDetails(ticket)}
                  >
                    <div>
                      <p className="font-semibold">{ticket.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        Tipo: {ticket.type} | Última atualização: {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    <Badge variant={ticket.status === 'resolved' || ticket.status === 'closed' ? 'default' : 'secondary'}>
                      {ticket.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground py-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg font-semibold mb-2">Você ainda não abriu nenhum ticket de suporte.</p>
                <p className="mb-4">Precisa de ajuda? Abra um ticket agora!</p>
                <Button asChild>
                  <Link to="/support">
                    <LifeBuoy className="mr-2 h-4 w-4" /> Abrir Ticket
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={isTicketDetailsOpen} onOpenChange={setIsTicketDetailsOpen}>
        <DialogContent className="sm:max-w-[700px] flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Ticket #{selectedTicket?.id?.substring(0, 8)} - {selectedTicket?.subject}</DialogTitle>
            <DialogDescription>
              Status: <Badge>{selectedTicket?.status}</Badge>
            </DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <>
              <ScrollArea className="flex-1 p-4 border rounded-md bg-muted/50 space-y-4">
                {/* Initial Message */}
                <div className="flex items-end gap-2 justify-start">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.user_metadata.avatar_url || undefined} loading="lazy" />
                    <AvatarFallback>{user?.user_metadata.full_name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="rounded-2xl p-3 max-w-[75%] bg-card text-card-foreground rounded-bl-none">
                    <p className="font-semibold">Você</p>
                    <p>{selectedTicket.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(selectedTicket.created_at), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                </div>

                {/* Subsequent Messages */}
                {selectedTicket.ticket_messages?.map((msg) => (
                  <div key={msg.id} className={cn("flex items-end gap-2", msg.sender_id === user?.id ? "justify-end" : "justify-start")}>
                    {msg.sender_id !== user?.id && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={msg.profiles?.avatar_url || undefined} loading="lazy" />
                        <AvatarFallback>{msg.profiles?.full_name?.charAt(0) || 'A'}</AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        "rounded-2xl p-3 max-w-[75%]",
                        msg.sender_id === user?.id ? "bg-accent text-accent-foreground rounded-br-none" : "bg-card text-card-foreground rounded-bl-none"
                      )}
                    >
                      <p className="font-semibold">{msg.sender_id === user?.id ? 'Você' : msg.profiles?.full_name || 'Admin'}</p>
                      <p>{msg.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(msg.created_at), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                    {msg.sender_id === user?.id && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.user_metadata.avatar_url || undefined} loading="lazy" />
                        <AvatarFallback>{user?.user_metadata.full_name?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </ScrollArea>
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 mt-4">
                <Textarea
                  placeholder="Digite sua resposta..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 resize-none"
                  rows={1}
                  disabled={sendMessageMutation.isPending || selectedTicket.status === 'resolved' || selectedTicket.status === 'closed'}
                />
                <Button type="submit" size="icon" disabled={sendMessageMutation.isPending || newMessage.trim() === '' || selectedTicket.status === 'resolved' || selectedTicket.status === 'closed'}>
                  {sendMessageMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </form>
            </>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsTicketDetailsOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MySupportTicketsPage;