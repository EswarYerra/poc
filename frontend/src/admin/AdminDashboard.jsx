import React, { useEffect, useState } from "react";
import axios from "axios";
import "../layouts/AdminLayout.css";
import "./AdminDashboard.css";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    holdUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const API = axios.create({
    baseURL: "http://127.0.0.1:8000/api/",
  });

  API.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        localStorage.getItem("refresh")
      ) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem("refresh");
          const res = await axios.post("http://127.0.0.1:8000/api/auth/token/refresh/", {
            refresh: refreshToken,
          });

          localStorage.setItem("access", res.data.access);
          API.defaults.headers.common["Authorization"] = `Bearer ${res.data.access}`;
          originalRequest.headers["Authorization"] = `Bearer ${res.data.access}`;
          return API(originalRequest);
        } catch (refreshError) {
          console.error("Token refresh failed");
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          window.location.href = "/login";
        }
      }

      return Promise.reject(error);
    }
  );

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("access");

      const res = await API.get("auth/admin/stats/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data;

      setStats({
        totalUsers: data.total_users,
        activeUsers: data.active_users,
        holdUsers: data.hold_users,
      });
    } catch (err) {
      setError("Failed to load user stats");
    } finally {
      setLoading(false);
    }
  };

  // ✅ CLICK HANDLERS FOR EACH CARD
  const goToAll = () => navigate("/admin/users", { state: { statusFilter: "All Status" } });
  const goToActive = () => navigate("/admin/users", { state: { statusFilter: "Active" } });
  const goToHold = () => navigate("/admin/users", { state: { statusFilter: "Inactive" } });

  return (
    <div className="admin-dashboard-container">
      <section className="welcome-section">
        <h1 className="welcome-text">Welcome To Admin Dashboard..!!</h1>
        <p className="subtitle">Manage your platform and settings</p>
      </section>

      <section className="stats-section">
        <h3 className="section-title">User Overview</h3>

        {loading ? (
          <p className="loading-text">Loading data...</p>
        ) : error ? (
          <p className="error-text">{error}</p>
        ) : (
          <div className="stats-cards">

            {/* ✅ TOTAL USERS */}
            <div className="stat-card orange" onClick={goToAll} style={{ cursor: "pointer" }}>
              <div className="stat-info">
                <h2>{stats.totalUsers}</h2>
                <p>Total Users</p>
              </div>
              <span className="badge orange">All</span>
            </div>

            {/* ✅ ACTIVE USERS */}
            <div className="stat-card green" onClick={goToActive} style={{ cursor: "pointer" }}>
              <div className="stat-info">
                <h2>{stats.activeUsers}</h2>
                <p>Active Users</p>
              </div>
              <span className="badge green">Active</span>
            </div>

            {/* ✅ HOLD USERS (Inactive) */}
            <div className="stat-card blue" onClick={goToHold} style={{ cursor: "pointer" }}>
              <div className="stat-info">
                <h2>{stats.holdUsers}</h2>
                <p>Hold Users</p>
              </div>
              <span className="badge blue">On Hold</span>
            </div>

          </div>
        )}
      </section>
    </div>
  );
}
