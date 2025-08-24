import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { isValid, format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client'; // Import supabase

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

// Helper to get the relative path from any Supabase URL format
export function getRelativePathFromUrlOrPath(urlOrPath: string, bucketName: string): string {
  if (!urlOrPath) return '';
  // Check if it's a full Supabase public URL
  if (urlOrPath.includes(`/storage/v1/object/public/${bucketName}/`)) {
    return urlOrPath.split(`/storage/v1/object/public/${bucketName}/`)[1].split('?')[0]; // Also remove query params
  }
  // If it's a transformed render URL
  if (urlOrPath.includes(`/render/image/public/${bucketName}/`)) {
    return urlOrPath.split(`/render/image/public/${bucketName}/`)[1].split('?')[0]; // Also remove query params
  }
  // Otherwise, assume it's already a relative path
  return urlOrPath.split('?')[0]; // Just remove query params if any
}

// Updated getOptimizedImageUrl to accept relative path and bucket name
export function getOptimizedImageUrl(imagePathOrUrl: string | null | undefined, options: { width: number; height: number; resize?: 'cover' | 'contain' | 'fill' }, bucketName: 'advertisements' | 'avatars' | 'banners' | 'service_images' | 'verification-documents'): string | undefined {
  if (!imagePathOrUrl) return undefined;
  
  const { width, height, resize = 'cover' } = options;

  try {
    // First, ensure we have a clean relative path, regardless of input format
    const relativePath = getRelativePathFromUrlOrPath(imagePathOrUrl, bucketName);
    if (!relativePath) return undefined; // Should not happen if imagePathOrUrl is valid

    // Get the public URL from Supabase Storage using the clean relative path
    const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(relativePath);

    if (!publicUrl) return undefined;

    const urlObject = new URL(publicUrl);
    
    // Check if it's a Supabase Storage URL and transform it for image rendering
    // This check is now more reliable as publicUrl should always be in the /object/public/ format
    if (urlObject.hostname.endsWith('supabase.co') && urlObject.pathname.includes('/storage/v1/object/public/')) {
      const transformedPath = urlObject.pathname.replace('/object/public/', '/render/image/public/');
      return `${urlObject.origin}${transformedPath}?width=${width}&height=${height}&resize=${resize}`;
    }
    
    // Fallback: if for some reason it's not a transformable Supabase URL, return the public URL directly
    return publicUrl; 
  } catch (error) {
    console.error(`Erro ao otimizar URL de imagem: ${imagePathOrUrl} para bucket ${bucketName}`, error);
    return undefined;
  }
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'N/A'; // Or any other placeholder for null/undefined values
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}