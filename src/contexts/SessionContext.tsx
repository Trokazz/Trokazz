import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { showLoading, dismissToast, showError } from '@/utils/toast';

interface SessionContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthStateChange = async (currentSession: Session | null) => {
      setSession(currentSession);
      setUser(currentSession?.user || null);

      if (currentSession?.user) {
        // Fetch user profile status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', currentSession.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no row found
          console.error("Error fetching user profile status:", profileError);
          showError("Erro ao verificar status da conta: " + profileError.message);
          setLoading(false);
          return;
        }

        if (profile?.status === 'suspended') {
          console.warn(`User ${currentSession.user.id} is suspended. Signing out.`);
          await supabase.auth.signOut();
          showError("Sua conta foi suspensa. Por favor, entre em contato com o suporte.");
          setSession(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting initial session:", error);
        showError("Erro ao carregar sessão: " + error.message);
      }
      await handleAuthStateChange(session);
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthStateChange(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={{ session, user, loading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};