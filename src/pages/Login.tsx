import { Auth } from "@supabase/auth-ui-react";
import type { Theme } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, Link } from "react-router-dom";
import { useSession } from "@/contexts/SessionContext";

const Login = () => {
  const { session } = useSession();

  if (session) {
    return <Navigate to="/" />;
  }

  const customTheme: Theme = {
    default: {
      colors: {
        brand: 'hsl(var(--primary))',
        brandAccent: 'hsl(var(--primary))',
        brandButtonText: 'hsl(var(--primary-foreground))',
        defaultButtonBackground: 'hsl(var(--card))',
        defaultButtonBackgroundHover: 'hsl(var(--muted))',
        defaultButtonBorder: 'hsl(var(--border))',
        defaultButtonText: 'hsl(var(--foreground))',
        dividerBackground: 'hsl(var(--border))',
        inputBackground: 'hsl(var(--background))',
        inputBorder: 'hsl(var(--input))',
        inputBorderHover: 'hsl(var(--ring))',
        inputBorderFocus: 'hsl(var(--ring))',
        inputText: 'hsl(var(--foreground))',
        inputLabelText: 'hsl(var(--foreground))',
        inputPlaceholder: 'hsl(var(--muted-foreground))',
        messageText: 'hsl(var(--foreground))',
        messageTextDanger: 'hsl(var(--destructive))',
        anchorTextColor: 'hsl(var(--primary))',
        anchorTextHoverColor: 'hsl(var(--primary))',
      },
      space: {
        spaceSmall: '4px',
        spaceMedium: '8px',
        spaceLarge: '16px',
        labelBottomMargin: '8px',
        anchorBottomMargin: '4px',
        emailInputSpacing: '8px',
        socialAuthSpacing: '8px',
        buttonPadding: '10px 15px',
        inputPadding: '10px 15px',
      },
      fontSizes: {
        baseLabelSize: '14px',
        baseInputSize: '14px',
        baseButtonSize: '14px',
        baseBodySize: '13px',
      },
      fonts: {
        bodyFontFamily: `inherit`,
        buttonFontFamily: `inherit`,
        inputFontFamily: `inherit`,
        labelFontFamily: `inherit`,
      },
      borderWidths: {
        buttonBorderWidth: '1px',
        inputBorderWidth: '1px',
      },
      radii: {
        borderRadiusButton: 'var(--radius)',
        buttonBorderRadius: 'var(--radius)',
        inputBorderRadius: 'var(--radius)',
      },
    },
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="relative hidden bg-muted lg:flex flex-col items-center justify-center p-10 text-center bg-gradient-to-br from-primary/10 to-background">
         <div className="absolute inset-0 bg-background/50" />
         <div className="relative z-10">
            <Link to="/" className="flex items-center justify-center space-x-2 mb-8">
                <img src="/logo.png" alt="Trokazz Logo" className="h-12 w-auto" />
                <span className="text-4xl font-bold bg-gradient-to-r from-primary to-accent-gradient text-transparent bg-clip-text">
                Trokazz
                </span>
            </Link>
            <h1 className="text-4xl font-bold text-foreground">
                Sua nova forma de negociar.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-md mx-auto">
                Compre, venda e troque com segurança na maior comunidade de Dourados e região.
            </p>
         </div>
      </div>
      <div className="flex items-center justify-center py-12 px-4 min-h-screen">
        <div className="mx-auto grid w-[380px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Acesse sua Conta</h1>
            <p className="text-balance text-muted-foreground">
              Digite seu e-mail para entrar ou criar sua conta
            </p>
          </div>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: customTheme }}
            providers={[]}
            localization={{
              variables: {
                sign_in: {
                  email_label: "Seu e-mail",
                  password_label: "Sua senha",
                  button_label: "Entrar",
                  social_provider_text: "Entrar com {{provider}}",
                  link_text: "Já tem uma conta? Entre",
                },
                sign_up: {
                  email_label: "Seu e-mail",
                  password_label: "Crie uma senha",
                  button_label: "Criar conta",
                  link_text: "Não tem uma conta? Crie uma",
                },
                forgotten_password: {
                  email_label: "Seu e-mail",
                  button_label: "Enviar instruções",
                  link_text: "Esqueceu sua senha?",
                },
                update_password: {
                    password_label: "Nova senha",
                    button_label: "Atualizar senha",
                },
                magic_link: {
                  link_text: "Entrar com link mágico por e-mail",
                }
              },
            }}
            theme="light"
            showLinks={true}
            magicLink={true}
          />
        </div>
      </div>
    </div>
  );
};

export default Login;