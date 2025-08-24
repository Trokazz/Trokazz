"use client";

import { NavLink } from "react-router-dom";
import { Home, Compass, PlusCircle, MessageCircle, UserRound } from "lucide-react"; // Ícones atualizados

const MobileBottomNav = () => {
  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center p-2 text-xs transition-colors ${
      isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
    }`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 bg-background border-t shadow-lg md:hidden">
      <div className="flex justify-around h-16">
        <NavLink to="/" className={navLinkClasses}>
          <Home className="h-6 w-6" />
          <span>Início</span>
        </NavLink>
        <NavLink to="/procurados" className={navLinkClasses}>
          <Compass className="h-6 w-6" />
          <span>Procurados</span>
        </NavLink>
        <NavLink to="/novo-anuncio" className={navLinkClasses}>
          <PlusCircle className="h-6 w-6" />
          <span>Anunciar</span>
        </NavLink>
        <NavLink to="/inbox" className={navLinkClasses}>
          <MessageCircle className="h-6 w-6" />
          <span>Chat</span>
        </NavLink>
        <NavLink to="/perfil" className={navLinkClasses}>
          <UserRound className="h-6 w-6" />
          <span>Perfil</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default MobileBottomNav;