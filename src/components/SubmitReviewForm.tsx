"use client";

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import StarRating from '@/components/StarRating';
import { Loader2, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const reviewSchema = z.object({
  rating: z.number().min(1, "A avaliação geral é obrigatória.").max(5, "A avaliação deve ser entre 1 e 5."),
  communication_rating: z.number().min(1, "A avaliação de comunicação é obrigatória.").max(5, "A avaliação deve ser entre 1 e 5."),
  punctuality_rating: z.number().min(1, "A avaliação de pontualidade é obrigatória.").max(5, "A avaliação deve ser entre 1 e 5."),
  item_quality_rating: z.number().min(1, "A avaliação de qualidade do item é obrigatória.").max(5, "A avaliação deve ser entre 1 e 5."),
  comment: z.string().max(500, "O comentário não pode exceder 500 caracteres.").optional(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface SubmitReviewFormProps {
  sellerId: string;
  adId?: string; // Optional: if the review is for a specific ad transaction
  onReviewSubmitted?: () => void;
}

const SubmitReviewForm: React.FC<SubmitReviewFormProps> = ({ sellerId, adId, onReviewSubmitted }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { control, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      communication_rating: 0,
      punctuality_rating: 0,
      item_quality_rating: 0,
      comment: '',
    },
  });

  const onSubmit = async (data: ReviewFormData) => {
    if (!user) {
      showError("Você precisa estar logado para enviar uma avaliação.");
      navigate('/auth');
      return;
    }

    if (user.id === sellerId) {
      showError("Você não pode avaliar a si mesmo.");
      return;
    }

    try {
      const { error } = await supabase.from('reviews').insert({
        seller_id: sellerId,
        reviewer_id: user.id,
        rating: data.rating,
        communication_rating: data.communication_rating,
        punctuality_rating: data.punctuality_rating,
        item_quality_rating: data.item_quality_rating,
        comment: data.comment,
        // You might want to link the review to an ad or offer if applicable
        // related_ad_id: adId,
      });

      if (error) {
        throw error;
      }

      showSuccess("Avaliação enviada com sucesso!");
      onReviewSubmitted?.();
      navigate(-1); // Go back to previous page
    } catch (error: any) {
      showError(`Erro ao enviar avaliação: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label className="text-lg font-semibold mb-2 block">Avaliação Geral</Label>
        <Controller
          name="rating"
          control={control}
          render={({ field }) => (
            <StarRating rating={field.value} onRatingChange={field.onChange} size="large" className="justify-center" />
          )}
        />
        {errors.rating && <p className="text-sm text-destructive text-center mt-1">{errors.rating.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="font-medium mb-1 block">Comunicação</Label>
          <Controller
            name="communication_rating"
            control={control}
            render={({ field }) => (
              <StarRating rating={field.value} onRatingChange={field.onChange} size="default" />
            )}
          />
          {errors.communication_rating && <p className="text-sm text-destructive mt-1">{errors.communication_rating.message}</p>}
        </div>
        <div>
          <Label className="font-medium mb-1 block">Pontualidade</Label>
          <Controller
            name="punctuality_rating"
            control={control}
            render={({ field }) => (
              <StarRating rating={field.value} onRatingChange={field.onChange} size="default" />
            )}
          />
          {errors.punctuality_rating && <p className="text-sm text-destructive mt-1">{errors.punctuality_rating.message}</p>}
        </div>
        <div>
          <Label className="font-medium mb-1 block">Qualidade do Item</Label>
          <Controller
            name="item_quality_rating"
            control={control}
            render={({ field }) => (
              <StarRating rating={field.value} onRatingChange={field.onChange} size="default" />
            )}
          />
          {errors.item_quality_rating && <p className="text-sm text-destructive mt-1">{errors.item_quality_rating.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="comment" className="text-lg font-semibold mb-2 block">Comentário (Opcional)</Label>
        <Textarea
          id="comment"
          placeholder="Compartilhe sua experiência..."
          {...control.register("comment")}
          rows={4}
        />
        {errors.comment && <p className="text-sm text-destructive mt-1">{errors.comment.message}</p>}
      </div>

      <Button type="submit" className="w-full bg-accent hover:bg-accent/90 h-12 text-lg" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Enviando Avaliação...
          </>
        ) : (
          <>
            <Star className="mr-2 h-5 w-5" />
            Enviar Avaliação
          </>
        )}
      </Button>
    </form>
  );
};

export default SubmitReviewForm;