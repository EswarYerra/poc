import { Navigate } from "react-router-dom";

function AdminProtectedRoute({ children }) {
  const token = localStorage.getItem("access");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Allow any admin/superuser/staff role
  if (!(user?.is_superuser || user?.is_admin || user?.is_staff)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default AdminProtectedRoute;
