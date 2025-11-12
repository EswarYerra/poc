// ✅ frontend/src/pages/EditUserPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "../pages/ViewProfilePage.css";

// ✅ universal fallback fetcher from backend constants
const fetchBackendMessage = async (code, type) => {
  try {
    const cached = localStorage.getItem(`${type}_${code}`);
    if (cached) return cached;
    const res = await fetch(`http://127.0.0.1:8000/api/auth/messages/${type}/${code}/`);
    if (res.ok) {
      const data = await res.json();
      const msg = data?.message || "";
      if (msg) localStorage.setItem(`${type}_${code}`, msg);
      return msg;
    }
  } catch (err) {
    console.warn("⚠️ Could not fetch backend message:", code, type, err);
  }
  return "";
};

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
  const [tables, setTables] = useState({
    user_error: [],
    user_information: [],
    user_validation: [],
  });
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState("");
  const [loadingPinLookup, setLoadingPinLookup] = useState(false);
  const token = localStorage.getItem("access");
  const navigate = useNavigate();
  const { id } = useParams();

  // ✅ load message tables
  useEffect(() => {
    const loadTables = async () => {
      try {
        const e = JSON.parse(localStorage.getItem("user_error") || "[]");
        const i = JSON.parse(localStorage.getItem("user_information") || "[]");
        const v = JSON.parse(localStorage.getItem("user_validation") || "[]");

        if (e.length || i.length || v.length) {
          setTables({ user_error: e, user_information: i, user_validation: v });
        } else {
          const res = await fetch("http://127.0.0.1:8000/api/auth/messages/");
          if (res.ok) {
            const data = await res.json();
            setTables({
              user_error: data.user_error || [],
              user_information: data.user_information || [],
              user_validation: data.user_validation || [],
            });
            localStorage.setItem("user_error", JSON.stringify(data.user_error || []));
            localStorage.setItem("user_information", JSON.stringify(data.user_information || []));
            localStorage.setItem("user_validation", JSON.stringify(data.user_validation || []));
          }
        }
      } catch (err) {
        console.error("⚠️ Failed to load message tables:", err);
      }
    };
    loadTables();
  }, []);

  // ✅ dynamic getters
  const getErrorText = async (code) => {
    const e = tables.user_error.find((x) => (x.error_code || "").toUpperCase() === (code || "").toUpperCase());
    return e?.error_message || (await fetchBackendMessage(code, "error"));
  };
  const getValidationText = async (code) => {
    const v = tables.user_validation.find((x) => (x.validation_code || "").toUpperCase() === (code || "").toUpperCase());
    return v?.validation_message || (await fetchBackendMessage(code, "validation"));
  };
  const getInfoText = async (code) => {
    const i = tables.user_information.find((x) => (x.information_code || "").toUpperCase() === (code || "").toUpperCase());
    return i?.information_text || (await fetchBackendMessage(code, "information"));
  };

  // ✅ regex validation
  const NAME_RE = /^[A-Za-z\s]+$/;
  const USERNAME_RE = /^[A-Za-z0-9_]+$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_RE = /^[0-9]{10}$/;
  const ALNUM_SPACE_HYPHEN = /^[A-Za-z0-9\s-]+$/;
  const ALNUM_ONLY = /^[A-Za-z0-9]+$/;

  // ✅ fetch user + address
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    const fetchData = async () => {
      try {
        const userRes = await axios.get(`http://127.0.0.1:8000/api/viewprofile/admin/users/${id}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(userRes.data);

        const addrRes = await axios.get(`http://127.0.0.1:8000/api/addresses/?user=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

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
        console.error("⚠️ Error fetching user/address:", err);
        const msg = await getErrorText("EA010");
        setErrors((p) => ({ ...p, general: msg }));
      }
    };
    fetchData();
  }, [id, navigate, token]);

  // ✅ field validators
  const validatePersonalField = async (name, val) => {
    let msg = "";
    const v = String(val || "").trim();
    if (!v) msg = await getValidationText("VA002");
    else if ((name === "first_name" || name === "last_name") && !NAME_RE.test(v))
      msg = await getValidationText("VA001");
    else if (name === "username" && !USERNAME_RE.test(v))
      msg = await getValidationText("VA003");
    else if (name === "email" && !EMAIL_RE.test(v))
      msg = await getValidationText("VA005");
    else if (name === "phone" && !PHONE_RE.test(v))
      msg = await getValidationText("VA007");

    setErrors((p) => ({ ...p, [name]: msg }));
    return !msg;
  };

  const validateAddressField = async (name, val) => {
    let msg = "";
    const v = String(val || "");
    if (name === "landmark") {
      if (v && !ALNUM_SPACE_HYPHEN.test(v)) msg = await getErrorText("EA003");
    } else if (name === "postal_code") {
      if (!v.trim()) msg = await getErrorText("EA008");
      else if (!ALNUM_ONLY.test(v)) msg = await getErrorText("EA005");
      else if (v.length < 4 || v.length > 10) msg = await getErrorText("EA006");
    } else {
      if (!v.trim()) msg = await getErrorText("EA004");
      else if (!ALNUM_SPACE_HYPHEN.test(v)) msg = await getErrorText("EA003");
    }
    setErrors((p) => ({ ...p, [name]: msg }));
    return !msg;
  };

  // ✅ input handlers
  const handleChangeUser = async (e) => {
    const { name, value } = e.target;
    setUser((p) => ({ ...p, [name]: value }));
    if (["username", "first_name", "last_name", "email", "phone"].includes(name))
      await validatePersonalField(name, value);
  };

  const handleChangeAddress = async (e) => {
    const { name, value } = e.target;
    setAddress((p) => ({ ...p, [name]: value }));
    if (name === "postal_code") {
      await validateAddressField(name, value);
      if (value.length >= 5) lookupPostalCode(value);
    } else {
      await validateAddressField(name, value);
    }
  };

  // ✅ postal lookup
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
        setErrors((p) => ({ ...p, postal_code: "" }));
      } else {
        const msg = await getErrorText("EA006");
        setErrors((p) => ({ ...p, postal_code: msg }));
      }
    } catch (err) {
      console.error("Postal lookup failed:", err);
      const msg = await getErrorText("EA007");
      setErrors((p) => ({ ...p, postal_code: msg }));
    }
    setLoadingPinLookup(false);
  };

  // ✅ save user + address
  const handleSave = async () => {
    setErrors({});
    setSuccessMsg("");
    try {
      const resUser = await axios.put(
        `http://127.0.0.1:8000/api/viewprofile/admin/users/${id}/`,
        user,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // backend validation errors (duplicate user/email)
      if (resUser.status !== 200) throw new Error();

      const addrUrl = address.id
        ? `http://127.0.0.1:8000/api/addresses/${address.id}/`
        : "http://127.0.0.1:8000/api/addresses/";
      await axios({
        method: address.id ? "put" : "post",
        url: addrUrl,
        data: { ...address, user: id },
        headers: { Authorization: `Bearer ${token}` },
      });

      const msg = await getInfoText(address.id ? "IA004" : "IA001");
      setSuccessMsg(msg);
      setTimeout(() => navigate("/admin/users"), 1500);
    } catch (err) {
      console.error("⚠️ Error updating:", err);

      const response = err.response?.data || {};
      const newErrs = {};

      // handle duplicate username/email backend errors
      if (response.username && String(response.username).includes("exists"))
        newErrs.username = (await getErrorText("EP016")) || "Username already exists.";
      if (response.email && String(response.email).includes("exists"))
        newErrs.email = (await getErrorText("ES003")) || "Email already exists.";

      if (!Object.keys(newErrs).length)
        newErrs.general = (await getErrorText("EA011")) || (await getErrorText("EA010"));

      setErrors(newErrs);
    }
  };

  return (
    <div className="view-profile-page">
      <div className="view-profile-header">
        <h2>Edit Profile: {user.username}</h2>
      </div>

      {/* Account Info */}
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
              onChange={(e) => setUser((p) => ({ ...p, is_active: e.target.value === "Active" }))}
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

      {/* Personal Details */}
      <div className="profile-card">
        <h3>Personal Details</h3>
        <div className="edit-form-grid">
          {["username", "first_name", "last_name", "phone", "email"].map((key) => (
            <div className="edit-form-group" key={key}>
              <label>{key.replace(/_/g, " ").toUpperCase()}</label>
              <input name={key} value={user[key] || ""} onChange={handleChangeUser} />
              {errors[key] && <div className="alert-box alert-error">{errors[key]}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Address */}
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
              <input name={key} value={address[key] || ""} onChange={handleChangeAddress} />
              {errors[key] && <div className="alert-box alert-error">{errors[key]}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* General and success messages */}
      {errors.general && <div className="alert-box alert-error">{errors.general}</div>}
      {successMsg && <div className="alert-box alert-success">{successMsg}</div>}

      {/* Save + Cancel */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "22px" }}>
        <button className="save-btn" onClick={handleSave}>Save Changes</button>
        <button className="cancel-btn" onClick={() => navigate("/admin/users")}>Cancel</button>
      </div>
    </div>
  );
}

export default EditUserPage;
