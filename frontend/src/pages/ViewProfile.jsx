import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./ViewProfilePage.css";

function ViewProfilePage() {
  const [user, setUser] = useState({});
  const [address, setAddress] = useState({});
  const navigate = useNavigate();
  const { userId } = useParams();

  // ✅ Get stored tokens and user data
  const token = localStorage.getItem("access");
  const storedUser = JSON.parse(localStorage.getItem("user"));

  // ✅ User access logic
  const isAdminLoggedIn = storedUser?.is_admin;
  const isViewingOtherUser = Boolean(userId);
  const isAdminSelf = isAdminLoggedIn && !isViewingOtherUser;

  // ✅ Fetch data on load
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        // ✅ Choose correct endpoint
        const userUrl = isViewingOtherUser
          ? `http://127.0.0.1:8000/api/viewprofile/admin/users/${userId}/`
          : `http://127.0.0.1:8000/api/auth/profile/`;

        const userRes = await fetch(userUrl, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!userRes.ok) throw new Error("Failed to fetch user data");
        const userData = await userRes.json();
        setUser(userData);

        // ✅ Fetch address only for self
        if (!isViewingOtherUser) {
          const addrRes = await fetch("http://127.0.0.1:8000/api/addresses/", {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });

          if (addrRes.ok) {
            const addrData = await addrRes.json();
            if (Array.isArray(addrData) && addrData.length > 0) {
              setAddress(addrData[0]);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    fetchData();
  }, [token, navigate, isViewingOtherUser, userId]);

  // ✅ Button actions
  const handleEdit = () => navigate("/edit-profile");
  const handleChangePassword = () => navigate("/change-password");
  // 🔹 inside your component (EditProfilePage, AddressPage, etc.)

const handleLogout = async () => {
  try {
    // 1️⃣ Reconnect to DB and fetch latest message tables
    const res = await fetch("http://127.0.0.1:8000/api/auth/messages/");
    if (res.ok) {
      const data = await res.json();

      // ✅ store updated tables in localStorage cache
      localStorage.setItem("user_error", JSON.stringify(data.user_error || []));
      localStorage.setItem("user_validation", JSON.stringify(data.user_validation || []));
      localStorage.setItem("user_information", JSON.stringify(data.user_information || []));
      console.log("✅ Refreshed system messages from database on logout.");
    } else {
      console.warn("⚠️ Could not refresh message tables. Server responded:", res.status);
    }
  } catch (err) {
    console.error("⚠️ Failed to fetch message tables on logout:", err);
  }

  // 2️⃣ Clear sensitive user/session data
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("user");

  // ✅ Optional: clear cache to avoid stale messages (only if you want total wipe)
  // localStorage.removeItem("user_error");
  // localStorage.removeItem("user_validation");
  // localStorage.removeItem("user_information");

  // 3️⃣ Redirect to login
  navigate("/login");
};

  const handleBackToDashboard = () => navigate("/admin/dashboard");

  return (
    <div className="view-profile-page">
      {/* HEADER */}
      <div className="view-profile-header">
        <h2>
          {isViewingOtherUser
            ? `Viewing Profile: ${user.username || "User"}`
            : "Your Profile"}
        </h2>

        <div className="header-actions">
          {/* ✅ Edit & Change Password (self only) */}
          {!isViewingOtherUser && (
            <>
              <button className="edit-btn" onClick={handleEdit}>
                Edit Details
              </button>
              <button className="pass-btn" onClick={handleChangePassword}>
                Change Password
              </button>
            </>
          )}

          {/* ✅ Logout visible to everyone */}
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* ACCOUNT INFO */}
      <div className="profile-card">
        <h3 className="edit-subsection-title">Account Information</h3>
        <div className="edit-form-grid">
          <div className="edit-form-group">
            <label>Username</label>
            <input readOnly value={user.username || ""} />
          </div>

          <div className="edit-form-group">
            <label>Role</label>
            <input readOnly value={user.role || "User"} />
          </div>

          <div className="edit-form-group">
            <label>Status</label>
            <input readOnly value={user.is_active ? "Active" : "Inactive"} />
          </div>

          <div className="edit-form-group">
            <label>Date Joined</label>
            <input
              readOnly
              value={
                user.date_joined
                  ? new Date(user.date_joined).toLocaleDateString()
                  : ""
              }
            />
          </div>
        </div>
      </div>

      {/* PERSONAL DETAILS */}
      <div className="profile-card">
        <h3 className="edit-subsection-title">Personal Details</h3>
        <div className="edit-form-grid">
          {["first_name", "last_name", "phone", "email"].map((key) => (
            <div className="edit-form-group" key={key}>
              <label>{key.replace("_", " ").toUpperCase()}</label>
              <input readOnly value={user[key] || ""} />
            </div>
          ))}
        </div>
      </div>

      {/* ADDRESS INFO (self only) */}
      {!isViewingOtherUser && (
        <div className="profile-card">
          <h3 className="edit-subsection-title">Address Details</h3>
          <div className="edit-form-grid">
            {[
              "house_flat",
              "street",
              "landmark",
              "area",
              "district",
              "city",
              "state",
              "postal_code",
              "country",
            ].map((key) => (
              <div className="edit-form-group" key={key}>
                <label>{key.replace("_", " ").toUpperCase()}</label>
                <input readOnly value={address[key] || ""} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADMIN BACK BUTTON */}
      {(isAdminLoggedIn || isViewingOtherUser) && (
        <div className="bottom-action">
          <button className="back-btn" onClick={handleBackToDashboard}>
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}

export default ViewProfilePage;
