import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import MobilePageHeader from '@/components/MobilePageHeader';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, Search } from 'lucide-react'; // Import Search icon
import { Button } from '@/components/ui/button'; // Import Button

const fetchConversations = async (userId: string) => {
  const { data, error } = await supabase.rpc('get_user_conversations', { p_user_id: userId });
  if (error) throw error;
  return data;
};

const MessagesPage = () => {
  const { user } = useAuth();
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => fetchConversations(user!.id),
    enabled: !!user,
  });

  return (
    <div className="flex flex-col h-full">
      <MobilePageHeader title="Mensagens" />
      <main className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : conversations && conversations.length > 0 ? (
          <div className="divide-y">
            {conversations.map(convo => (
              <Link to={`/chat/${convo.conversation_id}`} key={convo.conversation_id} className="flex items-center gap-4 p-4 hover:bg-secondary transition-colors">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={convo.other_user_avatar_url} loading="lazy" />
                  <AvatarFallback>{convo.other_user_full_name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-baseline">
                    <p className="font-semibold truncate">{convo.other_user_full_name}</p>
                    <p className="text-xs text-muted-foreground flex-shrink-0">
                      {convo.last_message_at ? formatDistanceToNow(new Date(convo.last_message_at), { addSuffix: true, locale: ptBR }) : ''}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{convo.item_title}</p>
                  <p className="text-sm text-muted-foreground truncate">{convo.last_message_content || 'Nenhuma mensagem ainda.'}</p>
                </div>
                {convo.unread_count > 0 && (
                  <div className="bg-accent text-accent-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">
                    {convo.unread_count}
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
            <MessageSquare className="h-12 w-12 mb-4" />
            <p className="text-lg font-semibold mb-2">Nenhuma conversa encontrada.</p>
            <p className="mb-4">Comece a explorar anúncios para iniciar um chat!</p>
            <Button asChild>
              <Link to="/">
                <Search className="mr-2 h-4 w-4" /> Explorar Anúncios
              </Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default MessagesPage;