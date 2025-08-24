"use client";

import { useState, useEffect } from "react";
import { useNavigate, Link, Navigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { useTheme } from "@/components/ThemeProvider";
import usePageMetadata from "@/hooks/usePageMetadata";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Eye, EyeOff, CheckCircle, XCircle, Loader2 } from "lucide-react";

// --- Schemas e Componentes Auxiliares (do Signup.tsx) ---
const signupSchema = z.object({
  account_type: z.enum(["fisica", "juridica"], {
    required_error: "Selecione o tipo de conta.",
  }),
  document_number: z.string().min(11, "CPF/CNPJ inválido.").max(18, "CPF/CNPJ inválido."),
  full_name: z.string().min(3, "O nome completo deve ter pelo menos 3 caracteres."),
  username: z.string()
    .min(3, "O nome de usuário deve ter de 3 a 20 caracteres.")
    .max(20, "O nome de usuário deve ter de 3 a 20 caracteres.")
    .regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e o caractere '_'.")
    .optional()
    .or(z.literal('')),
  date_of_birth: z.string().refine((val) => /^\d{2}\/\d{2}\/\d{4}$/.test(val), {
    message: "Use o formato DD/MM/AAAA.",
  }),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  email: z.string().email("Por favor, insira um e-mail válido."),
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres.")
    .refine((val) => /[A-Z]/.test(val), { message: "A senha deve conter pelo menos uma letra maiúscula." })
    .refine((val) => /[a-z]/.test(val), { message: "A senha deve conter pelo menos uma letra minúscula." })
    .refine((val) => /\d/.test(val), { message: "A senha deve conter pelo menos um número." })
    .refine((val) => /[@$!%*?&]/.test(val), { message: "A senha deve conter pelo menos um caractere especial (@$!%*?&)." }),
});

