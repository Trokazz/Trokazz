import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Newspaper, Users, Shapes, Settings, BarChartHorizontal, Image as ImageIcon, FileSearch, Briefcase, Shield, FileText, Gem, ScrollText, MessageSquareText, Gift, Award } from "lucide-react"; // Importar Award

const AdminSidebar = () => {
  const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/investor-dashboard", label: "Investor Dashboard", icon: Briefcase },
    { href: "/admin/moderation-center", label: "Moderação", icon: Shield },
    { href: "/admin/support-tickets", label: "Suporte e Feedback", icon: MessageSquareText },
    { href: "/admin/insights", label: "Insights", icon: BarChartHorizontal },
    { href: "/admin/search-analytics", label: "Análise de Busca", icon: FileSearch },
    { href: "/admin/ads", label: "Todos os Anúncios", icon: Newspaper },
    { href: "/admin/users", label: "Usuários", icon: Users },
    { href: "/admin/user-levels", label: "Níveis de Usuário", icon: Award }, // New: Add User Levels link
    { href: "/admin/categories", label: "Categorias", icon: Shapes },
    { href: "/admin/banners", label: "Banners", icon: ImageIcon },
    { href: "/admin/pages", label: "Gerenciar Páginas", icon: FileText },
    { href: "/admin/credits", label: "Pacotes de Créditos", icon: Gem },
    { href: "/admin/promo-codes", label: "Códigos Promocionais", icon: Gift },
    { href: "/admin/system-logs", label: "Logs do Sistema", icon: ScrollText },
    { href: "/admin/settings", label: "Configurações", icon: Settings },
  ];

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="font-bold text-lg">
          Admin <span className="bg-gradient-to-r from-primary to-accent-gradient text-transparent bg-clip-text">Trokazz</span>
        </h2>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-4 text-sm font-medium">
          {navItems.map(({ href, label, icon: Icon }) => (
            <NavLink
              key={href}
              to={href}
              end={href === "/admin"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-muted hover:text-primary",
                  isActive && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default AdminSidebar;