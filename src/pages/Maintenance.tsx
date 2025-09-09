import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Wrench } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const fetchMaintenanceMessage = async () => {
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'maintenance_message')
    .single();
  if (error) throw new Error(error.message);
  return data?.value || "Estamos em manutenção. Voltamos em breve!";
};

const MaintenancePage = () => {
  const { data: message, isLoading } = useQuery({
    queryKey: ['maintenanceMessage'],
    queryFn: fetchMaintenanceMessage,
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
      <Wrench className="h-16 w-16 text-primary mb-6 animate-pulse" />
      <h1 className="text-4xl font-bold mb-4">Site em Manutenção</h1>
      {isLoading ? (
        <Skeleton className="h-6 w-80" />
      ) : (
        <p className="text-lg text-muted-foreground max-w-md">{message}</p>
      )}
    </div>
  );
};

export default MaintenancePage;