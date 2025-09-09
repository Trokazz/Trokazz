import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Bell, User } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom"; // Import useSearchParams and useNavigate
import { useAuth } from "@/contexts/AuthContext";
import NotificationsPanel from "./NotificationsPanel";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SearchWithAutocomplete from "./SearchWithAutocomplete"; // Import the new component

const fetchUnreadNotificationsCount = async (userId: string) => {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw error;
  return count;
};

const Header = () => {
  const { user } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearchTerm = searchParams.get('q') || '';

  const { data: unreadCount } = useQuery({
    queryKey: ['unreadNotificationsCount', user?.id],
    queryFn: () => fetchUnreadNotificationsCount(user!.id),
    enabled: !!user,
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  const handleSearchSubmit = (searchTerm: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (searchTerm.trim()) {
      newSearchParams.set('q', searchTerm.trim());
    } else {
      newSearchParams.delete('q');
    }
    navigate(`/?${newSearchParams.toString()}`);
  };

  return (
    <header className="hidden h-16 items-center gap-4 border-b bg-card px-4 md:flex lg:px-6">
      <div className="flex-1">
        <SearchWithAutocomplete
          initialSearchTerm={initialSearchTerm}
          onSearchSubmit={handleSearchSubmit}
          className="md:w-2/3 lg:w-1/3"
          placeholder="Buscar itens..."
        />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-full relative" onClick={() => setIsNotificationsOpen(true)}>
          <Bell className="h-5 w-5" />
          {/* Removido o display de contagem de notificações (ponto vermelho ou número) */}
          <span className="sr-only">Notifications</span>
        </Button>
        <Link to={user ? "/profile" : "/auth"}>
          <Button variant="ghost" size="icon" className="rounded-full">
            <User className="h-5 w-5" />
            <span className="sr-only">Profile</span>
          </Button>
        </Link>
      </div>
      <NotificationsPanel isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </header>
  );
};

export default Header;