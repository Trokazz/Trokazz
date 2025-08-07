import AdminProtectedRoute from "./AdminProtectedRoute";
import AdminLayout from "./AdminLayout";
import { Outlet } from "react-router-dom";

const AdminRoot = () => {
  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    </AdminProtectedRoute>
  );
};

export default AdminRoot;