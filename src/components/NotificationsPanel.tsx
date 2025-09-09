import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle, MessageSquare, CalendarCheck, Gift, XCircle } from "lucide-react"; // Import Bell
import { Link } from "react-router-dom";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type Notification = {
  id: string;
  type: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

const fetchNotifications = async (userId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

const markNotificationAsRead = async (notificationId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  if (error) throw error;
};

const NotificationIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'new_message': return <MessageSquare className="h-5 w-5 text-blue-500" />;
    case 'new_offer': return <Gift className="h-5 w-5 text-green-500" />;
    case 'offer_accepted': return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'offer_rejected': return <XCircle className="h-5 w-5 text-red-500" />;
    case 'appointment_pending':
    case 'appointment_confirmed': return <CalendarCheck className="h-5 w-5 text-purple-500" />;
    default: return <Bell className="h-5 w-5 text-gray-500" />; // Changed from BellOff to Bell
  }
};

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['userNotifications', user?.id],
    queryFn: () => fetchNotifications(user!.id),
    enabled: !!user && isOpen,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userNotifications', user?.id] });
    },
    onError: (error: any) => {
      console.error("Failed to mark notification as read:", error.message);
    }
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markReadMutation.mutate(notification.id);
    }
    onClose(); // Close panel after clicking a notification
  };

  useEffect(() => {
    if (!user || !isOpen) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          queryClient.setQueryData(['userNotifications', user.id], (oldData: any) => [payload.new, ...(oldData || [])]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isOpen, queryClient]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[350px] sm:w-[540px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Notificações</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Link
                  to={notification.link || '#'}
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg transition-colors",
                    notification.is_read ? "bg-muted/50 hover:bg-muted" : "bg-accent/10 hover:bg-accent/20"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <NotificationIcon type={notification.type} />
                  <div className="flex-1">
                    <p className={cn("text-sm", notification.is_read ? "text-muted-foreground" : "font-medium text-foreground")}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
              <Bell className="h-12 w-12 mb-4" /> {/* Changed from BellOff to Bell */}
              <p>Nenhuma notificação por enquanto.</p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationsPanel;