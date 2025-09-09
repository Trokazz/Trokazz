import { Link, useLocation } from "react-router-dom";
import { Home, LayoutGrid, MessageSquare, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { href: "/", label: "Início", icon: Home },
  { href: "/categories", label: "Categorias", icon: LayoutGrid },
  { href: "/sell", label: "Anunciar", icon: Plus, isCentral: true },
  { href: "/messages", label: "Chat", icon: MessageSquare },
  { href: "/profile", label: "Perfil", icon: User },
];

const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t h-16 flex items-center justify-around">
      {navItems.map((item) => {
        const href = item.label === "Perfil" && !user ? "/auth" : item.href;
        const isActive = location.pathname === href;

        if (item.isCentral) {
          return (
            <Link
              key={item.label}
              to={href}
              className="bg-accent rounded-full h-14 w-14 flex items-center justify-center -mt-8 shadow-lg"
            >
              <item.icon className="h-8 w-8 text-accent-foreground" />
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        }
        return (
          <Link
            key={item.label}
            to={href}
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}
          >
            <item.icon className="h-6 w-6" />
            <span className="text-xs">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;