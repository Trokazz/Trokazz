import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail } from "lucide-react";

const Contact = () => {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-3xl">Entre em Contato</CardTitle>
        <CardDescription>
          Tem alguma dúvida, sugestão ou problema? Fale conosco.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Mail className="h-6 w-6 text-primary" />
          <div>
            <h3 className="font-semibold">E-mail</h3>
            <a href="mailto:contato@trokazz.com" className="text-muted-foreground hover:text-primary">
              contato@trokazz.com
            </a>
          </div>
        </div>
        <p className="text-sm text-muted-foreground pt-4">
          Nossa equipe responderá o mais breve possível. Por favor, forneça o máximo de detalhes para que possamos ajudá-lo da melhor forma.
        </p>
      </CardContent>
    </Card>
  );
};

export default Contact;