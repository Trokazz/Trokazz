import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import InputMask from 'react-input-mask'; // Importar InputMask
import axios from 'axios'; // Importar axios

const loginSchema = z.object({
  email: z.string().email("Por favor, insira um email válido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

const signupSchema = z.object({
  email: z.string().email("Por favor, insira um email válido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  full_name: z.string().min(2, "O nome completo é obrigatório."),
  username: z.string().min(3, "O nome de usuário deve ter pelo menos 3 caracteres.").optional().or(z.literal('')),
  account_type: z.enum(["individual", "business"], { required_error: "Por favor, selecione um tipo de conta." }),
  document_number: z.string().min(1, "O CPF/CNPJ é obrigatório.").refine((val) => {
    // Basic validation, more robust validation would be needed for real CPF/CNPJ
    const cleaned = val.replace(/\D/g, '');
    return cleaned.length >= 11 && cleaned.length <= 14; // CPF (11) or CNPJ (14)
  }, "CPF/CNPJ inválido."),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento inválida.").nonempty("A data de nascimento é obrigatória."),
  phone: z.string().min(10, "O telefone é obrigatório.").refine((val) => {
    const cleaned = val.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11; // 10 or 11 digits for phone
  }, "Telefone inválido."),
  cep: z.string().regex(/^\d{5}-\d{3}$/, "CEP inválido.").nonempty("O CEP é obrigatório."),
  address: z.string().min(5, "O endereço é obrigatório."),
  address_number: z.string().min(1, "O número é obrigatório."),
  address_complement: z.string().optional().or(z.literal('')),
  neighborhood: z.string().min(2, "O bairro é obrigatório."),
  city: z.string().min(2, "A cidade é obrigatória."),
  state: z.string().length(2, "O estado é obrigatório e deve ter 2 letras."),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

const AuthTabs = () => {
  const [activeTab, setActiveTab] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      full_name: "",
      username: "",
      account_type: "individual",
      document_number: "",
      date_of_birth: "",
      phone: "",
      cep: "",
      address: "",
      address_number: "",
      address_complement: "",
      neighborhood: "",
      city: "",
      state: "",
    },
  });

  const handleLogin = async (values: LoginFormData) => {
    setIsLoading(true);
    const toastId = showLoading("Entrando...");
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    dismissToast(toastId);
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Login realizado com sucesso!");
      navigate("/");
    }
    setIsLoading(false);
  };

  const handleSignUp = async (values: SignupFormData) => {
    setIsLoading(true);
    const toastId = showLoading("Criando sua conta...");

    const { email, password, ...metaData } = values;

    // Combine address fields into a single address string for the profile table
    const fullAddress = `${values.address}, ${values.address_number}${values.address_complement ? ` - ${values.address_complement}` : ''}, ${values.neighborhood}, ${values.city} - ${values.state}, ${values.cep}`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          ...metaData,
          address: fullAddress, // Store the combined address
        },
      },
    });
    dismissToast(toastId);
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Conta criada com sucesso! Verifique seu e-mail para confirmar.");
      setActiveTab("login"); // Redireciona para a aba de login após o cadastro
    }
    setIsLoading(false);
  };

  const accountType = signupForm.watch("account_type");
  const cepValue = signupForm.watch("cep");

  useEffect(() => {
    const fetchAddress = async () => {
      const cleanedCep = cepValue.replace(/\D/g, '');
      if (cleanedCep.length === 8) {
        try {
          const response = await axios.get(`https://viacep.com.br/ws/${cleanedCep}/json/`);
          const data = response.data;
          if (!data.erro) {
            signupForm.setValue("address", data.logradouro || "");
            signupForm.setValue("neighborhood", data.bairro || "");
            signupForm.setValue("city", data.localidade || "");
            signupForm.setValue("state", data.uf || "");
            showSuccess("Endereço preenchido automaticamente!");
          } else {
            showError("CEP não encontrado.");
            signupForm.setValue("address", "");
            signupForm.setValue("neighborhood", "");
            signupForm.setValue("city", "");
            signupForm.setValue("state", "");
          }
        } catch (error) {
          console.error("Erro ao buscar CEP:", error);
          showError("Erro ao buscar CEP. Tente novamente.");
        }
      }
    };

    fetchAddress();
  }, [cepValue, signupForm]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              {activeTab === 'login' ? 'Acesse a sua conta' : 'Crie a sua conta. É grátis!'}
            </h2>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <CardTitle>Entrar</CardTitle>
              <CardDescription>
                Acesse sua conta para continuar.
              </CardDescription>
              <CardContent className="space-y-4 pt-4">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl><Input type="email" placeholder="seu@email.com" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Entrar"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </TabsContent>
            <TabsContent value="signup">
              <CardTitle>Cadastrar</CardTitle>
              <CardDescription>
                Crie sua conta em segundos.
              </CardDescription>
              <CardContent className="space-y-4 pt-4">
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(handleSignUp)} className="space-y-4">
                    <FormField
                      control={signupForm.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl><Input placeholder="Seu Nome Completo" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome de Usuário (Opcional)</FormLabel>
                          <FormControl><Input placeholder="seu_usuario" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl><Input type="email" placeholder="seu@email.com" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="account_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Conta</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo de conta" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="individual">Individual</SelectItem>
                              <SelectItem value="business">Empresarial</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="document_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{accountType === 'business' ? 'CNPJ' : 'CPF'}</FormLabel>
                          <FormControl>
                            <InputMask
                              mask={accountType === 'business' ? '99.999.999/9999-99' : '999.999.999-99'}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder={accountType === 'business' ? 'XX.XXX.XXX/XXXX-XX' : 'XXX.XXX.XXX-XX'}
                            >
                              {(inputProps: any) => <Input {...inputProps} type="text" />}
                            </InputMask>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="date_of_birth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Nascimento</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <InputMask
                              mask={field.value.replace(/\D/g, '').length > 10 ? '(99) 99999-9999' : '(99) 9999-9999'}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="(XX) XXXXX-XXXX"
                            >
                              {(inputProps: any) => <Input {...inputProps} type="tel" />}
                            </InputMask>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="cep"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CEP</FormLabel>
                          <FormControl>
                            <InputMask
                              mask="99999-999"
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="XXXXX-XXX"
                            >
                              {(inputProps: any) => <Input {...inputProps} type="text" />}
                            </InputMask>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço</FormLabel>
                          <FormControl><Input placeholder="Rua, Avenida, etc." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="address_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número</FormLabel>
                          <FormControl><Input placeholder="Número" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="address_complement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Complemento (Opcional)</FormLabel>
                          <FormControl><Input placeholder="Apto, Bloco, Casa" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="neighborhood"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bairro</FormLabel>
                          <FormControl><Input placeholder="Bairro" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={signupForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <FormControl><Input placeholder="Cidade" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={signupForm.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <FormControl><Input placeholder="UF" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Cadastrar"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>
    </div>
  );
};

export default AuthTabs;