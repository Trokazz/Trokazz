import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import usePageMetadata from "@/hooks/usePageMetadata";
import { Home } from "lucide-react"; // Import Home icon
import { Button } from "@/components/ui/button"; // Use Button for the link

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  usePageMetadata({
    title: "Página Não Encontrada - Trokazz",
    description: "A página que você está procurando não foi encontrada no Trokazz.",
    keywords: "404, página não encontrada, erro, trokazz",
    ogUrl: window.location.href,
  });

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-6">Oops! Página não encontrada</p>
      <Button asChild>
        <Link to="/">
          <span className="flex items-center gap-2"> {/* Envolvido em um span para ser um único filho */}
            <Home className="h-5 w-5" />
            Voltar para o Início
          </span>
        </Link>
      </Button>
    </div>
  );
};

export default NotFound;