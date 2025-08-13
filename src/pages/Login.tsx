import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { showError } from "@/utils/toast";
import { useSession } from "@/contexts/SessionContext";
import { useState } from "react";
import usePageMetadata from "@/hooks/usePageMetadata"; // Importando o hook

const loginSchema = z.object({
  email: z.string().email("Por favor, insira um e-mail válido."),
  password: z.string().min(1, "A senha é obrigatória."),
});

const Login = () => {
  const { session } = useSession();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) throw error;
      navigate("/");
    } catch (error) {
      showError("E-mail ou senha inválidos.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (error) {
      showError(error instanceof Error ? error.message : "Não foi possível fazer login com o Google.");
    }
  };

  // Adicionando o hook usePageMetadata
  usePageMetadata({
    title: "Acessar Conta - Trokazz",
    description: "Faça login na sua conta Trokazz para comprar, vender e trocar produtos e serviços em Dourados e região.",
    keywords: "login, entrar, conta, trokazz, classificados, dourados",
    ogUrl: window.location.href,
  });

  if (session) {
    return <Navigate to="/" />;
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-md space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-foreground">
              Acesse sua conta
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Bem-vindo(a) de volta!
            </p>
          </div>
          <div className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input placeholder="seu@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Senha</FormLabel>
                      <div className="text-sm">
                        <a href="#" className="font-semibold text-primary hover:text-primary/90">
                          Esqueceu a senha?
                        </a>
                      </div>
                    </div>
                    <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </Form>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Ou continue com
                </span>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
              Google
            </Button>
          </div>
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Não tem uma conta?{" "}
            <Link to="/signup" className="font-semibold leading-6 text-primary hover:text-primary/90">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
      <div className="relative hidden lg:flex flex-col items-center justify-center p-10 text-white bg-gradient-to-br from-primary to-accent-gradient">
         <div className="text-center">
            <Link to="/" className="flex items-center justify-center space-x-2 mb-8">
                <img src="/logo.png" alt="Trokazz Logo" className="h-12 w-auto brightness-0 invert" />
                <span className="text-4xl font-bold">
                Trokazz
                </span>
            </Link>
            <h1 className="text-4xl font-bold">
                Sua nova forma de negociar.
            </h1>
            <p className="mt-4 text-lg opacity-90 max-w-md mx-auto">
                Compre, venda e troque com segurança na maior comunidade de Dourados e região.
            </p>
         </div>
      </div>
    </div>
  );
};

export default Login;