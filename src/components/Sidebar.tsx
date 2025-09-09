import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, List, MessageSquare, Heart, Settings, LayoutGrid, LogOut, Gift, ReceiptText, Ticket, DollarSign } from "lucide-react"; // Adicionado Gift, ReceiptText, Ticket, DollarSign
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

const navItems = [
  { href: "/", label: "Início", icon: Home },
  { href: "/categories", label: "Categorias", icon: LayoutGrid },
  { href: "/profile/my-ads", label: "Meus Anúncios", icon: List },
  { href: "/messages", label: "Mensagens", icon: MessageSquare },
  { href: "/profile/favorites", label: "Favoritos", icon: Heart },
  { href: "/profile/my-offers-made", label: "Minhas Ofertas", icon: Gift }, // Novo item
  { href: "/profile/my-offers-received", label: "Ofertas Recebidas", icon: Gift }, // Novo item
  { href: "/profile/transactions", label: "Minhas Transações", icon: ReceiptText }, // Novo item
  { href: "/redeem", label: "Resgatar Voucher", icon: Ticket }, // Novo item
  { href: "/buy-credits", label: "Comprar Créditos", icon: DollarSign }, // Novo item
  { href: "/profile/user-settings", label: "Configurações", icon: Settings },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth(); // Para verificar se o usuário está logado

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError("Erro ao fazer logout: " + error.message);
    } else {
      showSuccess("Logout realizado com sucesso!");
      navigate('/auth');
    }
  };

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
        {user && ( // Renderiza o botão de logout apenas se o usuário estiver logado
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-primary-foreground/10 hover:text-primary-foreground w-full text-left text-destructive-foreground/80 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        )}
      </nav>
    </div>
  );
};

export default Sidebar;