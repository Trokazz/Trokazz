import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BellRing, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { showError, showSuccess } from '@/utils/toast';
import { Database } from '@/types/supabase'; // Import Database type

type AdminNotification = Database['public']['Tables']['admin_notifications']['Row'];

const fetchAdminNotifications = async (): Promise<AdminNotification[]> => {
  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10); // Limita para as 10 mais recentes
  if (error) throw error;
  return data;
};

const AdminNotificationBell = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const { data: notifications, isLoading, isError, error } = useQuery<AdminNotification[]>({
    queryKey: ['adminNotifications'],
    queryFn: fetchAdminNotifications,
    refetchInterval: 30000, // Refreshes every 30 seconds
  });

  useEffect(() => {
    console.log("AdminNotificationBell: Notifications data:", notifications);
    console.log("AdminNotificationBell: Is Loading:", isLoading);
    console.log("AdminNotificationBell: Is Error:", isError, error);

    const channel = supabase
      .channel(`admin_notifications_channel`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_notifications' },
        () => {
          console.log("AdminNotificationBell: Realtime update received, invalidating queries.");
          queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
        }
      )
      .subscribe();

    return () => {
      console.log("AdminNotificationBell: Unsubscribing from channel.");
      supabase.removeChannel(channel);
    };
  }, [queryClient, notifications, isLoading, isError, error]); // Added dependencies for completeness

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && unreadCount > 0) {
      const unreadIds = notifications?.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds && unreadIds.length > 0) {
        console.log("AdminNotificationBell: Marking notifications as read:", unreadIds);
        await supabase.from('admin_notifications').update({ is_read: true }).in('id', unreadIds);
        queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
      }
    }
  };

  const handleNotificationClick = (notification: AdminNotification) => {
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase.from('admin_notifications').delete().eq('id', notificationId);
      if (error) throw error;
      showSuccess("Notificação removida.");
      queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
    } catch (error) {
      showError("Não foi possível remover a notificação.");
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <BellRing className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 justify-center rounded-full p-0 text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notificações do Admin</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications && notifications.length > 0 ? (
          notifications.map(n => (
            <div key={n.id} className="relative group">
              <DropdownMenuItem onClick={() => handleNotificationClick(n)} className={`flex flex-col items-start whitespace-normal pr-8 ${!n.is_read ? 'bg-muted' : ''}`}>
                <p>{n.message}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </DropdownMenuItem>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNotification(n.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        ) : (
          <DropdownMenuItem disabled>Nenhuma notificação</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AdminNotificationBell;