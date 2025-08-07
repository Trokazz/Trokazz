import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import ServiceCard, { Service } from "@/components/ServiceCard";

const fetchServices = async () => {
  const { data, error } = await supabase
    .from("services")
    .select(`
      *,
      profiles ( full_name, avatar_url, username )
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Service[];
};

const ServicesList = () => {
  const { data: services, isLoading, error } = useQuery({
    queryKey: ["services"],
    queryFn: fetchServices,
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Serviços Locais</h1>
          <p className="text-muted-foreground">Encontre os melhores profissionais da sua região.</p>
        </div>
        <Button asChild>
          <Link to="/servicos/novo">Oferecer um Serviço</Link>
        </Button>
      </div>

      <section>
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            ))}
          </div>
        )}
        {error && <p className="text-red-500">Erro ao carregar os serviços: {error.message}</p>}
        {!isLoading && !error && services && services.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
        {!isLoading && !error && services?.length === 0 && (
          <div className="text-center py-16 border-dashed border-2 rounded-lg">
            <h2 className="text-xl font-semibold">Nenhum serviço encontrado por enquanto.</h2>
            <p className="text-muted-foreground mt-2">Seja o primeiro a oferecer seus serviços na plataforma!</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default ServicesList;