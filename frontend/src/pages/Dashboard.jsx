import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const checkUserAndAddress = async () => {
      try {
        // ✅ 1. Fetch user profile
        const profileRes = await fetch("http://127.0.0.1:8000/api/auth/profile/", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!profileRes.ok) {
          navigate("/profile");
          return;
        }

        const profileData = await profileRes.json();
        if (!profileData.name || !profileData.email) {
          navigate("/profile");
          return;
        }

        // ✅ 2. Check if user has address
        const checkAddressRes = await fetch("http://127.0.0.1:8000/api/addresses/check/", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const { has_address } = await checkAddressRes.json();

        if (has_address) {
          navigate("/viewprofile");
        } else {
          navigate("/address");
        }
      } catch (err) {
        console.error("Error checking user or address:", err);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    checkUserAndAddress();
  }, [token, navigate]);

  if (loading) {
    return <p className="loading">Loading your dashboard...</p>;
  }

  return null;
}

export default Dashboard;
