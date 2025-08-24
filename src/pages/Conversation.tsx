import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, ArrowLeft, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { safeFormatDate, getOptimizedImageUrl } from "@/lib/utils";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
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
import { Database } from "@/types/supabase"; // Importar o tipo Database
import { ConversationWithDetails as FullConversationDetails } from "@/types/database"; // Importa o tipo completo

// Definindo um tipo preciso para o resultado da query de mensagens
type MessageQueryResult = Pick<Database['public']['Tables']['messages']['Row'], 'id' | 'content' | 'created_at' | 'sender_id' | 'is_read'> & {
  profiles: Pick<Database['public']['Tables']['profiles']['Row'], 'full_name' | 'avatar_url'> | null;
};

// Definindo um tipo preciso para o resultado da query de detalhes da conversa
type ConversationDetailsQueryResult = Pick<Database['public']['Tables']['conversations']['Row'], 'id' | 'conversation_type'> & {
  advertisements: Pick<Database['public']['Tables']['advertisements']['Row'], 'id' | 'title' | 'image_urls'> | null;
  wanted_ads: Pick<Database['public']['Tables']['wanted_ads']['Row'], 'id' | 'title'> | null;
  buyer: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url'> | null;
  seller: Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'avatar_url'> | null;
};

const fetchConversationDetails = async (conversationId: string): Promise<ConversationDetailsQueryResult | null> => {
  const { data, error } = await supabase
    .from("conversations")
    .select(`
      id,
      conversation_type,
      advertisements ( id, title, image_urls ),
      wanted_ads ( id, title ),
      buyer:profiles!conversations_buyer_id_fkey ( id, full_name, avatar_url ),
      seller:profiles!conversations_seller_id_fkey ( id, full_name, avatar_url )
    `)
    .eq("id", conversationId)
    .single();
  if (error) throw error;
  // Supabase pode retornar um array vazio para relações nulas em vez de null.
  // Ajustamos o retorno para garantir que seja um objeto ou null.
  return {
    ...data,
    advertisements: data.advertisements && Array.isArray(data.advertisements) ? data.advertisements[0] : data.advertisements,
    wanted_ads: data.wanted_ads && Array.isArray(data.wanted_ads) ? data.wanted_ads[0] : data.wanted_ads,
    buyer: data.buyer && Array.isArray(data.buyer) ? data.buyer[0] : data.buyer,
    seller: data.seller && Array.isArray(data.seller) ? data.seller[0] : data.seller,
  } as ConversationDetailsQueryResult;
};

const fetchMessages = async (conversationId: string): Promise<MessageQueryResult[]> => {
  const { data, error } = await supabase
    .from("messages")
    .select(`
      id,
      content,
      created_at,
      sender_id,
      is_read,
      profiles ( full_name, avatar_url )
    `)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as MessageQueryResult[];
};

