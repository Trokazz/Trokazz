import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { getOptimizedImageUrl } from "@/lib/utils";
import { ReviewWithReviewer } from "@/types/database";
import usePageMetadata from "@/hooks/usePageMetadata";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const fetchReviewsBySellerId = async (sellerId: string): Promise<ReviewWithReviewer[]> => {
    const { data: rawReviews, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching reviews:", error);
        throw new Error("Erro ao carregar avaliações.");
    }

    if (!rawReviews || rawReviews.length === 0) {
      return [];
    }

    const reviewerIds = [...new Set(rawReviews.map(r => r.reviewer_id))];
    const { data: reviewersData, error: reviewersError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", reviewerIds);

    if (reviewersError) {
      console.error("Failed to fetch reviewers", reviewersError);
      return rawReviews.map(r => ({ ...r, reviewer: null })) as ReviewWithReviewer[];
    }

    return rawReviews.map(review => ({
      ...review,
      reviewer: reviewersData?.find(p => p.id === review.reviewer_id) || null
    })) as ReviewWithReviewer[];
}

const MyReviewsPage = () => {
  const { user } = useSession();
  const navigate = useNavigate();

  const { data: reviews, isLoading, isError, error } = useQuery<ReviewWithReviewer[]>({
      queryKey: ["myReviewsPageData", user?.id],
      queryFn: () => fetchReviewsBySellerId(user!.id),
      enabled: !!user,
  });

  usePageMetadata({
    title: "Meus Comentários - Trokazz",
    description: "Veja as avaliações que você recebeu de outros usuários no Trokazz.",
    keywords: "meus comentários, avaliações, reputação, trokazz",
    ogUrl: window.location.href,
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (isError) {
    return <p className="text-red-500 text-center py-4">Erro ao carregar avaliações: {error?.message}</p>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/perfil")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <CardTitle>Avaliações Recebidas</CardTitle>
          <CardDescription>O que outros usuários dizem sobre você.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {reviews && reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review: ReviewWithReviewer) => (
              <div key={review.id} className="border-b pb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={getOptimizedImageUrl(review.reviewer?.avatar_url, { width: 100, height: 100 }, 'avatars')} loading="lazy" />
                    <AvatarFallback>{review.reviewer?.full_name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold">{review.reviewer?.full_name || 'Usuário'}</p>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-5 w-5 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground mt-2 pl-12">{review.comment}</p>
                {(review.communication_rating || review.punctuality_rating || review.item_quality_rating) && (
                  <div className="pl-12 mt-2 text-sm text-muted-foreground space-y-1">
                    {review.communication_rating && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Comunicação:</span>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (<Star key={i} className={`h-4 w-4 ${i < review.communication_rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />))}
                        </div>
                      </div>
                    )}
                    {review.punctuality_rating && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Pontualidade:</span>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (<Star key={i} className={`h-4 w-4 ${i < review.punctuality_rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />))}
                        </div>
                      </div>
                    )}
                    {review.item_quality_rating && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Qualidade do Item:</span>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (<Star key={i} className={`h-4 w-4 ${i < review.item_quality_rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">Você ainda não recebeu nenhuma avaliação.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default MyReviewsPage;