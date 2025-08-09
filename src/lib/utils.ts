import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { isValid, format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeFormatDate(date: string | null | undefined, formatString: string): string {
  if (!date) return '';
  const d = new Date(date);
  if (!isValid(d)) return '';
  return format(d, formatString, { locale: ptBR });
}

export function safeFormatDistanceToNow(date: string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (!isValid(d)) return '';
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
}

export function getOptimizedImageUrl(url: string | null | undefined, options: { width: number; height: number; resize?: 'cover' | 'contain' | 'fill' }): string | undefined {
  if (!url) return undefined;
  
  const { width, height, resize = 'cover' } = options;

  try {
    // Valida se a URL é um formato que pode ser processado.
    // Se a construção da URL falhar, o bloco catch irá lidar com isso.
    const urlObject = new URL(url);
    
    // Verifica se é uma URL do Supabase Storage para aplicar otimizações.
    if (urlObject.hostname.endsWith('supabase.co') && urlObject.pathname.includes('/storage/v1/object/public/')) {
      const transformedPath = urlObject.pathname.replace('/object/public/', '/render/image/public/');
      return `${urlObject.origin}${transformedPath}?width=${width}&height=${height}&resize=${resize}`;
    }
    
    // Se for uma URL válida mas não do Supabase, retorna a original.
    return url;
  } catch (error) {
    // Se a URL for inválida, registra o erro no console para depuração e retorna undefined.
    // Isso fará com que o componente use a imagem de placeholder em vez de quebrar a aplicação.
    console.error(`URL inválida encontrada e ignorada: ${url}`, error);
    return undefined;
  }
}