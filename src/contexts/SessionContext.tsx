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
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (_event === 'SIGNED_IN' && session) {
          try {
            // Verifica se o perfil do usuário é novo (ou seja, ainda não tem um nome completo)
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', session.user.id)
              .single();

            if (error && error.code !== 'PGRST116') {
              console.error("Erro ao buscar perfil para e-mail de boas-vindas:", error);
            }

            // Se o perfil existe mas não tem nome, é um novo usuário.
            // O perfil é criado automaticamente por um gatilho no cadastro.
            if (profile && profile.full_name === null) {
              // Invoca a função de servidor para enviar o e-mail.
              // É uma operação "dispare e esqueça" do ponto de vista do cliente.
              supabase.functions.invoke('send-welcome-email').catch(err => {
                console.error("Falha ao invocar a função de e-mail de boas-vindas:", err);
              });
            }
          } catch (e) {
            console.error("Erro na lógica de mudança de estado de autenticação (SIGNED_IN):", e);
          }
        }
        setSession(session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    loading,
  };

  return (
    <SessionContext.Provider value={value}>
      {!loading && children}
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