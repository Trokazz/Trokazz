import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface SessionContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Busca a sessão inicial para determinar o estado de login do usuário.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);

      // 2. Após a verificação inicial, cria um "ouvinte" para futuras mudanças de autenticação.
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          // Lida com efeitos colaterais para novos cadastros, como o envio de e-mail de boas-vindas.
          if (_event === 'SIGNED_IN' && session) {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', session.user.id)
                .single();

              // Se for um usuário novo (perfil criado pelo gatilho, mas sem nome completo), envia o e-mail.
              if (profile && profile.full_name === null) {
                supabase.functions.invoke('send-welcome-email').catch(err => {
                  console.error("Falha ao invocar a função de e-mail de boas-vindas:", err);
                });
              }
            } catch (e) {
              console.error("Erro na lógica de mudança de estado de autenticação (SIGNED_IN):", e);
            }
          }
          
          // Atualiza o estado da sessão para refletir a mudança (login, logout, etc.).
          setSession(session);
        }
      );

      // Limpa o "ouvinte" quando o componente é desmontado para evitar vazamentos de memória.
      return () => {
        subscription.unsubscribe();
      };
    });
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    loading,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};