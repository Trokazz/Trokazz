import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { MapPin } from "lucide-react";
import useDebounce from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";

interface FilterBarProps {
  initialFilters: {
    category: string | null;
    subcategory: string | null;
    condition: string | null;
    locationCity: string | null;
    locationState: string | null;
    locationNeighborhood: string | null; // Novo campo
    minPrice: number;
    maxPrice: number;
    sortBy: string | null;
    // Removed showNearby
  };
  onApplyFilters: (filters: {
    category: string | null;
    subcategory: string | null;
    condition: string | null;
    locationCity: string | null;
    locationState: string | null;
    locationNeighborhood: string | null; // Novo campo
    minPrice: number;
    maxPrice: number;
    sortBy: string | null;
    // Removed showNearby
  }) => void;
}

const fetchCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('slug, name, parent_slug')
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

const fetchPriceRangeSettings = async () => {
  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', ['min_price_filter', 'max_price_filter']);
  if (error) throw new Error(error.message);

  const minPrice = parseInt(data?.find(s => s.key === 'min_price_filter')?.value || '0');
  const maxPrice = parseInt(data?.find(s => s.key === 'max_price_filter')?.value || '10000');
  return { minPrice, maxPrice };
};

const FilterBar = ({ initialFilters, onApplyFilters }: FilterBarProps) => {
  const { data: allCategories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['allCategoriesForFilters'],
    queryFn: fetchCategories,
  });

  const { data: priceRangeSettings, isLoading: isLoadingPriceSettings } = useQuery({
    queryKey: ['priceRangeSettings'],
    queryFn: fetchPriceRangeSettings,
  });

  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialFilters.category);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(initialFilters.subcategory);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(initialFilters.condition);
  const [locationCity, setLocationCity] = useState<string>(initialFilters.locationCity || '');
  const [locationState, setLocationState] = useState<string>(initialFilters.locationState || '');
  const [locationNeighborhood, setLocationNeighborhood] = useState<string>(initialFilters.locationNeighborhood || ''); // Novo estado
  const [priceRange, setPriceRange] = useState<[number, number]>([initialFilters.minPrice, initialFilters.maxPrice]);
  const [selectedSort, setSelectedSort] = useState<string | null>(initialFilters.sortBy);
  // Removed showNearby state

  useEffect(() => {
    setSelectedCategory(initialFilters.category);
    setSelectedSubcategory(initialFilters.subcategory);
    setSelectedCondition(initialFilters.condition);
    setLocationCity(initialFilters.locationCity || '');
    setLocationState(initialFilters.locationState || '');
    setLocationNeighborhood(initialFilters.locationNeighborhood || ''); // Atualizar novo estado
    setPriceRange([initialFilters.minPrice, initialFilters.maxPrice]);
    setSelectedSort(initialFilters.sortBy);
    // Removed setShowNearby
  }, [initialFilters]);

  const debouncedLocationCity = useDebounce(locationCity, 500);
  const debouncedLocationState = useDebounce(locationState, 500);
  const debouncedLocationNeighborhood = useDebounce(locationNeighborhood, 500); // Novo debounce

  // Effect to apply filters when debounced location changes
  useEffect(() => {
    // Only apply if the debounced value is different from the *current* filter state
    // to avoid unnecessary re-applications when initialFilters update
    if (
      debouncedLocationCity !== initialFilters.locationCity ||
      debouncedLocationState !== initialFilters.locationState ||
      debouncedLocationNeighborhood !== initialFilters.locationNeighborhood // Incluir novo debounce
    ) {
      onApplyFilters({
        ...initialFilters,
        locationCity: debouncedLocationCity,
        locationState: debouncedLocationState,
        locationNeighborhood: debouncedLocationNeighborhood, // Incluir novo debounce
      });
    }
  }, [debouncedLocationCity, debouncedLocationState, debouncedLocationNeighborhood, initialFilters, onApplyFilters]);


  const minAllowedPrice = priceRangeSettings?.minPrice || 0;
  const maxAllowedPrice = priceRangeSettings?.maxPrice || 10000;

  const parentCategories = allCategories?.filter(c => !c.parent_slug) || [];
  const subcategories = allCategories?.filter(c => c.parent_slug === selectedCategory) || [];

  const handleCategoryChange = (value: string) => {
    const newCategory = value === "all-categories" ? null : value;
    setSelectedCategory(newCategory);
    setSelectedSubcategory(null);
    onApplyFilters({ ...initialFilters, category: newCategory, subcategory: null });
  };

  const handleSubcategoryChange = (value: string) => {
    const newSubcategory = value === "all-subcategories" ? null : value;
    setSelectedSubcategory(newSubcategory);
    onApplyFilters({ ...initialFilters, subcategory: newSubcategory });
  };

  const handleConditionChange = (value: string) => {
    const newCondition = value === "all-conditions" ? null : value;
    setSelectedCondition(newCondition);
    onApplyFilters({ ...initialFilters, condition: newCondition });
  };

  const handlePriceRangeChange = (value: number[]) => {
    const newMinPrice = value[0];
    const newMaxPrice = value[1];
    setPriceRange([newMinPrice, newMaxPrice]);
    // Apply filters immediately for price range as it's a slider interaction
    onApplyFilters({ ...initialFilters, minPrice: newMinPrice, maxPrice: newMaxPrice });
  };

  const handleSortChange = (value: string) => {
    setSelectedSort(value);
    onApplyFilters({ ...initialFilters, sortBy: value });
  };

  // Removed handleShowNearbyChange

  if (isLoadingCategories || isLoadingPriceSettings) {
    return (
      <div className="flex flex-wrap items-center gap-4 p-4 bg-primary/5 rounded-lg">
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[180px]" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-primary/5 rounded-lg">
      {/* Category Filter */}
      <div className="w-[180px]">
        <Label htmlFor="category-filter" className="sr-only">Categoria</Label>
        <Select onValueChange={handleCategoryChange} value={selectedCategory || "all-categories"}>
          <SelectTrigger id="category-filter">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-categories">Todas as Categorias</SelectItem>
            {parentCategories.map((category) => (
              <SelectItem key={category.slug} value={category.slug}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subcategory Filter */}
      {selectedCategory && subcategories.length > 0 && (
        <div className="w-[180px]">
          <Label htmlFor="subcategory-filter" className="sr-only">Subcategoria</Label>
          <Select onValueChange={handleSubcategoryChange} value={selectedSubcategory || "all-subcategories"}>
            <SelectTrigger id="subcategory-filter">
              <SelectValue placeholder="Subcategoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-subcategories">Todas as Subcategorias</SelectItem>
              {subcategories.map((subcategory) => (
                <SelectItem key={subcategory.slug} value={subcategory.slug}>
                  {subcategory.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Condition Filter */}
      <div className="w-[180px]">
        <Label htmlFor="condition-filter" className="sr-only">Condição</Label>
        <Select onValueChange={handleConditionChange} value={selectedCondition || "all-conditions"}>
          <SelectTrigger id="condition-filter">
            <SelectValue placeholder="Condição" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-conditions">Todas as Condições</SelectItem>
            <SelectItem value="new">Novo</SelectItem>
            <SelectItem value="used">Usado</SelectItem>
            <SelectItem value="refurbished">Recondicionado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Location City Filter */}
      <div className="w-[180px]">
        <Label htmlFor="location-city-filter" className="sr-only">Cidade</Label>
        <Input
          id="location-city-filter"
          placeholder="Cidade"
          value={locationCity}
          onChange={(e) => setLocationCity(e.target.value)}
        />
      </div>

      {/* Location State Filter */}
      <div className="w-[180px]">
        <Label htmlFor="location-state-filter" className="sr-only">Estado</Label>
        <Input
          id="location-state-filter"
          placeholder="Estado"
          value={locationState}
          onChange={(e) => setLocationState(e.target.value)}
        />
      </div>

      {/* Location Neighborhood Filter */}
      <div className="w-[180px]">
        <Label htmlFor="location-neighborhood-filter" className="sr-only">Bairro</Label>
        <Input
          id="location-neighborhood-filter"
          placeholder="Bairro"
          value={locationNeighborhood}
          onChange={(e) => setLocationNeighborhood(e.target.value)}
        />
      </div>

      {/* Price Range Filter */}
      <div className="w-[250px] flex items-center gap-2">
        <Label htmlFor="price-range-filter" className="sr-only">Faixa de Preço</Label>
        <Slider
          id="price-range-filter"
          min={minAllowedPrice}
          max={maxAllowedPrice}
          step={10}
          value={priceRange}
          onValueChange={handlePriceRangeChange}
          className="flex-1"
        />
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          R$ {priceRange[0].toLocaleString('pt-BR')} - R$ {priceRange[1].toLocaleString('pt-BR')}
        </span>
      </div>

      {/* Sort By Filter */}
      <div className="w-[180px]">
        <Label htmlFor="sort-by-filter" className="sr-only">Ordenar por</Label>
        <Select onValueChange={handleSortChange} value={selectedSort || "newest"}>
          <SelectTrigger id="sort-by-filter">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Mais Recentes</SelectItem>
            <SelectItem value="oldest">Mais Antigos</SelectItem>
            <SelectItem value="price_asc">Preço: Menor para Maior</SelectItem>
            <SelectItem value="price_desc">Preço: Maior para Menor</SelectItem>
            <SelectItem value="title_asc">Título: A-Z</SelectItem>
            <SelectItem value="title_desc">Título: Z-A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Removed Nearby Ads Toggle */}
    </div>
  );
};

export default FilterBar;