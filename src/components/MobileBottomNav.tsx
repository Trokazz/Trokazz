import { NavLink, Link, useNavigate } from "react-router-dom";
import { Home, Search, PlusCircle, MessageCircle, Menu, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "./ui/skeleton";
import * as Icons from "lucide-react";
import { Input } from "./ui/input";
import { useState } from "react";

const fetchCategories = async () => {
  const { data, error } = await supabase.from("categories").select("slug, name, icon").order("name");
  if (error) throw new Error(error.message);
  return data;
};

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery) {
      navigate(`/anuncios?q=${encodeURIComponent(trimmedQuery)}`);
    }
  };

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex flex-col items-center justify-center gap-1 text-xs w-full h-full transition-colors",
      isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
    );

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t h-16 flex items-center justify-around z-50">
      <NavLink to="/" className={navLinkClasses} end>
        <Home className="h-6 w-6" />
        <span>Início</span>
      </NavLink>
      <NavLink to="/anuncios" className={navLinkClasses}>
        <Search className="h-6 w-6" />
        <span>Buscar</span>
      </NavLink>
      <Link to="/novo-anuncio" className="flex flex-col items-center justify-center gap-1 text-xs text-primary w-full h-full">
        <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center -mt-6 border-4 border-background shadow-lg">
          <PlusCircle className="h-7 w-7" />
        </div>
        <span className="mt-0.5">Anunciar</span>
      </Link>
      <NavLink to="/inbox" className={navLinkClasses}>
        <MessageCircle className="h-6 w-6" />
        <span>Mensagens</span>
      </NavLink>
      
      <Sheet>
        <SheetTrigger asChild>
          <button className="flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary w-full h-full">
            <Menu className="h-6 w-6" />
            <span>Menu</span>
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full max-w-xs p-4 flex flex-col">
          <form onSubmit={handleSearch} className="w-full relative mb-4">
            <Input
              type="search"
              placeholder="Buscar..."
              className="w-full pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </form>
          <div className="flex-grow overflow-y-auto">
            <nav className="flex flex-col space-y-2">
              <SheetClose asChild>
                <Link to="/novo-anuncio" className="flex items-center gap-3 rounded-lg px-3 py-2 text-lg font-medium text-primary transition-all hover:bg-muted">
                  <Sparkles className="h-5 w-5" /> Anunciar Grátis
                </Link>
              </SheetClose>
              <div className="px-3 py-2">
                <h2 className="mb-2 text-lg font-semibold tracking-tight">Categorias</h2>
                <div className="space-y-1">
                  {isLoadingCategories && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                  {categories?.map((cat) => {
                    const Icon = (Icons as any)[cat.icon] || Icons.HelpCircle;
                    return (
                      <SheetClose asChild key={cat.slug}>
                        <Link to={`/anuncios/categoria/${cat.slug}`} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-muted">
                          <Icon className="h-5 w-5" /> {cat.name}
                        </Link>
                      </SheetClose>
                    );
                  })}
                </div>
              </div>
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
};

export default MobileBottomNav;