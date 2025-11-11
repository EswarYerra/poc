import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AddUserPage.css"; // same styling structure

function AddUserPage() {
  const [user, setUser] = useState({
    username: "",
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    role: "user",
    is_active: true,
    password: "",
  });

  const [address, setAddress] = useState({
    house_flat: "",
    street: "",
    area: "",
    postal_code: "",
    city: "",
    district: "",
    state: "",
    country: "India",
  });

  const [loadingPinLookup, setLoadingPinLookup] = useState(false);

  const token = localStorage.getItem("access");
  const navigate = useNavigate();

  // ✅ Toast
  const showToast = (message, type = "success") => {
    const toast = document.createElement("div");
    toast.className = `toast-message ${type}`;
    toast.innerText = message;

    document.body.appendChild(toast);

    setTimeout(() => (toast.style.opacity = "0"), 1800);
    setTimeout(() => toast.remove(), 2400);
  };

  const generatePassword = () => {
    const pwd = Math.random().toString(36).slice(-8);
    setUser({ ...user, password: pwd });
  };

  const handleChangeUser = (e) =>
    setUser({ ...user, [e.target.name]: e.target.value });

  const handleChangeAddress = async (e) => {
    const { name, value } = e.target;
    setAddress({ ...address, [name]: value });

    if (name === "postal_code" && value.length === 6) {
      setLoadingPinLookup(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${value}`);
        const data = await res.json();

        if (data[0]?.Status === "Success") {
          const p = data[0].PostOffice[0];
          setAddress((prev) => ({
            ...prev,
            city: p.Block || p.Name,
            district: p.District,
            state: p.State,
          }));
        }
      } catch {
        console.error("Pincode fetch failed");
      }
      setLoadingPinLookup(false);
    }
  };

  const handleSave = async () => {
    if (!user.username || !user.email || !user.password) {
      showToast("Username, Email & Password required", "error");
      return;
    }

    try {
      const userRes = await axios.post(
        "http://127.0.0.1:8000/api/viewprofile/admin/users/",
        user,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const userId = userRes.data.id;

      await axios.post(
        "http://127.0.0.1:8000/api/addresses/",
        { ...address, user: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showToast("✅ User created successfully!", "success");
      setTimeout(() => navigate("/admin/users"), 1200);
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to create user", "error");
    }
  };

  return (
    <div className="view-profile-page add-user-page">
      <div className="view-profile-header">
        <h2>Add New User</h2>
      </div>

      {/* ✅ ACCOUNT INFO */}
      <div className="profile-card">
        <h3>Account Information</h3>
        <div className="add-user-grid">
          <div className="add-user-group">
            <label>Username *</label>
            <input
              type="text"
              name="username"
              value={user.username}
              onChange={handleChangeUser}
              required
            />
          </div>

          <div className="add-user-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={user.email}
              onChange={handleChangeUser}
              required
            />
          </div>

          <div className="add-user-group">
            <label>Password *</label>
            <div className="password-row">
              <input
                type="text"
                name="password"
                value={user.password}
                onChange={handleChangeUser}
                required
              />
              <button type="button" className="pass-btn" onClick={generatePassword}>
                Generate
              </button>
            </div>
          </div>

          <div className="add-user-group">
            <label>Role</label>
            <select name="role" value={user.role} onChange={handleChangeUser}>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>

          <div className="add-user-group">
            <label>Status</label>
            <select
              value={user.is_active ? "Active" : "Inactive"}
              onChange={(e) =>
                setUser({ ...user, is_active: e.target.value === "Active" })
              }
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* ✅ Personal Info */}
      <div className="profile-card">
        <h3>Personal Details</h3>
        <div className="add-user-grid">
          <div className="add-user-group">
            <label>First Name</label>
            <input name="first_name" value={user.first_name} onChange={handleChangeUser} />
          </div>
          <div className="add-user-group">
            <label>Last Name</label>
            <input name="last_name" value={user.last_name} onChange={handleChangeUser} />
          </div>
          <div className="add-user-group">
            <label>Phone</label>
            <input name="phone" value={user.phone} onChange={handleChangeUser} />
          </div>
        </div>
      </div>

      {/* ✅ Address */}
      <div className="profile-card">
        <h3>Address Details</h3>
        <div className="add-user-grid">
          <div className="add-user-group">
            <label>Flat / House</label>
            <input name="house_flat" value={address.house_flat} onChange={handleChangeAddress} />
          </div>

          <div className="add-user-group">
            <label>Street</label>
            <input name="street" value={address.street} onChange={handleChangeAddress} />
          </div>

          <div className="add-user-group">
            <label>Area</label>
            <input name="area" value={address.area} onChange={handleChangeAddress} />
          </div>

          <div className="add-user-group">
            <label>Pincode {loadingPinLookup && "(Fetching…)"}</label>
            <input name="postal_code" value={address.postal_code} onChange={handleChangeAddress} />
          </div>

          <div className="add-user-group">
            <label>City</label>
            <input name="city" value={address.city} readOnly />
          </div>

          <div className="add-user-group">
            <label>District</label>
            <input name="district" value={address.district} readOnly />
          </div>

          <div className="add-user-group">
            <label>State</label>
            <input name="state" value={address.state} readOnly />
          </div>

          <div className="add-user-group">
            <label>Country</label>
            <input name="country" value={address.country} readOnly />
          </div>
        </div>
      </div>

      {/* ✅ Buttons */}
      <div className="action-buttons" style={{ justifyContent: "flex-end" }}>
        <button className="save-btn" onClick={handleSave}>
          Save User
        </button>
        <button className="cancel-btn" onClick={() => navigate("/admin/users")}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default AddUserPage;