const PasswordRequirement = ({ isValid, text }: { isValid: boolean; text: string }) => (
  <div className={`flex items-center text-sm ${isValid ? 'text-green-600' : 'text-muted-foreground'}`}>
    {isValid ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
    {text}
  </div>
);
// --- Fim dos Schemas e Componentes Auxiliares ---

const AuthTabs = () => {
  const { session } = useSession();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'login');
  const [isSocialLoading, setIsSocialLoading] = useState(false);

  // --- Lógica do Signup.tsx ---
  const [isSubmittingSignup, setIsSubmittingSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    mode: "onTouched",
    defaultValues: {
      username: "",
      phone: "",
      address: "",
    }
  });

  const password = signupForm.watch("password") || "";
  const accountType = signupForm.watch("account_type");

  const passwordRequirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password),
  };

  async function onSignupSubmit(values: z.infer<typeof signupSchema>) {
    setIsSubmittingSignup(true);
    const toastId = showLoading("Criando sua conta...");

    try {
      const finalUsername = values.username || values.full_name
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .substring(0, 15) + `_${Math.random().toString(36).substring(2, 6)}`;

      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.full_name,
            username: finalUsername,
            account_type: values.account_type,
            document_number: values.document_number.replace(/\D/g, ''),
            date_of_birth: values.date_of_birth.split('/').reverse().join('-'),
            phone: values.phone || null,
            address: values.address || null,
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error("Não foi possível criar o usuário.");

      try {
        await supabase.functions.invoke('send-welcome-email');
        console.log('Welcome email function invoked successfully.');
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }

      dismissToast(toastId);
      showSuccess("Conta criada! Por favor, verifique seu e-mail para confirmar.");
      navigate("/auth?tab=login"); // Redireciona para a aba de login após o cadastro
    } catch (error) {
      dismissToast(toastId);
      console.error("Detailed signup error:", error);
      showError(error);
    } finally {
      setIsSubmittingSignup(false);
    }
  }
  // --- Fim da Lógica do Signup.tsx ---

  usePageMetadata({
    title: "Acessar ou Criar Conta - Trokazz",
    description: "Faça login ou crie sua conta gratuita no Trokazz para comprar, vender e trocar produtos e serviços em Dourados e região.",
    keywords: "login, cadastro, entrar, criar conta, signup, trokazz, classificados, dourados",
    ogUrl: window.location.href,
  });

  // Redireciona se já estiver logado
  if (session) {
    return <Navigate to="/" />;
  }

  // Atualiza a aba ativa na URL
  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab && currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
  }, [searchParams, activeTab]);

  // Lógica de autenticação do Supabase (do Login.tsx)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) { // Se houver uma sessão, navega para a página inicial
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSocialLogin = async (provider: 'google') => {
    setIsSocialLoading(true);
    const toastId = showLoading(`Entrando com ${provider === 'google' ? 'Google' : 'Facebook'}...`);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      dismissToast(toastId);
    } catch (error) {
      dismissToast(toastId);
      showError(error instanceof Error ? error.message : "Erro ao fazer login com o provedor social.");
    } finally {
      setIsSocialLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md mx-auto bg-card p-8 rounded-lg shadow-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Trokazz Logo" className="h-12 w-auto mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground">
            {activeTab === 'login' ? 'Acesse a sua conta' : 'Crie a sua conta. É grátis!'}
          </h2>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Cadastrar</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-6">
            {/* Social Login Section */}
            <div className="flex justify-center gap-4 mb-6">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-16 w-16 rounded-full border-2 border-gray-300 hover:border-primary"
                onClick={() => handleSocialLogin('google')}
                disabled={isSocialLoading}
              >
                {isSocialLoading ? <Loader2 className="h-8 w-8 animate-spin" /> : <img src="/google-icon.svg" alt="Google" className="h-8 w-8" />}
              </Button>
            </div>
            
            {/* "Ou" separator */}
            <div className="relative flex justify-center text-xs uppercase mb-6">
              <span className="bg-background px-2 text-muted-foreground z-10">ou</span>
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
            </div>

            <div className="supabase-auth-container"> {/* Wrapper div added here */}
              <Auth
                supabaseClient={supabase}
                providers={[]}
                appearance={{
                  theme: ThemeSupa,
                  variables: {
                    default: {
                      colors: {
                        brand: 'hsl(var(--olx-orange))',
                        brandAccent: 'hsl(var(--olx-orange-foreground))',
                        inputBackground: 'hsl(var(--input))',
                        inputBorder: 'hsl(var(--border))',
                        inputPlaceholder: 'hsl(var(--muted-foreground))',
                        inputText: 'hsl(var(--foreground))',
                        messageText: 'hsl(var(--destructive-foreground))',
                        messageBackground: 'hsl(var(--destructive))',
                        defaultButtonBackground: 'hsl(var(--olx-orange))',
                        defaultButtonBorder: 'hsl(var(--olx-orange))',
                        defaultButtonText: 'hsl(var(--olx-orange-foreground))',
                        // Removed unsupported properties
                        // anchorTextColor: 'hsl(var(--primary))',
                        // anchorTextHoverColor: 'hsl(var(--primary-foreground))',
                      },
                    },
                  },
                }}
                theme={theme === 'dark' ? 'dark' : 'light'}
                showLinks={false}
                redirectTo={window.location.origin}
              />
            </div>
            <div className="text-center mt-6 text-sm text-muted-foreground">
              <Link to="/forgot-password" className="text-primary hover:underline">
                Esqueceu sua senha?
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="signup" className="mt-6">
            <p className="text-center text-muted-foreground mb-6">
              Nos informe alguns dados para que possamos melhorar a sua experiência na Trokazz.
            </p>

            <Form {...signupForm}>
              <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                <FormField control={signupForm.control} name="account_type" render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Escolha o tipo da sua conta</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="fisica" /></FormControl><FormLabel className="font-normal">Pessoa Física</FormLabel></FormItem>
                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="juridica" /></FormControl><FormLabel className="font-normal">Pessoa Jurídica</FormLabel></FormItem>
                      </RadioGroup>
                    </FormControl><FormMessage />
                  </FormItem>
                )} />
                <FormField control={signupForm.control} name="document_number" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{accountType === 'juridica' ? 'CNPJ' : 'CPF'}</FormLabel>
                    <FormControl><Input placeholder={accountType === 'juridica' ? '00.000.000/0000-00' : '000.000.000-00'} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={signupForm.control} name="full_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={signupForm.control} name="username" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Como você quer ser chamado(a)?</FormLabel>
                      <FormControl><Input placeholder="Exemplo: João S." {...field} /></FormControl>
                      <FormDescription>Aparecerá em seu perfil, anúncios e chats.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={signupForm.control} name="date_of_birth" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de nascimento</FormLabel>
                    <FormControl><Input placeholder="dd/mm/aaaa" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={signupForm.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone (WhatsApp)</FormLabel>
                    <FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={signupForm.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl><Input placeholder="Rua, Número, Bairro, Cidade" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={signupForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl><Input placeholder="seu@email.com" {...field} /></FormControl>
                      <FormDescription>Enviaremos um e-mail de confirmação.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={signupForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">Para sua segurança, crie uma senha com no mínimo:</p>
                  <PasswordRequirement isValid={passwordRequirements.length} text="8 ou mais caracteres" />
                  <PasswordRequirement isValid={passwordRequirements.uppercase} text="Uma letra maiúscula" />
                  <PasswordRequirement isValid={passwordRequirements.lowercase} text="Uma letra minúscula" />
                  <PasswordRequirement isValid={passwordRequirements.number} text="Um número" />
                  <PasswordRequirement isValid={passwordRequirements.special} text="Um caracter especial (exemplo: @$!%*?&)" />
                </div>
                <Button type="submit" className="w-full bg-olx-orange text-olx-orange-foreground hover:bg-olx-orange-darker" disabled={isSubmittingSignup}>
                  {isSubmittingSignup ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cadastrando...
                    </>
                  ) : (
                    "Cadastre-se"
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          <Link to="/contato" className="text-primary hover:underline">
            Preciso de ajuda?
          </Link>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ao continuar, você concorda com nossos{" "}
          <Link to="/termos-de-servico" target="_blank" className="underline hover:text-primary">Termos de Serviço</Link> e{" "}
          <Link to="/politica-de-privacidade" target="_blank" className="underline hover:text-primary">Política de Privacidade</Link>.
        </p>
      </div>
    </div>
  );
};

export default AuthTabs;