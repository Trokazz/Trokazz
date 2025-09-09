import { Link, useLocation } from "react-router-dom";
import { Home, List, MessageSquare, Heart, Settings, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Início", icon: Home },
  { href: "/categories", label: "Categorias", icon: LayoutGrid },
  { href: "/listings", label: "Meus Anúncios", icon: List },
  { href: "/messages", label: "Mensagens", icon: MessageSquare },
  { href: "/favorites", label: "Favoritos", icon: Heart },
  { href: "/profile/user-settings", label: "Configurações", icon: Settings },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <div className="hidden md:flex flex-col h-full bg-primary text-primary-foreground">
      <div className="flex items-center h-16 px-6 border-b border-primary-foreground/10">
        <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
          <img src="/logo.png" alt="Trokazz Logo" className="h-8 w-8" />
          <span>Trokazz</span>
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-primary-foreground/10 hover:text-primary-foreground",
              location.pathname === item.href
                ? "bg-primary-foreground/20 text-primary-foreground font-bold"
                : "text-primary-foreground/80"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;