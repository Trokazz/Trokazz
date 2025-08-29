"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { Loader2, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import InputMask from 'react-input-mask';

const AuthPage: React.FC = () => {
  const supabase = useSupabase();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register State
  const [registerFullName, setRegisterFullName] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerAccountType, setRegisterAccountType] = useState('individual'); // 'individual' | 'company'
  const [registerCpf, setRegisterCpf] = useState('');
  const [registerDateOfBirth, setRegisterDateOfBirth] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerCep, setRegisterCep] = useState('');
  const [registerAddressStreet, setRegisterAddressStreet] = useState('');
  const [registerAddressNumber, setRegisterAddressNumber] = useState('');
  const [registerAddressComplement, setRegisterAddressComplement] = useState('');
  const [registerAddressNeighborhood, setRegisterAddressNeighborhood] = useState('');
  const [registerAddressCity, setRegisterAddressCity] = useState('');
  const [registerAddressState, setRegisterAddressState] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        setError(error.message);
        toast.error(`Erro ao fazer login: ${error.message}`);
      } else {
        toast.success('Login bem-sucedido!');
        navigate('/'); // Redireciona para a página inicial
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado durante o login.');
      toast.error(err.message || 'Ocorreu um erro inesperado durante o login.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Basic validation
    if (!registerFullName || !registerEmail || !registerPassword || !registerAccountType || !registerCpf || !registerDateOfBirth || !registerPhone || !registerCep || !registerAddressStreet || !registerAddressNumber || !registerAddressNeighborhood || !registerAddressCity || !registerAddressState) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: registerEmail,
        password: registerPassword,
        options: {
          data: {
            full_name: registerFullName,
            username: registerUsername || null, // Optional
            account_type: registerAccountType,
            document_number: registerCpf.replace(/\D/g, ''), // Remove non-digits
            date_of_birth: registerDateOfBirth, // Format DD/MM/YYYY
            phone: registerPhone.replace(/\D/g, ''), // Remove non-digits
            cep: registerCep.replace(/\D/g, ''), // Remove non-digits
            address_street: registerAddressStreet,
            address_number: registerAddressNumber,
            address_complement: registerAddressComplement || null, // Optional
            address_neighborhood: registerAddressNeighborhood,
            address_city: registerAddressCity,
            address_state: registerAddressState,
          },
        },
      });

      if (error) {
        console.error('Supabase signUp error:', error);
        setError(error.message);
        toast.error(`Erro ao registrar: ${error.message}`);
      } else if (data.user) {
        toast.success('Registro bem-sucedido! Verifique seu e-mail para confirmar sua conta.');
        navigate('/login'); // Redireciona para o login após o registro bem-sucedido
      } else {
        toast.success('Registro bem-sucedido! Verifique seu e-mail para confirmar sua conta.');
        navigate('/login');
      }
    } catch (err: any) {
      console.error('Unexpected registration error:', err);
      setError(err.message || 'Ocorreu um erro inesperado durante o registro.');
      toast.error(err.message || 'Ocorreu um erro inesperado durante o registro.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!loginEmail) {
      toast.error('Por favor, insira seu e-mail para redefinir a senha.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
        redirectTo: `${window.location.origin}/update-password`, // You'll need to create this page
      });
      if (error) {
        setError(error.message);
        toast.error(`Erro ao enviar e-mail de redefinição: ${error.message}`);
      } else {
        toast.success('Verifique seu e-mail para instruções de redefinição de senha.');
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado.');
      toast.error(err.message || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <img src="/logo.png" alt="Trokazz Logo" className="mx-auto h-12 w-auto mb-4" />
          <CardTitle className="text-2xl text-center">
            {activeTab === 'login' ? 'Acesse a sua conta' : 'Crie a sua conta. É grátis!'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Cadastrar</TabsTrigger>
            </TabsList>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">
                <strong className="font-bold">Erro:</strong>
                <span className="block sm:inline"> {error}</span>
              </div>
            )}

            <TabsContent value="login" className="mt-4">
              <p className="text-sm text-gray-500 mb-4">Acesse sua conta para continuar.</p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="loginEmail">Email</Label>
                  <Input
                    id="loginEmail"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="loginPassword">Senha</Label>
                  <Input
                    id="loginPassword"
                    type="password"
                    placeholder="********"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="text-right">
                  <Button variant="link" type="button" onClick={handleForgotPassword} className="px-0 text-blue-600 hover:text-blue-500">
                    Esqueceu a senha?
                  </Button>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-4">
              <p className="text-sm text-gray-500 mb-4">Crie sua conta em segundos.</p>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label htmlFor="registerFullName">Nome Completo</Label>
                  <Input
                    id="registerFullName"
                    type="text"
                    placeholder="Seu Nome Completo"
                    value={registerFullName}
                    onChange={(e) => setRegisterFullName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="registerUsername">Nome de Usuário (Opcional)</Label>
                  <Input
                    id="registerUsername"
                    type="text"
                    placeholder="seu_usuario"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="registerEmail">Email</Label>
                  <Input
                    id="registerEmail"
                    type="email"
                    placeholder="seu@email.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="registerPassword">Senha</Label>
                  <Input
                    id="registerPassword"
                    type="password"
                    placeholder="********"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="registerAccountType">Tipo de Conta</Label>
                  <Select value={registerAccountType} onValueChange={setRegisterAccountType} required>
                    <SelectTrigger id="registerAccountType">
                      <SelectValue placeholder="Selecione o tipo de conta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="company">Empresa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="registerCpf">CPF</Label>
                  <InputMask
                    mask="999.999.999-99"
                    value={registerCpf}
                    onChange={(e) => setRegisterCpf(e.target.value)}
                    required
                  >
                    {(inputProps: any) => <Input {...inputProps} id="registerCpf" type="text" placeholder="XXX.XXX.XXX-XX" />}
                  </InputMask>
                </div>
                <div>
                  <Label htmlFor="registerDateOfBirth">Data de Nascimento</Label>
                  <div className="relative">
                    <InputMask
                      mask="99/99/9999"
                      value={registerDateOfBirth}
                      onChange={(e) => setRegisterDateOfBirth(e.target.value)}
                      required
                    >
                      {(inputProps: any) => <Input {...inputProps} id="registerDateOfBirth" type="text" placeholder="DD/MM/AAAA" />}
                    </InputMask>
                    <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="registerPhone">Telefone</Label>
                  <InputMask
                    mask="(99) 99999-9999"
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    required
                  >
                    {(inputProps: any) => <Input {...inputProps} id="registerPhone" type="text" placeholder="(XX) XXXXX-XXXX" />}
                  </InputMask>
                </div>
                <div>
                  <Label htmlFor="registerCep">CEP</Label>
                  <InputMask
                    mask="99999-999"
                    value={registerCep}
                    onChange={(e) => setRegisterCep(e.target.value)}
                    required
                  >
                    {(inputProps: any) => <Input {...inputProps} id="registerCep" type="text" placeholder="XXXXX-XXX" />}
                  </InputMask>
                </div>
                <div>
                  <Label htmlFor="registerAddressStreet">Endereço</Label>
                  <Input
                    id="registerAddressStreet"
                    type="text"
                    placeholder="Rua, Avenida, etc."
                    value={registerAddressStreet}
                    onChange={(e) => setRegisterAddressStreet(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="registerAddressNumber">Número</Label>
                    <Input
                      id="registerAddressNumber"
                      type="text"
                      placeholder="Número"
                      value={registerAddressNumber}
                      onChange={(e) => setRegisterAddressNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="registerAddressComplement">Complemento (Opcional)</Label>
                    <Input
                      id="registerAddressComplement"
                      type="text"
                      placeholder="Apto, Bloco, Casa"
                      value={registerAddressComplement}
                      onChange={(e) => setRegisterAddressComplement(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="registerAddressNeighborhood">Bairro</Label>
                  <Input
                    id="registerAddressNeighborhood"
                    type="text"
                    placeholder="Bairro"
                    value={registerAddressNeighborhood}
                    onChange={(e) => setRegisterAddressNeighborhood(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="registerAddressCity">Cidade</Label>
                    <Input
                      id="registerAddressCity"
                      type="text"
                      placeholder="Cidade"
                      value={registerAddressCity}
                      onChange={(e) => setRegisterAddressCity(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="registerAddressState">Estado</Label>
                    <Input
                      id="registerAddressState"
                      type="text"
                      placeholder="UF"
                      maxLength={2}
                      value={registerAddressState}
                      onChange={(e) => setRegisterAddressState(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Cadastrar'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;