const Conversation = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversation, isLoading: isLoadingConvo } = useQuery<ConversationDetailsQueryResult | null>({
    queryKey: ["conversationDetails", conversationId],
    queryFn: () => fetchConversationDetails(conversationId!),
    enabled: !!conversationId,
  });

  const { data: messages, isLoading: isLoadingMessages } = useQuery<MessageQueryResult[]>({
    queryKey: ["messages", conversationId],
    queryFn: () => fetchMessages(conversationId!),
    enabled: !!conversationId,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Marcar mensagens como lidas
  useEffect(() => {
    if (messages && user) {
      const unreadMessageIds = messages
        .filter(m => !m.is_read && m.sender_id !== user.id)
        .map(m => m.id);

      if (unreadMessageIds.length > 0) {
        const markAsRead = async () => {
          await supabase
            .from('messages')
            .update({ is_read: true })
            .in('id', unreadMessageIds);
        };
        markAsRead();
      }
    }
  }, [messages, user]);

  // Assinatura em tempo real
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newMessage.trim() === "" || !user || !conversationId) {
      return;
    }

    const content = newMessage.trim();
    setNewMessage(""); // Limpa o input imediatamente

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content,
    });

    if (error) {
      showError("Erro ao enviar mensagem: " + error.message);
      setNewMessage(content); // Restaura o conteúdo do input em caso de erro
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase.from('messages').delete().eq('id', messageId);
      if (error) throw error;
      showSuccess("Mensagem apagada.");
    } catch (error) {
      showError("Não foi possível apagar a mensagem.");
    }
  };

  const handleDeleteConversation = async () => {
    if (!conversationId) return;
    const toastId = showLoading("Apagando conversa...");
    try {
      // As mensagens serão automaticamente deletadas devido à restrição ON DELETE CASCADE
      const { error } = await supabase.from('conversations').delete().eq('id', conversationId);
      if (error) throw error;
      dismissToast(toastId);
      showSuccess("Conversa apagada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
      navigate("/inbox"); // Redireciona para a caixa de entrada
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Não foi possível apagar a conversa.");
    }
  };

  const otherUser = conversation && user
    ? (conversation.buyer?.id === user.id ? conversation.seller : conversation.buyer)
    : null;

  let displayAdTitle: string;
  let displayAdLink: string;

  if (conversation) {
    if (conversation.conversation_type === 'ad_chat') {
      displayAdTitle = conversation.advertisements?.title || 'Anúncio Removido';
      displayAdLink = conversation.advertisements?.id ? `/anuncio/${conversation.advertisements.id}` : '/inbox';
    } else if (conversation.conversation_type === 'wanted_ad_chat') {
      displayAdTitle = conversation.wanted_ads?.title || 'Procura Removida';
      displayAdLink = '/procurados'; // Link para a lista de procuras, já que não há página de detalhes
    } else {
      displayAdTitle = 'Conversa sobre um item'; // Fallback genérico
      displayAdLink = '/inbox';
    }
  } else {
    displayAdTitle = 'Conversa'; // Fallback se o objeto de conversa for nulo
    displayAdLink = '/inbox';
  }

  return (
    <div className="flex flex-col h-[calc(100vh-150px)] max-w-4xl mx-auto border rounded-lg">
      <div className="flex items-center p-3 border-b">
        <Link to="/inbox">
          <Button variant="ghost" size="icon" className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        {isLoadingConvo ? (
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
        ) : otherUser && (
          <div className="flex items-center gap-2 flex-grow">
            <Avatar>
              <AvatarImage src={getOptimizedImageUrl(otherUser.avatar_url, { width: 80, height: 80 }, 'avatars')} />
              <AvatarFallback>{otherUser.full_name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{otherUser.full_name}</p>
              <Link to={displayAdLink} className="text-xs text-muted-foreground hover:underline">
                {conversation?.conversation_type === 'ad_chat' ? "Anúncio: " : "Procura: "}
                {displayAdTitle}
              </Link>
            </div>
          </div>
        )}
        {/* Botão de apagar conversa */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive ml-auto">
              <Trash2 className="h-5 w-5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente esta conversa e todas as suas mensagens.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConversation}>
                Sim, apagar conversa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingMessages && <p>Carregando mensagens...</p>}
        {messages?.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex items-end gap-2 group",
              message.sender_id === user?.id ? "justify-end" : "justify-start"
            )}
          >
            {message.sender_id === user?.id && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100"
                onClick={() => handleDeleteMessage(message.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {message.sender_id !== user?.id && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={getOptimizedImageUrl(message.profiles?.avatar_url, { width: 64, height: 64 }, 'avatars')} />
                <AvatarFallback>{message.profiles?.full_name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
            )}
            <div
              className={cn(
                "max-w-xs md:max-w-md p-3 rounded-lg",
                message.sender_id === user?.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs opacity-70 mt-1 text-right">
                {safeFormatDate(message.created_at, "HH:mm")}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Conversation;