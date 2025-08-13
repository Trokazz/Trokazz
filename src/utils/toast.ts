import { toast } from "sonner";

export const showSuccess = (message: string) => {
  toast.success(message);
};

export const showError = (error: any) => {
  let errorMessage = "Ocorreu um erro desconhecido. Tente novamente.";
  
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error.message === 'string') {
    errorMessage = error.message;
    // Check for more specific Supabase error details
    if (error.details) {
      errorMessage += ` Detalhes: ${error.details}`;
    }
    if (error.hint) {
      errorMessage += ` Dica: ${error.hint}`;
    }
  } else if (error && error.context?.json?.error) { // For edge function errors
    errorMessage = error.context.json.error;
  }

  console.error("ERRO CAPTURADO:", error);
  toast.error(errorMessage);
};

export const showLoading = (message: string) => {
  return toast.loading(message);
};

export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};