import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "../pages/ViewProfilePage.css"; // ✅ Keep same styling

function EditUserPage() {
  const [user, setUser] = useState({});
  const [address, setAddress] = useState({
    id: null,
    house_flat: "",
    street: "",
    landmark: "",
    area: "",
    district: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
  });

  const [loadingPinLookup, setLoadingPinLookup] = useState(false);
  const token = localStorage.getItem("access");
  const navigate = useNavigate();
  const { id } = useParams();

  // ✅ Fetch user + address
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchUserAndAddress = async () => {
      try {
        // Fetch user
        const userRes = await axios.get(
          `http://127.0.0.1:8000/api/viewprofile/admin/users/${id}/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setUser(userRes.data);

        // Fetch address
        const addrRes = await axios.get(
          `http://127.0.0.1:8000/api/addresses/?user=${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (Array.isArray(addrRes.data) && addrRes.data.length > 0) {
          const a = addrRes.data[0];
          setAddress({
            id: a.id,
            house_flat: a.house_flat || "",
            street: a.street || "",
            landmark: a.landmark || "",
            area: a.area || "",
            district: a.district || "",
            city: a.city || "",
            state: a.state || "",
            postal_code: a.postal_code || "",
            country: a.country || "",
          });
        }
      } catch (err) {
        console.error("Error fetching user/address:", err.response?.data || err.message);
      }
    };

    fetchUserAndAddress();
  }, [id, navigate, token]);

  // ✅ Handle inputs
  const handleChangeUser = (e) => {
    setUser((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleChangeAddress = (e) => {
    const { name, value } = e.target;
    setAddress((prev) => ({ ...prev, [name]: value }));

    if (name === "postal_code" && value.length === 6) {
      lookupPostalCode(value);
    }
  };

  const lookupPostalCode = async (postal) => {
    setLoadingPinLookup(true);

    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${postal}`);
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
    } catch (err) {
      console.error("Postal lookup failed:", err);
    }

    setLoadingPinLookup(false);
  };

  // ✅ Save user + address
  const handleSave = async () => {
    try {
      await axios.put(
        `http://127.0.0.1:8000/api/viewprofile/admin/users/${id}/`,
        user,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const addrUrl = address.id
        ? `http://127.0.0.1:8000/api/addresses/${address.id}/`
        : "http://127.0.0.1:8000/api/addresses/";

      await axios({
        method: address.id ? "put" : "post",
        url: addrUrl,
        data: { ...address, user: id },
        headers: { Authorization: `Bearer ${token}` },
      });

      navigate("/admin/users");
    } catch (err) {
      console.error("Error updating:", err.response?.data || err.message);
    }
  };

  return (
    <div className="view-profile-page">
      {/* ✅ Just title — no buttons */}
      <div className="view-profile-header">
        <h2>Edit Profile: {user.username}</h2>
      </div>

      {/* ✅ Account Info */}
      <div className="profile-card">
        <h3>Account Information</h3>
        <div className="edit-form-grid">
          <div className="edit-form-group">
            <label>Role</label>
            <select name="role" value={user.role || ""} onChange={handleChangeUser}>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>

          <div className="edit-form-group">
            <label>Status</label>
            <select
              value={user.is_active ? "Active" : "Inactive"}
              onChange={(e) =>
                setUser((prev) => ({ ...prev, is_active: e.target.value === "Active" }))
              }
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="edit-form-group">
            <label>Date Joined</label>
            <input readOnly value={user.date_joined?.split("T")[0] || ""} />
          </div>
        </div>
      </div>

      {/* ✅ Personal */}
      <div className="profile-card">
        <h3>Personal Details</h3>
        <div className="edit-form-grid">
          {["username", "first_name", "last_name", "phone", "email"].map((key) => (
            <div className="edit-form-group" key={key}>
              <label>{key.replace(/_/g, " ").toUpperCase()}</label>
              <input
                name={key}
                value={user[key] || ""}
                onChange={handleChangeUser}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ✅ Address */}
      <div className="profile-card">
        <h3>Address Details</h3>
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
              <label>
                {key.replace(/_/g, " ").toUpperCase()}
                {key === "postal_code" && loadingPinLookup && " (Fetching…)"}
              </label>
              <input
                name={key}
                value={address[key] || ""}
                onChange={handleChangeAddress}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ✅ ✅ Save + Cancel at BOTTOM */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "22px" }}>
        <button className="save-btn" onClick={handleSave}>
          Save Changes
        </button>
        <button className="cancel-btn" onClick={() => navigate("/admin/users")}>
          Cancel
        </button>
      </div>

    </div>
  );
}

export default EditUserPage;
