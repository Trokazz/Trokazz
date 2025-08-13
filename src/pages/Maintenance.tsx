import { Wrench } from "lucide-react";
import usePageMetadata from "@/hooks/usePageMetadata"; // Importando o hook

const MaintenancePage = () => {
  // Adicionando o hook usePageMetadata
  usePageMetadata({
    title: "Em Manutenção - Trokazz",
    description: "O site Trokazz está temporariamente em manutenção para melhorias. Voltaremos em breve!",
    keywords: "manutenção, site fora do ar, trokazz",
    ogUrl: window.location.href,
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-4">
      <Wrench className="h-16 w-16 text-primary mb-4" />
      <h1 className="text-4xl font-bold mb-2">Em Manutenção</h1>
      <p className="text-xl text-muted-foreground">
        Estamos fazendo algumas melhorias no site. Voltamos em breve!
      </p>
    </div>
  );
};

export default MaintenancePage;