import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { safeFormatDate } from "@/lib/utils";
import usePageMetadata from "@/hooks/usePageMetadata";
import DOMPurify from 'dompurify'; // Import DOMPurify

interface GenericPageProps {
  slug: string;
}

const fetchPage = async (slug: string) => {
  const { data, error } = await supabase.from("pages").select("title, content, updated_at").eq("slug", slug).single();
  if (error) throw new Error("Não foi possível carregar o conteúdo da página.");
  return data;
};

const GenericPage = ({ slug }: GenericPageProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ["page", slug],
    queryFn: () => fetchPage(slug),
  });

  const pageTitle = data?.title || (slug === 'privacy-policy' ? 'Política de Privacidade' : slug === 'terms-of-service' ? 'Termos de Serviço' : 'Página');
  const pageDescription = data?.title ? `Leia a ${data.title} do Trokazz.` : `Informações importantes sobre ${slug.replace(/-/g, ' ')} do Trokazz.`;
  const pageKeywords = `${slug.replace(/-/g, ' ')}, trokazz, dourados, ms`;

  usePageMetadata({
    title: `${pageTitle} - Trokazz`,
    description: pageDescription,
    keywords: pageKeywords,
    ogUrl: window.location.href,
  });

  // Sanitize the content before passing it to dangerouslySetInnerHTML
  const sanitizedContent = data?.content ? DOMPurify.sanitize(data.content, { USE_PROFILES: { html: true } }) : "";

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        {isLoading ? <Skeleton className="h-8 w-1/2" /> : <CardTitle className="text-3xl">{data?.title}</CardTitle>}
        {data?.updated_at && (
          <p className="text-sm text-muted-foreground pt-2">
            Última atualização em: {safeFormatDate(data.updated_at, "dd 'de' LLLL 'de' yyyy")}
          </p>
        )}
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
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default GenericPage;