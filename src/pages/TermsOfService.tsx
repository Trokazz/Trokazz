import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const fetchPage = async (slug: string) => {
  const { data, error } = await supabase.from("pages").select("title, content").eq("slug", slug).single();
  if (error) throw new Error("Não foi possível carregar o conteúdo da página.");
  return data;
};

const TermsOfService = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["page", "terms-of-service"],
    queryFn: () => fetchPage("terms-of-service"),
  });

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        {isLoading ? <Skeleton className="h-8 w-1/2" /> : <CardTitle className="text-3xl">{data?.title}</CardTitle>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full mt-4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : (
          <div
            className="prose dark:prose-invert max-w-none text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: data?.content || "" }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default TermsOfService;