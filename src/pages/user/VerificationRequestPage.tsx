"use client";

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Upload, FileText, Loader2, X, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import MobilePageHeader from '@/components/MobilePageHeader';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

const formSchema = z.object({
  files: z.array(z.instanceof(File))
    .min(1, "Por favor, envie pelo menos um documento.")
    .max(3, "Você pode enviar no máximo 3 documentos.")
    .refine((files) => files.every((file) => file.size <= MAX_FILE_SIZE), `Cada documento deve ter no máximo ${MAX_FILE_SIZE / (1024 * 1024)}MB.`)
    .refine((files) => files.every((file) => ACCEPTED_IMAGE_TYPES.includes(file.type)), "Apenas arquivos .jpg, .jpeg, .png, .webp e .pdf são permitidos."),
});

type FormData = z.infer<typeof formSchema>;

const VerificationRequestPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      files: [],
    },
  });

  const selectedFiles = watch('files');

  const uploadDocuments = async (files: File[]) => {
    if (!user) throw new Error("Usuário não autenticado.");

    const uploadedUrls: string[] = [];
    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/verification/${Date.now()}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('verification-documents') // Usar um bucket dedicado para documentos de verificação
        .upload(filePath, file);

      if (uploadError) {
        showError(`Erro ao fazer upload de ${file.name}: ${uploadError.message}`);
        continue;
      }

      const { data } = supabase.storage
        .from('verification-documents')
        .getPublicUrl(filePath);
      
      uploadedUrls.push(data.publicUrl);
    }
    return uploadedUrls;
  };

  const submitVerificationRequestMutation = useMutation({
    mutationFn: async (documentUrls: string[]) => {
      if (!user) throw new Error("Usuário não autenticado.");

      const payload = {
        user_id: user.id,
        status: 'pending',
        document_urls: documentUrls,
      };
      console.log("Payload para inserção de solicitação de verificação:", payload); // Log do payload

      const { error } = await supabase.from('verification_requests').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Sua solicitação de verificação foi enviada com sucesso e está aguardando revisão!");
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] }); // Invalidate profile to reflect pending verification
      navigate('/profile');
    },
    onError: (error: any) => {
      console.error("Erro ao enviar solicitação de verificação:", error); // Log do objeto de erro completo
      showError(`Erro ao enviar solicitação: ${error.message || "Ocorreu um erro desconhecido."}`);
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!user) {
      showError("Você precisa estar logado para enviar uma solicitação de verificação.");
      navigate('/auth');
      return;
    }

    const uploadedUrls = await uploadDocuments(data.files);
    if (uploadedUrls.length > 0) {
      submitVerificationRequestMutation.mutate(uploadedUrls);
    } else {
      showError("Nenhum documento foi carregado com sucesso. Por favor, tente novamente.");
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      const currentFiles = watch('files');
      const allFiles = [...currentFiles, ...newFiles];

      if (allFiles.length > 3) {
        showError("Você pode enviar no máximo 3 documentos.");
        return;
      }

      setValue('files', allFiles, { shouldValidate: true });
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear input to allow re-selecting same file
      }
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    const updatedFiles = selectedFiles.filter((_, index) => index !== indexToRemove);
    setValue('files', updatedFiles, { shouldValidate: true });
  };

  const isFormDisabled = isSubmitting || submitVerificationRequestMutation.isPending;

  return (
    <div className="min-h-screen bg-primary text-primary-foreground flex flex-col">
      <MobilePageHeader title="Verificação de Perfil" />

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Solicitar Verificação</CardTitle>
            <p className="text-muted-foreground text-sm">
              Envie seus documentos para verificar seu perfil e aumentar a confiança na comunidade.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground mb-4">
              Para verificar seu perfil, por favor, envie **fotos nítidas** de um documento de identificação com foto (RG, CNH ou Passaporte) e de um comprovante de residência recente (conta de luz, água ou telefone).
              Máximo de 3 arquivos, até 5MB cada. Formatos aceitos: JPG, PNG, WEBP, PDF.
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="document-upload">Documentos (até 3)</Label>
                <div className="mt-2 flex flex-wrap gap-3">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative p-2 border rounded-md flex items-center gap-2 bg-muted text-muted-foreground">
                      <FileText className="h-5 w-5" />
                      <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveFile(index)}
                        disabled={isFormDisabled}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {selectedFiles.length < 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isFormDisabled}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" /> Adicionar Documento
                    </Button>
                  )}
                </div>
                <input
                  id="document-upload"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept={ACCEPTED_IMAGE_TYPES.join(',')}
                  className="hidden"
                  disabled={isFormDisabled}
                />
                {errors.files && <p className="text-sm text-destructive mt-1">{errors.files.message}</p>}
              </div>

              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 h-12 text-lg" disabled={isFormDisabled}>
                {isFormDisabled ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Enviando Solicitação...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Enviar para Verificação
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default VerificationRequestPage;