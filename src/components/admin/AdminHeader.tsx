import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, LogOut, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import AdminNotificationsPanel from "./AdminNotificationsPanel"; // Import AdminNotificationsPanel
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

const fetchUnreadAdminNotificationsCount = async () => {
  const { count, error } = await supabase
    .from('admin_notifications')
    .select('*', { count: 'exact' })
    .eq('is_read', false);
  if (error) throw error;
  return count;
};

const AdminHeader = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const { data: unreadCount } = useQuery({
    queryKey: ['unreadAdminNotificationsCount'],
    queryFn: fetchUnreadAdminNotificationsCount,
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError("Erro ao fazer logout: " + error.message);
    } else {
      showSuccess("Logout realizado com sucesso!");
      navigate('/auth');
    }
  };

  const adminName = user?.user_metadata?.full_name || user?.email || 'Admin';
  const adminAvatarUrl = user?.user_metadata?.avatar_url || '/placeholder.svg';

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-6">
      <h1 className="text-lg font-semibold">Painel de Administrador</h1>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full relative" onClick={() => setIsNotificationsOpen(true)}>
          <Bell className="h-5 w-5" />
          {unreadCount && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount}
            </span>
          )}
          <span className="sr-only">Notificações do Admin</span>
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarImage src={adminAvatarUrl} alt={adminName} loading="lazy" />
          <AvatarFallback>{adminName.charAt(0)}</AvatarFallback>
        </Avatar>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AdminNotificationsPanel isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </header>
  );
};

export default AdminHeader;