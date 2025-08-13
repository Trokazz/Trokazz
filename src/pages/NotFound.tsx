import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import usePageMetadata from "@/hooks/usePageMetadata"; // Importando o hook

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  // Adicionando o hook usePageMetadata
  usePageMetadata({
    title: "Página Não Encontrada - Trokazz",
    description: "A página que você está procurando não foi encontrada no Trokazz.",
    keywords: "404, página não encontrada, erro, trokazz",
    ogUrl: window.location.href,
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
        <a href="/" className="text-blue-500 hover:text-blue-700 underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;