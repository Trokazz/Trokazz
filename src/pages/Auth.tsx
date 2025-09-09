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
        <Label htmlFor="fullName" className={cn(isLogin ? "text-primary-foreground/80" : "text-foreground")}>Nome</Label>
        <Input id="fullName" type="text" placeholder="Seu nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} required className={cn(isLogin ? "bg-primary-foreground/10 border-primary-foreground/20 text-white placeholder:text-primary-foreground/50" : "bg-background border-border text-foreground placeholder:text-muted-foreground")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email-signup" className={cn(isLogin ? "text-primary-foreground/80" : "text-foreground")}>E-mail</Label>
        <Input id="email-signup" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className={cn(isLogin ? "bg-primary-foreground/10 border-primary-foreground/20 text-white placeholder:text-primary-foreground/50" : "bg-background border-border text-foreground placeholder:text-muted-foreground")} />
      </div>
      <div className="space-y-2 relative">
        <Label htmlFor="password-signup" className={cn(isLogin ? "text-primary-foreground/80" : "text-foreground")}>Senha</Label>
        <Input id="password-signup" type={showPassword ? "text" : "password"} placeholder="Sua senha" value={password} onChange={(e) => setPassword(e.target.value)} required className={cn(isLogin ? "bg-primary-foreground/10 border-primary-foreground/20 text-white placeholder:text-primary-foreground/50" : "bg-background border-border text-foreground placeholder:text-muted-foreground")} />
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
        <Label htmlFor="email-login" className="text-primary-foreground/80">E-mail</Label>
        <Input id="email-login" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-primary-foreground/10 border-primary-foreground/20 text-white placeholder:text-primary-foreground/50" />
      </div>
      <div className="space-y-2 relative">
        <Label htmlFor="password-login" className="text-primary-foreground/80">Senha</Label>
        <Input id="password-login" type={showPassword ? "text" : "password"} placeholder="Sua senha" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-primary-foreground/10 border-primary-foreground/20 text-white placeholder:text-primary-foreground/50" />
        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-7 h-7 w-7 text-primary-foreground/80 hover:bg-primary-foreground/10" onClick={() => setShowPassword(!showPassword)}>
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
        <Link to="/" className="flex items-center justify-center gap-2 font-semibold text-3xl text-foreground"> {/* Alterado para text-foreground */}
          <img src="/logo.png" alt="Trokazz Logo" className="h-10 w-10 text-accent" />
          <span>Trokazz</span>
        </Link>
        <h1 className="text-2xl font-semibold text-foreground mt-2">Página de cadastro e Login</h1> {/* Alterado para text-foreground */}
      </div>

      {/* Desktop View */}
      <Card className="hidden md:grid md:grid-cols-2 w-full max-w-4xl overflow-hidden bg-transparent border-none shadow-none">
        <div className="p-8 bg-card rounded-l-lg"> {/* Signup card */}
          <CardHeader className="text-center p-0 mb-6">
            <CardTitle className="text-2xl">Cadastro</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {SignUpForm}
          </CardContent>
        </div>
        <div className="p-8 bg-primary text-primary-foreground rounded-r-lg"> {/* Login card */}
          <CardHeader className="text-center p-0 mb-6">
            <CardTitle className="text-2xl">Login</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {LoginForm}
          </CardContent>
        </div>
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
        <Card className={cn(isLogin ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground')}> {/* Mobile Card */}
          <CardHeader>
            <CardTitle className={cn(isLogin ? "text-primary-foreground" : "text-foreground")}>{isLogin ? 'Login' : 'Cadastro'}</CardTitle>
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