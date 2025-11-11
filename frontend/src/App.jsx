// frontend/src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

// 🔓 Public pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyOtp from "./pages/VerifyOtp";

// 👤 User pages
import Dashboard from "./pages/Dashboard";
import AddressPage from "./pages/AddressPage";
import ViewProfile from "./pages/ViewProfile";
import EditProfilePage from "./pages/EditProfile";
import ChangePassword from "./pages/ChangePassword";
import ProtectedRoute from "./components/ProtectedRoute";

// 🛠️ Admin pages
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./admin/AdminDashboard";
import ManageUsers from "./admin/ManageUsers";
import EditUserPage from "./admin/EditUserPage";
import AddUserPage from "./admin/AddUserPage";
import Reports from "./admin/Reports";
import AdminSettings from "./admin/AdminSettings";
import AdminProtectedRoute from "./components/AdminProtectedRoute";

function App() {
  return (
    <Routes>
      {/* ✅ Default route always goes to login — avoids unauthorized profile errors */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* 🔓 Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />

      {/* 👤 USER PANEL (Protected) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/addresses"
        element={
          <ProtectedRoute>
            <AddressPage />
          </ProtectedRoute>
        }
      />

      {/* Keep the route at /profile (the canonical route) */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ViewProfile />
          </ProtectedRoute>
        }
      />

      {/* Provide an alias /viewprofile -> same component (backwards compatibility) */}
      <Route
        path="/viewprofile"
        element={
          <ProtectedRoute>
            <ViewProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/edit-profile"
        element={
          <ProtectedRoute>
            <EditProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        }
      />

      {/* 🧾 ADMIN PANEL (Protected) */}
      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<ManageUsers />} />
        <Route path="users/add" element={<AddUserPage />} />
        <Route path="users/edit/:id" element={<EditUserPage />} />
        <Route path="users/:userId" element={<ViewProfile />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* 🚨 Catch-all route (fallback for unmatched URLs) */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
