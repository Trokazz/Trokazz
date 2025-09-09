import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

type Message = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
};

const fetchConversationDetails = async (conversationId: string, currentUserId: string) => {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      ad:ad_id ( title ),
      buyer:profiles!buyer_id ( id, full_name, avatar_url ),
      seller:profiles!seller_id ( id, full_name, avatar_url )
    `)
    .eq('id', conversationId)
    .single();

  if (error) throw error;

  const otherUser = data.buyer.id === currentUserId ? data.seller : data.buyer;
  return {
    id: data.id,
    item_title: data.ad?.title || 'Conversa', // Simplified title
    other_user: otherUser,
  };
};

const fetchMessages = async (conversationId: string) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
};

const ChatMessage = ({ message, avatarUrl, isMe }: { message: Message, avatarUrl: string, isMe: boolean }) => {
  return (
    <div className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}>
      {!isMe && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={avatarUrl} loading="lazy" />
          <AvatarFallback>{avatarUrl?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "rounded-2xl p-3 max-w-[75%]",
          isMe ? "bg-accent text-accent-foreground rounded-br-none" : "bg-card text-card-foreground rounded-bl-none"
        )}
      >
        <p>{message.content}</p>
      </div>
    </div>
  );
};

const ChatPage = () => {
  const { id: conversationId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversation, isLoading: isLoadingConversation, error: conversationError } = useQuery({
    queryKey: ['conversationDetails', conversationId],
    queryFn: () => fetchConversationDetails(conversationId!, user!.id),
    enabled: !!conversationId && !!user,
  });

  const { data: messages, isLoading: isLoadingMessages, error: messagesError } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => fetchMessages(conversationId!),
    enabled: !!conversationId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId || !user) throw new Error("Missing info");
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage("");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          queryClient.setQueryData(['messages', conversationId], (oldData: any) => [...(oldData || []), payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "") return;
    sendMessageMutation.mutate(newMessage);
  };

  if (isLoadingConversation || isLoadingMessages) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <header className="flex items-center p-4 border-b"><Skeleton className="h-10 w-full" /></header>
        <main className="flex-1 p-4 space-y-4"><Skeleton className="h-full w-full" /></main>
        <footer className="p-4"><Skeleton className="h-12 w-full" /></footer>
      </div>
    );
  }

  if (conversationError || messagesError) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-background text-destructive p-4">
        <p className="text-lg font-semibold">Erro ao carregar o chat.</p>
        {conversationError && <p className="text-sm">{conversationError.message}</p>}
        {messagesError && <p className="text-sm">{messagesError.message}</p>}
        <Button onClick={() => navigate(-1)} className="mt-4">Voltar</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-primary text-primary-foreground">
      <header className="flex items-center p-4 border-b border-primary-foreground/10">
        <Button variant="ghost" size="icon" className="mr-2" onClick={() => navigate(-1)}>
          <ArrowLeft />
        </Button>
        <Avatar className="h-10 w-10 mr-3">
          <AvatarImage src={conversation?.other_user.avatar_url} loading="lazy" />
          <AvatarFallback>{conversation?.other_user.full_name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-grow">
          <p className="font-bold">{conversation?.other_user.full_name}</p>
          <p className="text-sm text-primary-foreground/80">{conversation?.item_title}</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4 bg-card">
        {messages?.map((msg) => (
          <ChatMessage 
            key={msg.id} 
            message={msg} 
            avatarUrl={conversation!.other_user.avatar_url} 
            isMe={msg.sender_id === user?.id} 
          />
        ))}
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-4 bg-background border-t">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 bg-card text-card-foreground rounded-full h-12 px-4"
          />
          <Button type="submit" size="icon" className="bg-accent rounded-full h-12 w-12 flex-shrink-0" disabled={sendMessageMutation.isPending}>
            <Send />
          </Button>
        </form>
      </footer>
    </div>
  );
};

export default ChatPage;