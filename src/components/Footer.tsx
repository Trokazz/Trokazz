import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-primary-foreground p-6 md:p-8 border-t border-primary-foreground/10 mt-auto">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
            <img src="/logo.png" alt="Trokazz Logo" className="h-6 w-6 text-accent" />
            <span>Trokazz</span>
          </Link>
          <p className="text-sm text-primary-foreground/80">
            Seu marketplace e plataforma de serviços local. Conectando pessoas e oportunidades.
          </p>
          <p className="text-xs text-primary-foreground/60">
            &copy; {currentYear} Trokazz. Todos os direitos reservados.
          </p>
        </div>

        {/* Desktop View for Links */}
        <div className="hidden md:block space-y-2">
          <h3 className="font-semibold text-primary-foreground mb-2">Links Úteis</h3>
          <ul className="space-y-1 text-sm text-primary-foreground/80">
            <li><Link to="/about" className="hover:underline">Sobre Nós</Link></li>
            <li><Link to="/faq" className="hover:underline">FAQ</Link></li>
            <li><Link to="/how-it-works" className="hover:underline">Como Funciona</Link></li>
          </ul>
        </div>

        <div className="hidden md:block space-y-2">
          <h3 className="font-semibold text-primary-foreground mb-2">Legal</h3>
          <ul className="space-y-1 text-sm text-primary-foreground/80">
            <li><Link to="/privacy-policy" className="hover:underline">Política de Privacidade</Link></li>
            <li><Link to="/terms-of-service" className="hover:underline">Termos de Serviço</Link></li>
            <li><Link to="/contact" className="hover:underline">Contato</Link></li>
          </ul>
        </div>

        {/* Mobile View for Links (Accordion) */}
        <div className="md:hidden col-span-full">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1" className="border-b border-primary-foreground/10">
              <AccordionTrigger className="font-semibold text-primary-foreground py-3">Links Úteis</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 text-sm text-primary-foreground/80 pb-2">
                  <li><Link to="/about" className="hover:underline block">Sobre Nós</Link></li>
                  <li><Link to="/faq" className="hover:underline block">FAQ</Link></li>
                  <li><Link to="/how-it-works" className="hover:underline block">Como Funciona</Link></li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="border-b border-primary-foreground/10">
              <AccordionTrigger className="font-semibold text-primary-foreground py-3">Legal</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 text-sm text-primary-foreground/80 pb-2">
                  <li><Link to="/privacy-policy" className="hover:underline block">Política de Privacidade</Link></li>
                  <li><Link to="/terms-of-service" className="hover:underline block">Termos de Serviço</Link></li>
                  <li><Link to="/contact" className="hover:underline block">Contato</Link></li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </footer>
  );
};

export default Footer;