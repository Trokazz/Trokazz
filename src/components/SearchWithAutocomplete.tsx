"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Search as SearchIcon } from 'lucide-react';
import useDebounce from '@/hooks/useDebounce';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/utils/formatters';
import { cn } from '@/lib/utils';

interface SearchWithAutocompleteProps {
  initialSearchTerm?: string;
  onSearchSubmit?: (searchTerm: string) => void;
  className?: string;
  placeholder?: string;
}

interface AdSuggestion {
  id: string;
  title: string;
  price: number;
  image_urls: string[];
}

const fetchAdSuggestions = async (searchTerm: string): Promise<AdSuggestion[]> => {
  if (!searchTerm.trim()) return [];

  const { data, error } = await supabase
    .from('advertisements')
    .select('id, title, price, image_urls')
    .ilike('title', `%${searchTerm}%`)
    .eq('status', 'approved')
    .limit(5);

  if (error) throw new Error(error.message);
  return data || [];
};

const SearchWithAutocomplete: React.FC<SearchWithAutocompleteProps> = ({
  initialSearchTerm = '',
  onSearchSubmit,
  className,
  placeholder = 'Buscar itens...',
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: suggestions, isLoading, isFetching } = useQuery<AdSuggestion[], Error>({
    queryKey: ['adSuggestions', debouncedSearchTerm],
    queryFn: () => fetchAdSuggestions(debouncedSearchTerm),
    enabled: !!debouncedSearchTerm,
  });

  useEffect(() => {
    if (debouncedSearchTerm.trim() && (suggestions?.length || 0) > 0) {
      setIsPopoverOpen(true);
    } else {
      setIsPopoverOpen(false);
    }
  }, [debouncedSearchTerm, suggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSuggestionClick = (adId: string) => {
    setIsPopoverOpen(false);
    navigate(`/ad/${adId}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsPopoverOpen(false);
      if (onSearchSubmit) {
        onSearchSubmit(searchTerm);
      } else if (searchTerm.trim()) {
        navigate(`/?q=${encodeURIComponent(searchTerm.trim())}`);
      }
    }
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative w-full", className)}>
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="search"
            placeholder={placeholder}
            className="w-full appearance-none bg-background pl-10 shadow-none"
            value={searchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => searchTerm.trim() && (suggestions?.length || 0) > 0 && setIsPopoverOpen(true)}
          />
          {(isLoading || isFetching) && debouncedSearchTerm.trim() && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 mt-2 max-h-80 overflow-y-auto">
        {isLoading || isFetching ? (
          <div className="p-2 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : suggestions && suggestions.length > 0 ? (
          <div className="divide-y divide-border">
            {suggestions.map((ad) => (
              <Link
                key={ad.id}
                to={`/ad/${ad.id}`}
                onClick={() => handleSuggestionClick(ad.id)}
                className="flex items-center gap-3 p-2 hover:bg-muted cursor-pointer"
              >
                <img
                  src={ad.image_urls?.[0] || '/placeholder.svg'}
                  alt={ad.title}
                  className="h-10 w-10 object-cover rounded-md"
                  loading="lazy"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium truncate">{ad.title}</p>
                  <p className="text-xs text-muted-foreground">{formatPrice(ad.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="p-4 text-center text-muted-foreground text-sm">Nenhum resultado encontrado.</p>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default SearchWithAutocomplete;