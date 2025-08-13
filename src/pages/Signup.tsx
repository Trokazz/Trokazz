import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { useSession } from "@/contexts/SessionContext";
import { useState } from "react";
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import usePageMetadata from "@/hooks/usePageMetadata"; // Importando o hook

const signupSchema = z.object({
  account_type: z.enum(["fisica", "juridica"], {
    required_error: "Selecione o tipo de conta.",
  }),
  document_number: z.string().min(11, "CPF/CNPJ inválido.").max(18, "CPF/CNPJ inválido."),
  full_name: z.string().min(3, "O nome completo deve ter pelo menos 3 caracteres."),
  date_of_birth: z.string().refine((val) => /^\d{2}\/\d{2}\/\d{4}$/.test(val), {
    message: "Use o formato DD/MM/AAAA.",
  }),
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

const Signup = () => {
  const { session } = useSession();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    mode: "onTouched",
  });

  const password = form.watch("password") || "";

  const passwordRequirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&]/.test(password),
  };

  async function onSubmit(values: z.infer<typeof signupSchema>) {
    setIsSubmitting(true);
    const toastId = showLoading("Criando sua conta...");

    try {
      // Gerar nome de usuário único
      const baseUsername = values.full_name
        .toLowerCase()
        .replace(/\s+/g, '_') // Substitui espaços por underscores
        .replace(/[^a-z0-9_]/g, '') // Remove caracteres não alfanuméricos (exceto underscore)
        .substring(0, 15); // Limita o comprimento da base

      const randomSuffix = Math.random().toString(36).substring(2, 6); // 4 caracteres alfanuméricos aleatórios
      const generatedUsername = `${baseUsername}_${randomSuffix}`;

      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.full_name,
            username: generatedUsername, // Passa o nome de usuário gerado
            account_type: values.account_type,
            document_number: values.document_number.replace(/\D/g, ''),
            date_of_birth: values.date_of_birth.split('/').reverse().join('-'), // Converte DD/MM/YYYY para YYYY-MM-DD
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error("Não foi possível criar o usuário.");

      dismissToast(toastId);
      showSuccess("Conta criada! Por favor, verifique seu e-mail para confirmar.");
      navigate("/login");
    } catch (error) {
      dismissToast(toastId);
      console.error("Detailed signup error:", error); // Adicionado para depuração
      showError(error); // Usando a função showError aprimorada
    } finally {
      setIsSubmitting(false);
    }
  }

  // Adicionando o hook usePageMetadata
  usePageMetadata({
    title: "Criar Conta - Trokazz",
    description: "Crie sua conta gratuita no Trokazz e comece a comprar, vender e trocar produtos e serviços em Dourados e região.",
    keywords: "cadastro, criar conta, signup, trokazz, classificados, dourados",
    ogUrl: window.location.href,
  });

  if (session) {
    return <Navigate to="/" />;
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-foreground">
              Crie sua conta
            </h2>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="account_type" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>Escolha o tipo da sua conta</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                      <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="fisica" /></FormControl><FormLabel className="font-normal">Pessoa Física</FormLabel></FormItem>
                      <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="juridica" /></FormControl><FormLabel className="font-normal">Pessoa Jurídica</FormLabel></FormItem>
                    </RadioGroup>
                  </FormControl><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="document_number" render={({ field }) => (
                <FormItem><FormLabel>{form.watch('account_type') === 'juridica' ? 'CNPJ' : 'CPF'}</FormLabel><FormControl><Input placeholder={form.watch('account_type') === 'juridica' ? '00.000.000/0000-00' : '000.000.000-00'} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="full_name" render={({ field }) => (
                <FormItem><FormLabel>Nome completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="date_of_birth" render={({ field }) => (
                <FormItem><FormLabel>Data de nascimento</FormLabel><FormControl><Input placeholder="dd/mm/aaaa" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input placeholder="seu@email.com" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
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
              <div className="space-y-1">
                <p className="text-sm font-medium">Para sua segurança, crie uma senha com no mínimo:</p>
                <PasswordRequirement isValid={passwordRequirements.length} text="8 ou mais caracteres" />
                <PasswordRequirement isValid={passwordRequirements.uppercase} text="Uma letra maiúscula" />
                <PasswordRequirement isValid={passwordRequirements.lowercase} text="Uma letra minúscula" />
                <PasswordRequirement isValid={passwordRequirements.number} text="Um número" />
                <PasswordRequirement isValid={passwordRequirements.special} text="Um caracter especial (exemplo: @!$&)" />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Ao se cadastrar, você concorda com nossos{" "}
                <Link to="/termos-de-servico" target="_blank" className="underline hover:text-primary">Termos de Serviço</Link> e{" "}
                <Link to="/politica-de-privacidade" target="_blank" className="underline hover:text-primary">Política de Privacidade</Link>.
              </p>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Criando conta..." : "Criar Conta"}
              </Button>
            </form>
          </Form>
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link to="/login" className="font-semibold leading-6 text-primary hover:text-primary/90">
              Acesse aqui
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

export default Signup;