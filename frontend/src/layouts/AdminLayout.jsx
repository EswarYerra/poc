import React, { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BarChart2,
  Settings,
  LogOut,
} from "lucide-react";
import "./AdminLayout.css";

export default function AdminLayout() {
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState("Admin");
  const [initial, setInitial] = useState("A");
  const [avatarColor, setAvatarColor] = useState("#0b2349");
  const token = localStorage.getItem("access");

  // ✅ Fetch admin profile dynamically
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/auth/profile/", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();

        const name =
          data.first_name || data.last_name
            ? `${data.first_name || ""} ${data.last_name || ""}`.trim()
            : data.username || "Admin";

        setAdminName(name);
        const first = name.charAt(0).toUpperCase();
        setInitial(first);
        setAvatarColor(generateColor(first));
      } catch (err) {
        console.error("Profile fetch error:", err);
      }
    };

    fetchProfile();
  }, [token, navigate]);

  // 🎨 Dynamic avatar color based on name
  const generateColor = (char) => {
    const colors = [
      "#0b2349",
      "#F97316",
      "#1E88E5",
      "#43A047",
      "#9C27B0",
      "#E53935",
      "#00897B",
      "#6D4C41",
    ];
    const index = (char.charCodeAt(0) - 65) % colors.length;
    return colors[index];
  };

  // 🚪 Logout
  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/login");
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <h2 className="sidebar-title">Admin Panel</h2>
        <nav className="sidebar-nav">
          <NavLink to="/admin/dashboard" className="nav-link">
            <LayoutDashboard size={18} /> Dashboard
          </NavLink>
          <NavLink to="/admin/users" className="nav-link">
            <Users size={18} /> Manage Users
          </NavLink>
          <NavLink to="/admin/reports" className="nav-link">
            <BarChart2 size={18} /> Reports
          </NavLink>
          <NavLink to="/admin/settings" className="nav-link">
            <Settings size={18} /> Settings
          </NavLink>
        </nav>
      </aside>

      {/* Header + Main */}
      <div className="admin-main-wrapper">
        <header className="admin-header">
          <h2 className="header-title">Welcome, {adminName}</h2>

          {/* Profile & Logout Box */}
          <div
            className="profile-box"
            onClick={() => navigate("/profile")}
            title="View Profile"
          >
            <div
              className="avatar"
              style={{ backgroundColor: avatarColor }}
            >
              {initial}
            </div>
            <span className="profile-name">{adminName}</span>

            <button
              className="logout-btn"
              onClick={(e) => {
                e.stopPropagation(); // prevent triggering profile navigation
                handleLogout();
              }}
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
