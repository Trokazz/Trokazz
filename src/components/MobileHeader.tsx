import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Bell } from "lucide-react";
import { Button } from "./ui/button";
import NotificationsPanel from "./NotificationsPanel";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const fetchUnreadNotificationsCount = async (userId: string) => {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw error;
  return count;
};

const MobileHeader = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // O unreadCount ainda é buscado, mas não será exibido no cabeçalho
  const { data: unreadCount } = useQuery({
    queryKey: ['unreadNotificationsCount', user?.id],
    queryFn: () => fetchUnreadNotificationsCount(user!.id),
    enabled: !!user,
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  return (
    <header className="sticky top-0 z-50 md:hidden flex items-center justify-between h-16 px-4 bg-primary text-primary-foreground">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-6 w-6" />
      </Button>
      
      <Link to="/" className="text-xl font-bold flex-grow text-center">
        <img src="/logo.png" alt="Trokazz Logo" className="h-8 w-8 inline-block mr-2" />
        Trokazz
      </Link>
      
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setIsNotificationsOpen(true)}>
          <Bell className="h-6 w-6" />
          {/* Removido o display de contagem de notificações (ponto vermelho ou número) */}
        </Button>
      </div>
      <NotificationsPanel isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </header>
  );
};

export default MobileHeader;