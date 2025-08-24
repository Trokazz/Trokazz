import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase'; // Importa os tipos gerados

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your .env file.');
}

// Agora, o cliente Supabase é tipado
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);