import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StarRating from "./StarRating";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

interface Reviewer {
  full_name: string;
  avatar_url: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  reply_comment: string | null; // New field
  created_at: string;
  reviewer: Reviewer;
  seller_id: string; // Added to check if current user is seller
}

interface ReviewCardProps {
  review: Review;
  isSeller: boolean; // To determine if reply button should be shown
  currentUserId: string | undefined; // To check if current user is the seller
}

const ReviewCard = ({ review, isSeller, currentUserId }: ReviewCardProps) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const queryClient = useQueryClient();

  const replyMutation = useMutation({
    mutationFn: async ({ reviewId, reply }: { reviewId: string; reply: string }) => {
      const { error } = await supabase
        .from('reviews')
        .update({ reply_comment: reply })
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Resposta enviada com sucesso!");
      setIsReplying(false);
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['publicProfile', review.seller_id] }); // Invalidate to refetch reviews
    },
    onError: (error: any) => {
      showError(`Erro ao enviar resposta: ${error.message}`);
    },
  });

  const handleReplySubmit = () => {
    if (replyText.trim() === '') {
      showError("A resposta não pode estar vazia.");
      return;
    }
    replyMutation.mutate({ reviewId: review.id, reply: replyText });
  };

  return (
    <div className="flex flex-col gap-2 py-4 border-b last:border-b-0 border-muted">
      <div className="flex gap-4">
        <Avatar>
          <AvatarImage src={review.reviewer.avatar_url} loading="lazy" />
          <AvatarFallback>{review.reviewer.full_name?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{review.reviewer.full_name}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: ptBR })}
            </p>
          </div>
          <StarRating rating={review.rating} size="small" className="my-1" />
          <p className="text-sm text-muted-foreground">{review.comment}</p>
        </div>
      </div>

      {review.reply_comment && (
        <div className="ml-12 mt-2 p-3 bg-muted rounded-lg border border-muted-foreground/20">
          <p className="font-semibold text-sm">Sua Resposta:</p>
          <p className="text-sm text-muted-foreground">{review.reply_comment}</p>
        </div>
      )}

      {isSeller && currentUserId === review.seller_id && !review.reply_comment && (
        <div className="ml-12 mt-2">
          {isReplying ? (
            <div className="space-y-2">
              <Textarea
                placeholder="Digite sua resposta..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                disabled={replyMutation.isPending}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsReplying(false)} disabled={replyMutation.isPending}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleReplySubmit} disabled={replyMutation.isPending}>
                  {replyMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="mr-2 h-4 w-4" />
                  )}
                  Responder
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsReplying(true)}>
              <MessageSquare className="mr-2 h-4 w-4" /> Responder
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewCard;