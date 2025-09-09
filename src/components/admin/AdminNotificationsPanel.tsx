import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle, AlertTriangle, Info, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AdminNotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type AdminNotification = {
  id: string;
  type: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

const fetchAdminNotifications = async () => {
  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

const markAdminNotificationAsRead = async (notificationId: string) => {
  const { error } = await supabase
    .from('admin_notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  if (error) throw error;
};

const AdminNotificationIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'new_report': return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case 'new_verification_request': return <CheckCircle className="h-5 w-5 text-blue-500" />;
    case 'new_ticket_message': return <Info className="h-5 w-5 text-purple-500" />;
    case 'new_ad_pending_approval': return <Bell className="h-5 w-5 text-orange-500" />;
    default: return <Bell className="h-5 w-5 text-gray-500" />;
  }
};

const AdminNotificationsPanel: React.FC<AdminNotificationsPanelProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['adminNotifications'],
    queryFn: fetchAdminNotifications,
    enabled: isOpen, // Only fetch when panel is open
  });

  const markReadMutation = useMutation({
    mutationFn: markAdminNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
    },
    onError: (error: any) => {
      console.error("Failed to mark admin notification as read:", error.message);
    }
  });

  const handleNotificationClick = (notification: AdminNotification) => {
    if (!notification.is_read) {
      markReadMutation.mutate(notification.id);
    }
    onClose();
  };

  // Realtime subscription for new admin notifications
  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase
      .channel(`admin_notifications_channel`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_notifications' },
        (payload) => {
          queryClient.setQueryData(['adminNotifications'], (oldData: any) => [payload.new, ...(oldData || [])]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, queryClient]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[350px] sm:w-[540px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Notificações do Administrador</SheetTitle>
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
                  <AdminNotificationIcon type={notification.type} />
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
              <Bell className="h-12 w-12 mb-4" />
              <p>Nenhuma notificação de administrador por enquanto.</p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default AdminNotificationsPanel;