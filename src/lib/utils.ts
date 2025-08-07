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
    const urlObject = new URL(url);
    if (urlObject.hostname.endsWith('supabase.co') && urlObject.pathname.includes('/storage/v1/object/public/')) {
      const transformedPath = urlObject.pathname.replace('/object/public/', '/render/image/public/');
      return `${urlObject.origin}${transformedPath}?width=${width}&height=${height}&resize=${resize}`;
    }
    return url;
  } catch (error) {
    return undefined;
  }
}