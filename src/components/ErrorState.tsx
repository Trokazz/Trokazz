import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
}

const ErrorState = ({
  message = "Não foi possível carregar os dados. Verifique sua conexão e tente novamente.",
  onRetry,
}: ErrorStateProps) => {
  return (
    <div className="text-center py-10 px-4">
      <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
      <h3 className="mt-4 text-lg font-semibold">Oops! Algo deu errado.</h3>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <Button onClick={onRetry} className="mt-6">
        Tentar Novamente
      </Button>
    </div>
  );
};

export default ErrorState;