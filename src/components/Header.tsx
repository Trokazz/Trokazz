import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Search, MessagesSquare, Rss } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "./ui/skeleton";
import { Input } from "./ui/input";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import NotificationBell from "./NotificationBell";
import { getOptimizedImageUrl } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const fetchHeaderProfile = async (userId: string | undefined) => {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role")
    .eq("id", userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

const Header = () => {
  const { session, loading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["headerProfile", session?.user?.id],
    queryFn: () => fetchHeaderProfile(session?.user?.id),
    enabled: !sessionLoading && !!session?.user?.id,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      navigate(`/anuncios?q=${encodeURIComponent(trimmedQuery)}`);

      try {
        await supabase.from('search_queries').insert({
          query_text: trimmedQuery.toLowerCase(),
          user_id: session?.user?.id || null,
        });
      } catch (error) {
        console.error("Error logging search query:", error);
      }
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const isLoading = sessionLoading || (!!session && profileLoading);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/" className="flex items-center space-x-2">
            <img src="/logo.png" alt="Trokazz Logo" className="h-10 w-auto" />
            <span className="text-3xl font-bold bg-gradient-to-r from-primary to-accent-gradient text-transparent bg-clip-text">
              Trokazz
            </span>
          </Link>
        </div>

        <div className="flex-1 w-full max-w-xl hidden md:flex">
          <form onSubmit={handleSearch} className="w-full relative">
            <Input
              type="search"
              placeholder="O que você está procurando?"
              className="w-full pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </form>
        </div>

        <div className="flex items-center space-x-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="ghost" size="icon">
                <Link to="/procurados">
                  <Rss className="h-6 w-6" />
                  <span className="sr-only">Procurados</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Mural de Procurados</p>
            </TooltipContent>
          </Tooltip>

          <div className="hidden md:flex items-center space-x-1">
            {session && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild variant="ghost" size="icon">
                    <Link to="/inbox">
                      <MessagesSquare className="h-5 w-5" />
                      <span className="sr-only">Chat</span>
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Caixa de Entrada</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {session && <NotificationBell />}

          {isLoading ? (
            <Skeleton className="h-10 w-10 rounded-full" />
          ) : session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={getOptimizedImageUrl(profile?.avatar_url, { width: 80, height: 80 })} alt={profile?.full_name || "User"} />
                    <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile?.full_name || "Usuário"}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/perfil")}>Meu Perfil</DropdownMenuItem>
                {profile?.role === "admin" && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>Área Admin</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => navigate("/login")} className="hidden md:flex">Entrar</Button>
          )}

          <Button onClick={() => navigate("/novo-anuncio")} className="hidden sm:flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-primary-foreground rounded-full px-4">
            <Sparkles className="h-5 w-5" />
            Anunciar grátis
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;