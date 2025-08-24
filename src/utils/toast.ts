import { toast } from "sonner";

export const showSuccess = (message: string) => {
  toast.success(message);
};

export const showError = (error: any) => {
  let errorMessage = "Ocorreu um erro desconhecido. Por favor, tente novamente.";
  
  // Log the full error object for debugging purposes in the console
  console.error("ERRO CAPTURADO:", error);

  // Priorize mensagens de erro específicas do Supabase ou de Edge Functions
  if (error && typeof error === 'object') {
    if (error.message) {
      errorMessage = error.message;
    }
    if (error.details) {
      errorMessage += ` Detalhes: ${error.details}`;
    }
    if (error.hint) {
      errorMessage += ` Dica: ${error.hint}`;
    }
    // Lida com erros específicos de autenticação do Supabase
    if (error.status === 400 && error.message === 'User already registered') {
      errorMessage = 'Este e-mail já está cadastrado. Por favor, faça login ou use outro e-mail.';
    }
    // Lida com erros de Edge Functions (vindos de supabase.functions.invoke)
    if (error.context?.json?.error) {
      errorMessage = error.context.json.error;
    }
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  // Em produção, mostra uma mensagem mais genérica para segurança/experiência do usuário
  if (import.meta.env.PROD) {
    // Se a mensagem extraída for muito técnica, reverte para uma genérica
    if (errorMessage.includes("Supabase") || errorMessage.includes("database") || errorMessage.includes("PGRST")) {
      errorMessage = "Ocorreu um erro ao salvar seus dados. Por favor, tente novamente.";
    }
  }

  toast.error(errorMessage);
};

export const showLoading = (message: string) => {
  return toast.loading(message);
};

export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};