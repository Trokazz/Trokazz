import { Link, useLocation } from "react-router-dom";
import { Home, Users, FileText, CreditCard, BarChart2, Tag, Settings, ChevronRight, LayoutGrid, Flag, LifeBuoy, UserCheck, DollarSign, ScrollText, Image } from "lucide-react"; // Import Image icon

import { cn } from "@/lib/utils";

const mainNav = [
  { href: "/admin", label: "Home", icon: Home },
  { href: "/admin/users", label: "Gerenciar Usuários", icon: Users, hasSubmenu: true },
  { href: "/admin/ads", label: "Gerenciar Anúncios", icon: FileText },
  { href: "/admin/categories", label: "Gerenciar Categorias", icon: LayoutGrid },
  { href: "/admin/reports", label: "Gerenciar Denúncias", icon: Flag },
  { href: "/admin/support-tickets", label: "Tickets de Suporte", icon: LifeBuoy },
  { href: "/admin/verification-requests", label: "Verificações", icon: UserCheck },
  { href: "/admin/pages", label: "Páginas Estáticas", icon: FileText },
  { href: "/admin/user-levels", label: "Níveis de Usuário", icon: Users },
  { href: "/admin/system-logs", label: "Logs do Sistema", icon: ScrollText },
  { href: "/admin/payments", label: "Gerenciar Pagamentos", icon: CreditCard },
  { href: "/admin/banners", label: "Gerenciar Banners", icon: Image }, // New link for banners
];

const prometterNav = [
  { href: "/admin/prometter/metrics", label: "Métricas", icon: BarChart2 },
  { href: "/admin/prometter/vouchers", label: "Gerenciar Vouchers", icon: Tag },
  { href: "/admin/prometter/credit-packages", label: "Pacotes de Crédito", icon: DollarSign },
  { href: "/admin/prometter/settings", label: "Configurações", icon: Settings },
];

const AdminSidebar = () => {
  const location = useLocation();

  return (
    <div className="hidden md:flex flex-col h-full bg-primary text-primary-foreground">
      <div className="flex items-center h-16 px-6 border-b border-primary-foreground/10">
        <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
          <img src="/logo.png" alt="Trokazz Logo" className="h-8 w-8" />
          <span className="font-bold text-accent">TROKAZZ</span>
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-6">
        <div>
          <h3 className="px-3 py-2 text-xs font-semibold text-primary-foreground/60 uppercase tracking-wider">Segmentos</h3>
          <div className="space-y-1">
            {mainNav.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg px-3 py-2 transition-all hover:bg-primary-foreground/10",
                  location.pathname === item.href ? "bg-primary-foreground/20 font-bold" : "text-primary-foreground/80"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </div>
                {item.hasSubmenu && <ChevronRight className="h-4 w-4" />}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h3 className="px-3 py-2 text-xs font-semibold text-primary-foreground/60 uppercase tracking-wider">Prometter</h3>
          <div className="space-y-1">
            {prometterNav.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-primary-foreground/10",
                  location.pathname === item.href ? "bg-accent text-accent-foreground font-bold" : "text-primary-foreground/80"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default AdminSidebar;