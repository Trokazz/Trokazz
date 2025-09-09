import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
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

const FilterSheet = ({ isOpen, onClose, onApplyFilters, initialFilters }: FilterSheetProps) => {
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

  const handleApply = () => {
    onApplyFilters({
      category: selectedCategory,
      subcategory: selectedSubcategory,
      condition: selectedCondition,
      locationCity: locationCity,
      locationState: locationState,
      locationNeighborhood: locationNeighborhood, // Incluir novo campo
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
      sortBy: selectedSort,
      // Removed showNearby
    });
    onClose();
  };

  const handleReset = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedCondition(null);
    setLocationCity('');
    setLocationState('');
    setLocationNeighborhood(''); // Resetar novo campo
    setPriceRange([priceRangeSettings?.minPrice || 0, priceRangeSettings?.maxPrice || 10000]);
    setSelectedSort('newest');
    // Removed setShowNearby(false)
  };

  const minAllowedPrice = priceRangeSettings?.minPrice || 0;
  const maxAllowedPrice = priceRangeSettings?.maxPrice || 10000;

  const parentCategories = allCategories?.filter(c => !c.parent_slug) || [];
  const subcategories = allCategories?.filter(c => c.parent_slug === selectedCategory) || [];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-sm flex flex-col">
        <SheetHeader>
          <SheetTitle>Filtros Avançados</SheetTitle>
        </SheetHeader>
        <div className="flex-1 space-y-6 py-4 overflow-y-auto">
          {/* Filter by Category */}
          <div>
            <Label htmlFor="category">Categoria</Label>
            {isLoadingCategories ? (
              <Skeleton className="h-10 w-full mt-2" />
            ) : (
              <Select onValueChange={(value) => { setSelectedCategory(value === "all-categories" ? null : value); setSelectedSubcategory(null); }} value={selectedCategory || "all-categories"}>
                <SelectTrigger id="category" className="mt-2">
                  <SelectValue placeholder="Todas as Categorias" />
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
            )}
          </div>

          {/* Subcategory Filter */}
          {selectedCategory && subcategories.length > 0 && (
            <div>
              <Label htmlFor="subcategory">Subcategoria</Label>
              <Select onValueChange={(value) => setSelectedSubcategory(value === "all-subcategories" ? null : value)} value={selectedSubcategory || "all-subcategories"}>
                <SelectTrigger id="subcategory" className="mt-2">
                  <SelectValue placeholder="Todas as Subcategorias" />
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
          <div>
            <Label htmlFor="condition">Condição</Label>
            <Select onValueChange={(value) => setSelectedCondition(value === "all-conditions" ? null : value)} value={selectedCondition || "all-conditions"}>
              <SelectTrigger id="condition" className="mt-2">
                <SelectValue placeholder="Todas as Condições" />
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
          <div>
            <Label htmlFor="location-city">Cidade</Label>
            <Input
              id="location-city"
              placeholder="Cidade"
              value={locationCity}
              onChange={(e) => setLocationCity(e.target.value)}
              className="mt-2"
            />
          </div>

          {/* Location State Filter */}
          <div>
            <Label htmlFor="location-state">Estado</Label>
            <Input
              id="location-state"
              placeholder="Estado"
              value={locationState}
              onChange={(e) => setLocationState(e.target.value)}
              className="mt-2"
            />
          </div>

          {/* Location Neighborhood Filter */}
          <div>
            <Label htmlFor="location-neighborhood">Bairro</Label>
            <Input
              id="location-neighborhood"
              placeholder="Bairro"
              value={locationNeighborhood}
              onChange={(e) => setLocationNeighborhood(e.target.value)}
              className="mt-2"
            />
          </div>

          {/* Filter by Price Range */}
          <div>
            <Label htmlFor="price-range">Faixa de Preço</Label>
            {isLoadingPriceSettings ? (
              <Skeleton className="h-10 w-full mt-2" />
            ) : (
              <>
                <Slider
                  id="price-range"
                  min={minAllowedPrice}
                  max={maxAllowedPrice}
                  step={10}
                  value={priceRange}
                  onValueChange={(value: number[]) => setPriceRange([value[0], value[1]])}
                  className="mt-4"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>R$ {priceRange[0].toLocaleString('pt-BR')}</span>
                  <span>R$ {priceRange[1].toLocaleString('pt-BR')}</span>
                </div>
              </>
            )}
          </div>

          {/* Sort By Filter */}
          <div>
            <Label htmlFor="sort-by">Ordenar por</Label>
            <Select onValueChange={setSelectedSort} value={selectedSort || "newest"}>
              <SelectTrigger id="sort-by" className="mt-2">
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
        <SheetFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleReset} className="w-full sm:w-auto">
            Limpar Filtros
          </Button>
          <Button onClick={handleApply} className="w-full sm:w-auto">
            Aplicar Filtros
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default FilterSheet;