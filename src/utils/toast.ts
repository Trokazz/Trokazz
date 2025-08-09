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