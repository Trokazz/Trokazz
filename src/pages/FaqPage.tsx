"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const FaqPage = () => {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPageContent = async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('content')
        .eq('slug', 'faq')
        .single();

      if (error) {
        setError(error.message);
        setContent('Não foi possível carregar as Perguntas Frequentes. Por favor, tente novamente mais tarde.');
      } else if (data) {
        setContent(data.content);
      } else {
        setContent('Nenhum conteúdo encontrado para Perguntas Frequentes.');
      }
      setLoading(false);
    };

    fetchPageContent();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Perguntas Frequentes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[80%]" />
            </div>
          ) : (
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content || '' }} />
          )}
          {error && <p className="text-red-500 mt-4">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default FaqPage;