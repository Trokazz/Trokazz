import AdminProtectedRoute from "./AdminProtectedRoute";
import AdminLayout from "./AdminLayout";
import { Outlet } from "react-router-dom";
import { Suspense } from "react";
import AdminPageSkeleton from "./AdminPageSkeleton";

const AdminRoot = () => {
  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <Suspense fallback={<AdminPageSkeleton />}>
          <Outlet />
        </Suspense>
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default AdminRoot;