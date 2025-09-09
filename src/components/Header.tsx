import React, { useState } from "react"; // Adicionado import React
import { Button } from "@/components/ui/button";
import { Bell, User, MessageSquare, DollarSign } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import NotificationsPanel from "./NotificationsPanel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SearchWithAutocomplete from "./SearchWithAutocomplete";
import { Skeleton } from "@/components/ui/skeleton";

const fetchUnreadNotificationsCount = async (userId: string) => {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw error;
  return count;
};

const fetchUserCredits = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data?.balance || 0;
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
    refetchInterval: 15000,
  });

  const { data: userCredits, isLoading: isLoadingCredits } = useQuery({
    queryKey: ['userCreditsHeader', user?.id],
    queryFn: () => fetchUserCredits(user!.id),
    enabled: !!user,
    staleTime: 60 * 1000,
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
        {user && (
          <div className="flex items-center gap-1 text-sm font-medium text-foreground">
            <DollarSign className="h-4 w-4 text-yellow-500" />
            {isLoadingCredits ? (
              <Skeleton className="h-4 w-12" />
            ) : (
              <span>{userCredits} Créditos</span>
            )}
          </div>
        )}
        <Button variant="ghost" size="icon" className="rounded-full relative" onClick={() => setIsNotificationsOpen(true)}>
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>
        <Link to={user ? "/messages" : "/auth"}>
          <Button variant="ghost" size="icon" className="rounded-full">
            <MessageSquare className="h-5 w-5" />
            <span className="sr-only">Messages</span>
          </Button>
        </Link>
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