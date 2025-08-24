import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, ArrowLeft, MessageSquare, Bug, Lightbulb, HelpCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSession } from "@/contexts/SessionContext";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/types/supabase"; // Importar o tipo Database

// Definindo um tipo preciso para o resultado da query de detalhes do ticket
type SupportTicketQueryResult = Pick<Database['public']['Tables']['support_tickets']['Row'], 'id' | 'user_id' | 'subject' | 'message' | 'type' | 'status' | 'created_at' | 'updated_at' | 'last_admin_reply_at' | 'last_user_reply_at'> & {
  profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url' | 'email'> | null;
};

// Definindo um tipo preciso para o resultado da query de mensagens do ticket
type TicketMessageQueryResult = Pick<Database['public']['Tables']['ticket_messages']['Row'], 'id' | 'ticket_id' | 'sender_id' | 'content' | 'is_admin_message' | 'created_at'> & {
  profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'full_name' | 'avatar_url'> | null;
};

const fetchTicketDetails = async (ticketId: string, userId: string): Promise<SupportTicketQueryResult | null> => {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*, profiles(id, full_name, avatar_url, email)")
    .eq("id", ticketId)
    .eq("user_id", userId) // Ensure user can only see their own tickets
    .single();
  if (error) throw error;
  return data;
};

const fetchTicketMessages = async (ticketId: string): Promise<TicketMessageQueryResult[]> => {
  const { data, error } = await supabase
    .from("ticket_messages")
    .select("*, profiles(full_name, avatar_url)")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as TicketMessageQueryResult[];
};

const UserTicketDetails = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user: currentUser } = useSession();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: ticket, isLoading: isLoadingTicket, isError: isTicketError, error: ticketError } = useQuery<SupportTicketQueryResult | null>({
    queryKey: ["userTicketDetails", ticketId, currentUser?.id],
    queryFn: () => fetchTicketDetails(ticketId!, currentUser!.id),
    enabled: !!ticketId && !!currentUser?.id,
  });

  const { data: messages, isLoading: isLoadingMessages, isError: isMessagesError, error: messagesError } = useQuery<TicketMessageQueryResult[]>({
    queryKey: ["userTicketMessages", ticketId],
    queryFn: () => fetchTicketMessages(ticketId!),
    enabled: !!ticketId,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`ticket_messages:${ticketId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ticket_messages', filter: `ticket_id=eq.${ticketId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["userTicketMessages", ticketId] });
          queryClient.invalidateQueries({ queryKey: ["userTicketDetails", ticketId, currentUser?.id] }); // To update last_user_reply_at/last_admin_reply_at
          queryClient.invalidateQueries({ queryKey: ["userSupportTickets", currentUser?.id] }); // For the main list
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, queryClient, currentUser?.id]);

  const handleSendMessage = async () => {
    if (newMessage.trim() === "" || !currentUser || !ticketId) return;

    const content = newMessage.trim();
    setNewMessage(""); // Clear input immediately

    const toastId = showLoading("Enviando mensagem...");
    try {
      const { error } = await supabase.from("ticket_messages").insert({
        ticket_id: ticketId,
        sender_id: currentUser.id,
        content: content,
        is_admin_message: false, // User messages are not admin messages
      });

      if (error) throw error;

      // Update last reply timestamp on the ticket
      const updatePayload: { last_user_reply_at?: string; status?: string } = {};
      updatePayload.last_user_reply_at = new Date().toISOString();
      // If ticket was resolved/closed, re-open it when user replies
      if (ticket?.status === 'resolved' || ticket?.status === 'closed') {
        updatePayload.status = 'in_progress';
      }

      await supabase.from('support_tickets').update(updatePayload).eq('id', ticketId);

      dismissToast(toastId);
      showSuccess("Mensagem enviada!");
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Não foi possível enviar a mensagem.");
      setNewMessage(content); // Restore content on error
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new': return <Badge variant="destructive" className="bg-red-500">Novo</Badge>;
      case 'in_progress': return <Badge variant="secondary" className="bg-blue-500 text-white">Em Progresso</Badge>;
      case 'resolved': return <Badge variant="default" className="bg-green-500">Resolvido</Badge>;
      case 'closed': return <Badge variant="outline">Fechado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'question': return <HelpCircle className="h-5 w-5 text-blue-500" />;
      case 'bug': return <Bug className="h-5 w-5 text-red-500" />;
      case 'suggestion': return <Lightbulb className="h-5 w-5 text-yellow-500" />;
      case 'other': return <MessageSquare className="h-5 w-5 text-gray-500" />;
      default: return null;
    }
  };

  if (isLoadingTicket || isLoadingMessages) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isTicketError || !ticket) {
    return <div className="text-center py-10 text-red-500">Erro: {ticketError?.message || "Ticket não encontrado ou você não tem permissão para vê-lo."}</div>;
  }
  if (isMessagesError) {
    return <div className="text-center py-10 text-red-500">Erro ao carregar mensagens: {messagesError?.message}</div>;
  }

  const allMessages = [
    {
      id: 'initial-message',
      ticket_id: ticket.id,
      sender_id: ticket.user_id || '',
      content: ticket.message,
      is_admin_message: false,
      created_at: ticket.created_at,
      profiles: ticket.profiles,
    },
    ...(messages || []),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return (
    <div className="flex flex-col h-[calc(100vh-150px)] max-w-4xl mx-auto border rounded-lg">
      <div className="flex items-center p-3 border-b">
        <Link to="/perfil?tab=support-tickets">
          <Button variant="ghost" size="icon" className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-grow">
          <CardTitle className="text-lg flex items-center gap-2">
            {getTypeIcon(ticket.type)}
            {ticket.subject}
          </CardTitle>
          <CardDescription className="text-sm">
            Status: {getStatusBadge(ticket.status)}
          </CardDescription>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {allMessages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex items-end gap-2",
              msg.sender_id === currentUser?.id ? "justify-end" : "justify-start"
            )}
          >
            {msg.sender_id !== currentUser?.id && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={msg.profiles?.avatar_url || undefined} />
                <AvatarFallback>{msg.profiles?.full_name?.[0] || 'A'}</AvatarFallback>
              </Avatar>
            )}
            <div
              className={cn(
                "max-w-xs md:max-w-md p-3 rounded-lg",
                msg.sender_id === currentUser?.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              <p className="text-sm">{msg.content}</p>
              <p className="text-xs opacity-70 mt-1 text-right">
                {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
              </p>
            </div>
            {msg.sender_id === currentUser?.id && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={currentUser?.user_metadata?.avatar_url || undefined} />
                <AvatarFallback>{currentUser?.user_metadata?.full_name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t">
        <div className="flex items-center gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua resposta..."
            rows={1}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button type="button" size="icon" onClick={handleSendMessage} disabled={!newMessage.trim()}>
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserTicketDetails;