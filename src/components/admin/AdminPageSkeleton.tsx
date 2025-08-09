import { Skeleton } from "@/components/ui/skeleton";

const AdminPageSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-12 w-full" />
    <div className="grid gap-6 md:grid-cols-2">
      <Skeleton className="h-[400px]" />
      <Skeleton className="h-[400px]" />
    </div>
  </div>
);

export default AdminPageSkeleton;