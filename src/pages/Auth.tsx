import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showError, showSuccess } from '@/utils/toast';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils'; // Import cn for conditional class names

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) {
      showError(error.message);
    } else {
      showSuccess('Cadastro realizado! Verifique seu e-mail para confirmação.');
      setIsLogin(true); // Switch to login view
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      showError(error.message);
    } else {
      showSuccess('Login bem-sucedido!');
      navigate('/');
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) {
      showError(error.message);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      showError('Por favor, insira seu e-mail.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess('Se o e-mail estiver correto, um link para redefinição de senha foi enviado.');
      setIsResetDialogOpen(false);
    }
  };

  const SignUpForm = (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName" className="text-foreground">Nome</Label>
        <Input id="fullName" type="text" placeholder="Seu nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="bg-background border-border text-foreground placeholder:text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email-signup" className="text-foreground">E-mail</Label>
        <Input id="email-signup" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-background border-border text-foreground placeholder:text-muted-foreground" />
      </div>
      <div className="space-y-2 relative">
        <Label htmlFor="password-signup" className="text-foreground">Senha</Label>
        <Input id="password-signup" type={showPassword ? "text" : "password"} placeholder="Sua senha" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-background border-border text-foreground placeholder:text-muted-foreground" />
        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-7 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
      <Button type="submit" className="w-full bg-accent hover:bg-accent/90">Cadastrar</Button>
      <Button type="button" onClick={handleGoogleLogin} className="w-full bg-slate-900 hover:bg-slate-800 text-white">Cadastrar com Google</Button>
    </form>
  );

  const LoginForm = (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email-login" className="text-foreground">E-mail</Label>
        <Input id="email-login" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-background border-border text-foreground placeholder:text-muted-foreground" />
      </div>
      <div className="space-y-2 relative">
        <Label htmlFor="password-login" className="text-foreground">Senha</Label>
        <Input id="password-login" type={showPassword ? "text" : "password"} placeholder="Sua senha" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-background border-border text-foreground placeholder:text-muted-foreground" />
        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-7 h-7 w-7 text-muted-foreground hover:bg-muted" onClick={() => setShowPassword(!showPassword)}>
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
      <div className="text-right -mt-2">
        <Button type="button" variant="link" className="p-0 h-auto text-accent text-sm" onClick={() => setIsResetDialogOpen(true)}>
          Esqueceu a senha?
        </Button>
      </div>
      <Button type="submit" className="w-full bg-accent hover:bg-accent/90">Entrar</Button>
      <Button type="button" onClick={handleGoogleLogin} className="w-full bg-slate-900 hover:bg-slate-800 text-white">Entrar com Google</Button>
    </form>
  );

  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen bg-background p-4"
    >
      <div className="text-center mb-8">
        <Link to="/" className="flex items-center justify-center gap-2 font-semibold text-3xl text-foreground">
          <img src="/logo.png" alt="Trokazz Logo" className="h-10 w-10 text-accent" />
          <span>Trokazz</span>
        </Link>
        <h1 className="text-2xl font-semibold text-foreground mt-2">Página de cadastro e Login</h1>
      </div>

      {/* Desktop View */}
      <Card className="hidden md:block w-full max-w-md bg-card text-foreground">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{isLogin ? 'Login' : 'Cadastro'}</CardTitle>
          <div className="flex justify-center mt-4">
            <Button
              variant={isLogin ? 'default' : 'ghost'}
              onClick={() => setIsLogin(true)}
              className={cn(isLogin ? "bg-accent hover:bg-accent/90 text-accent-foreground" : "text-foreground hover:bg-muted")}
            >
              Login
            </Button>
            <Button
              variant={!isLogin ? 'default' : 'ghost'}
              onClick={() => setIsLogin(false)}
              className={cn(!isLogin ? "bg-accent hover:bg-accent/90 text-accent-foreground" : "text-foreground hover:bg-muted")}
            >
              Cadastro
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLogin ? LoginForm : SignUpForm}
        </CardContent>
      </Card>

      {/* Mobile View */}
      <div className="w-full max-w-sm md:hidden">
        <div className="flex justify-center mb-4">
          <Button 
            variant={isLogin ? 'ghost' : 'default'} 
            onClick={() => setIsLogin(false)}
            className={cn(isLogin ? "text-foreground hover:bg-muted" : "bg-accent hover:bg-accent/90 text-accent-foreground")}
          >
            Cadastro
          </Button>
          <Button 
            variant={isLogin ? 'default' : 'ghost'} 
            onClick={() => setIsLogin(true)}
            className={cn(isLogin ? "bg-accent hover:bg-accent/90 text-accent-foreground" : "text-foreground hover:bg-muted")}
          >
            Login
          </Button>
        </div>
        <Card className={cn(isLogin ? 'bg-card text-foreground' : 'bg-card text-foreground')}> {/* Mobile Card */}
          <CardHeader>
            <CardTitle className="text-foreground">{isLogin ? 'Login' : 'Cadastro'}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLogin ? LoginForm : SignUpForm}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Redefinir Senha</DialogTitle>
                <DialogDescription>
                    Digite seu e-mail para receber um link de redefinição de senha.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePasswordReset}>
                <div className="space-y-2">
                    <Label htmlFor="reset-email">E-mail</Label>
                    <Input
                        id="reset-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                    />
                </div>
                <DialogFooter className="mt-4">
                    <Button type="button" variant="ghost" onClick={() => setIsResetDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit">Enviar Link</Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuthPage;