import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { Textarea } from "./ui/textarea"; // Import Textarea

// Schema for validation
const settingsSchema = z.object({
  fullName: z.string().min(3, "O nome completo é obrigatório"),
  phone: z.string().optional(),
  biography: z.string().max(500, "A biografia não pode exceder 500 caracteres.").optional(),
  socialLink: z.string().url("Link social inválido.").optional().or(z.literal('')),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres").optional().or(z.literal('')),
  confirmPassword: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface ProfileSettingsFormProps {
  profile: any; // The user profile data
  onLogout: () => void;
}

const ProfileSettingsForm = ({ profile, onLogout }: ProfileSettingsFormProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      fullName: profile?.full_name || '',
      phone: profile?.phone || '',
      biography: profile?.biography || '',
      socialLink: profile?.social_media_links?.main || '', // Assuming 'main' key for a single social link
    }
  });

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !user) return;
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // We need to add a timestamp to the URL to bypass browser cache
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      const publicUrlWithCacheBuster = `${data.publicUrl}?t=${new Date().getTime()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrlWithCacheBuster })
        .eq('id', user.id);

      if (updateError) throw updateError;

      showSuccess("Foto de perfil atualizada!");
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    } catch (error: any) {
      showError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    if (!user) return;

    // Prepare social media links JSONB
    const socialMediaLinks = data.socialLink ? { main: data.socialLink } : null;

    // Update profile in 'profiles' table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        full_name: data.fullName, 
        phone: data.phone,
        biography: data.biography || null,
        social_media_links: socialMediaLinks,
      })
      .eq('id', user.id);

    if (profileError) {
      showError(profileError.message);
      return;
    }

    // Update password if provided
    if (data.password) {
      const { error: authError } = await supabase.auth.updateUser({ password: data.password });
      if (authError) {
        showError(authError.message);
        return;
      }
    }

    showSuccess("Perfil atualizado com sucesso!");
    queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
  };

  const handleDeleteAccount = async () => {
    if (!user || !profile?.email) {
      showError("Não foi possível excluir a conta. Informações do usuário ausentes.");
      return;
    }

    setIsDeletingAccount(true);

    try {
      // 1. Re-autenticar o usuário para verificar a senha no cliente
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: deletePassword,
      });

      if (signInError) {
        throw new Error("Senha incorreta. Não foi possível verificar a identidade do usuário.");
      }

      // 2. Chamar a função RPC para excluir dados do usuário e a conta
      const { data, error: rpcError } = await supabase.rpc('delete_user_data_and_account', {
        p_user_id: user.id,
      });

      if (rpcError) {
        throw rpcError;
      }

      showSuccess(data || "Sua conta foi excluída com sucesso.");
      await supabase.auth.signOut(); // Garantir que o usuário seja desconectado
      navigate('/'); // Redirecionar para a página inicial
    } catch (error: any) {
      showError(error.message);
    } finally {
      setIsDeletingAccount(false);
      setDeletePassword('');
    }
  };

  const isFormDisabled = isSubmitting || isUploading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center space-y-2">
        <div className="relative">
          <Avatar className="w-24 h-24 md:w-16 md:h-16 border">
            <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} loading="lazy" />
            <AvatarFallback>{profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <label
            htmlFor="avatar-upload"
            className="absolute -bottom-1 -right-1 md:-bottom-0.5 md:-right-0.5 bg-primary text-primary-foreground rounded-full p-2 md:p-1.5 cursor-pointer hover:bg-primary/90 transition-colors"
          >
            {isUploading ? <Loader2 className="h-4 w-4 md:h-3 md:w-3 animate-spin" /> : <Camera className="h-4 w-4 md:h-3 md:w-3" />}
          </label>
          <input
            id="avatar-upload"
            type="file"
            className="hidden"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleAvatarUpload}
            disabled={isUploading}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome Completo</Label>
          <Input id="fullName" {...register("fullName")} disabled={isFormDisabled} />
          {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" value={user?.email} disabled className="bg-muted/50" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" placeholder="(XX) XXXXX-XXXX" {...register("phone")} disabled={isFormDisabled} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="biography">Biografia (Opcional)</Label>
          <Textarea id="biography" placeholder="Fale um pouco sobre você ou seu negócio..." {...register("biography")} rows={4} disabled={isFormDisabled} />
          {errors.biography && <p className="text-sm text-destructive">{errors.biography.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="socialLink">Link Social (Opcional)</Label>
          <Input id="socialLink" placeholder="Ex: https://instagram.com/seuusuario" {...register("socialLink")} disabled={isFormDisabled} />
          {errors.socialLink && <p className="text-sm text-destructive">{errors.socialLink.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Nova Senha</Label>
          <Input id="password" type="password" placeholder="Deixe em branco para não alterar" {...register("password")} disabled={isFormDisabled} />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
          <Input id="confirmPassword" type="password" {...register("confirmPassword")} disabled={isFormDisabled} />
          {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
        </div>
        <Button type="submit" disabled={isFormDisabled} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Alterações'
          )}
        </Button>
      </form>
      <Button onClick={onLogout} variant="outline" className="w-full" disabled={isFormDisabled}>
        Logout
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-full mt-4" disabled={isFormDisabled}>
            <Trash2 className="mr-2 h-4 w-4" /> Excluir Conta
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir sua conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é **irreversível**. Ao excluir sua conta, você perderá permanentemente:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Todos os seus anúncios publicados (ativos, pendentes, vendidos).</li>
                <li>Seu perfil, incluindo foto, informações pessoais e histórico de chat.</li>
                <li>Quaisquer créditos, vouchers e descontos não utilizados.</li>
                <li>Todas as avaliações e comentários que você recebeu.</li>
              </ul>
              Para confirmar, digite sua senha abaixo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-password">Sua Senha</Label>
            <Input
              id="delete-password"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              disabled={isDeletingAccount}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAccount}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeletingAccount || deletePassword.length < 6} className="bg-destructive hover:bg-destructive/90">
              {isDeletingAccount ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir Minha Conta'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfileSettingsForm;