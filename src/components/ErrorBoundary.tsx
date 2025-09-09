import React from 'react';
import { Button } from '@/components/ui/button';
import { Frown } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Atualiza o estado para que a próxima renderização mostre a UI de fallback.
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Você também pode registrar o erro em um serviço de relatórios de erros
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Você pode renderizar qualquer UI de fallback personalizada
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 text-center">
          <Frown className="h-16 w-16 text-destructive mb-6" />
          <h1 className="text-3xl font-bold mb-4">Opa! Algo deu errado.</h1>
          <p className="text-lg text-muted-foreground mb-6">
            Parece que encontramos um problema inesperado. Por favor, tente recarregar a página.
          </p>
          <Button onClick={() => window.location.reload()} className="bg-primary hover:bg-primary/90">
            Recarregar Página
          </Button>
          {/* Para depuração em desenvolvimento, você pode mostrar os detalhes do erro */}
          {import.meta.env.DEV && this.state.error && (
            <details className="mt-8 p-4 bg-muted rounded-md text-left max-w-lg overflow-auto">
              <summary className="font-semibold text-sm cursor-pointer">Detalhes do Erro</summary>
              <pre className="mt-2 text-xs whitespace-pre-wrap break-all">
                {this.state.error.toString()}
                <br />
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;