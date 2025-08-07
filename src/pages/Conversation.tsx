import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, ArrowLeft, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { safeFormatDate } from "@/lib/utils";
import { showError, showSuccess } from "@/utils/toast";

type Message = {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  is_read: boolean;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

const fetchConversationDetails = async (conversationId: string) => {
  const { data, error } = await supabase
    .from("conversations")
    .select(`
      id,
      advertisements ( id, title, image_urls ),
      buyer:profiles!conversations_buyer_id_fkey ( id, full_name, avatar_url ),
      seller:profiles!conversations_seller_id_fkey ( id, full_name, avatar_url )
    `)
    .eq("id", conversationId)
    .single();
  if (error) throw error;
  return data;
};

const fetchMessages = async (conversationId: string) => {
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
  // Converter para 'unknown' primeiro, conforme sugerido pelo erro TypeScript, resolve a incompatibilidade de tipo complexa.
  return data as unknown as Message[];
};

const Conversation = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Tipando explicitamente os dados como `any` para contornar a inferência incorreta de tipos em tabelas unidas.
  const { data: conversation, isLoading: isLoadingConvo } = useQuery<any>({
    queryKey: ["conversationDetails", conversationId],
    queryFn: () => fetchConversationDetails(conversationId!),
    enabled: !!conversationId,
  });

  const { data: messages, isLoading: isLoadingMessages } = useQuery({
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
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
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
    if (newMessage.trim() === "" || !user || !conversationId) return;

    const content = newMessage.trim();
    setNewMessage("");

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content,
    });

    if (error) {
      console.error("Error sending message:", error);
      setNewMessage(content);
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

  const otherUser = conversation && user
    ? (conversation.buyer?.id === user.id ? conversation.seller : conversation.buyer)
    : null;

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
          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarImage src={otherUser.avatar_url || undefined} />
              <AvatarFallback>{otherUser.full_name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{otherUser.full_name}</p>
              {conversation?.advertisements?.id ? (
                <Link to={`/anuncio/${conversation.advertisements.id}`} className="text-xs text-muted-foreground hover:underline">
                  {conversation?.advertisements?.title || 'Anúncio indisponível'}
                </Link>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {conversation?.advertisements?.title || 'Anúncio indisponível'}
                </span>
              )}
            </div>
          </div>
        )}
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
                <AvatarImage src={message.profiles?.avatar_url || undefined} />
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