import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

const RealtimeUsers = () => {
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const channel = supabase.channel('online-users');

    channel
      .on('presence', { event: 'sync' }, () => {
        const count = Object.keys(channel.presenceState()).length;
        setOnlineUsers(count);
        setIsLoading(false);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Usuários Online Agora</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground text-green-500" />
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{onlineUsers}</div>}
        <p className="text-xs text-muted-foreground">Contagem em tempo real</p>
      </CardContent>
    </Card>
  );
};

export default RealtimeUsers;