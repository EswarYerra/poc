// frontend/src/pages/AddUserPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AddUserPage.css"; // keep same styling structure

// Fetch single code fallback endpoint (used when message not present in cached tables)
const fetchBackendMessage = async (code, type) => {
  try {
    const cached = localStorage.getItem(`${type}_${code}`);
    if (cached) return cached;

    const res = await fetch(`http://127.0.0.1:8000/api/auth/messages/${type}/${code}/`);
    if (res.ok) {
      const data = await res.json();
      const message = data?.message || "";
      if (message) localStorage.setItem(`${type}_${code}`, message);
      return message;
    }
  } catch (err) {
    console.warn("⚠️ Could not fetch backend message:", code, type, err);
  }
  return "";
};

export default function AddUserPage() {
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

  const [tables, setTables] = useState({
    user_error: [],
    user_validation: [],
    user_information: [],
  });

  const [errors, setErrors] = useState({}); // field -> message
  const [loadingPinLookup, setLoadingPinLookup] = useState(false);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("access");
  const navigate = useNavigate();

  // ---------- Load message tables (cache -> backend) ----------
  useEffect(() => {
    const loadTables = async () => {
      try {
        const e = JSON.parse(localStorage.getItem("user_error") || "[]");
        const v = JSON.parse(localStorage.getItem("user_validation") || "[]");
        const i = JSON.parse(localStorage.getItem("user_information") || "[]");

        if (Array.isArray(e) && Array.isArray(v) && Array.isArray(i) && (e.length || v.length || i.length)) {
          setTables({ user_error: e, user_validation: v, user_information: i });
          return;
        }

        const res = await fetch("http://127.0.0.1:8000/api/auth/messages/");
        if (res.ok) {
          const data = await res.json();
          setTables({
            user_error: Array.isArray(data.user_error) ? data.user_error : [],
            user_validation: Array.isArray(data.user_validation) ? data.user_validation : [],
            user_information: Array.isArray(data.user_information) ? data.user_information : [],
          });
          localStorage.setItem("user_error", JSON.stringify(data.user_error || []));
          localStorage.setItem("user_validation", JSON.stringify(data.user_validation || []));
          localStorage.setItem("user_information", JSON.stringify(data.user_information || []));
        } else {
          console.warn("Failed to fetch messages table:", res.status);
        }
      } catch (err) {
        console.error("Failed to load message tables:", err);
      }
    };
    loadTables();
  }, []);

  // ---------- Helpers to read cached tables with backend fallback ----------
  const getErrorText = async (code) => {
    const data = tables.user_error;
    let msg = "";

    if (Array.isArray(data)) {
      const found = data.find((x) => (x.error_code || "").toUpperCase() === (code || "").toUpperCase());
      msg = found?.error_message || "";
    } else if (typeof data === "object" && data !== null) {
      msg = data[code] || data[code.toUpperCase()] || "";
    }

    if (!msg) msg = await fetchBackendMessage(code, "error");
    return msg;
  };

  const getValidationText = async (code) => {
    const data = tables.user_validation;
    let msg = "";

    if (Array.isArray(data)) {
      const found = data.find((x) => (x.validation_code || "").toUpperCase() === (code || "").toUpperCase());
      msg = found?.validation_message || "";
    } else if (typeof data === "object" && data !== null) {
      msg = data[code] || data[code.toUpperCase()] || "";
    }

    if (!msg) msg = await fetchBackendMessage(code, "validation");
    return msg;
  };

  const getInfoText = async (code) => {
    const data = tables.user_information;
    let msg = "";

    if (Array.isArray(data)) {
      const found = data.find((x) => (x.information_code || "").toUpperCase() === (code || "").toUpperCase());
      msg = found?.information_text || "";
    } else if (typeof data === "object" && data !== null) {
      msg = data[code] || data[code.toUpperCase()] || "";
    }

    if (!msg) msg = await fetchBackendMessage(code, "information");
    return msg;
  };

  // ---------- Validation regexes ----------
  const NAME_RE = /^[A-Za-z\s]+$/;
  const USERNAME_RE = /^[A-Za-z0-9_]+$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_RE = /^[0-9]{10}$/;
  const ALNUM_SPACE_HYPHEN = /^[A-Za-z0-9\s-]+$/;
  const ALNUM_ONLY = /^[A-Za-z0-9]+$/;

  // ---------- Field validators (use DB messages) ----------
  const validatePersonalField = async (name, val) => {
    let msg = "";
    const v = String(val || "").trim();

    if (!v) {
      msg = await getValidationText("VA002");
    } else if ((name === "first_name" || name === "last_name") && !NAME_RE.test(v)) {
      msg = await getValidationText("VA001");
    } else if (name === "username" && !USERNAME_RE.test(v)) {
      msg = await getValidationText("VA003");
    } else if (name === "email" && !EMAIL_RE.test(v)) {
      msg = await getValidationText("VA005");
    } else if (name === "phone" && !PHONE_RE.test(v)) {
      msg = await getValidationText("VP009");
    }

    setErrors((p) => ({ ...p, [name]: msg }));
    return !msg;
  };

  const validateAddressField = async (name, val) => {
    let msg = "";
    const v = String(val || "");

    if (name === "postal_code") {
      if (!v.trim()) msg = await getErrorText("EA008");
      else if (!ALNUM_ONLY.test(v)) msg = await getErrorText("EA005");
      else if (v.length < 4 || v.length > 10) msg = await getErrorText("EA006");
    } else if (name === "landmark") {
      if (v && !ALNUM_SPACE_HYPHEN.test(v)) msg = await getErrorText("EA003");
    } else {
      if (!v.trim()) msg = await getErrorText("EA004");
      else if (!ALNUM_SPACE_HYPHEN.test(v)) msg = await getErrorText("EA003");
    }

    setErrors((p) => ({ ...p, [name]: msg }));
    return !msg;
  };

  const validateAll = async () => {
    const personalFields = ["username", "first_name", "last_name", "phone", "email", "password"];
    const addrFields = ["house_flat", "street", "area", "district", "city", "state", "postal_code", "country"];

    const personalChecks = await Promise.all(personalFields.map((f) => validatePersonalField(f, user[f])));
    const addrChecks = await Promise.all(addrFields.map((f) => validateAddressField(f, address[f])));

    return [...personalChecks, ...addrChecks].every(Boolean);
  };

  // ---------- Toast (show text from DB when possible) ----------
  const showToast = async (message, type = "success") => {
    // If a code was passed (like "IR001"), try to resolve to text.
    // But we usually pass already-resolved text here.
    const toast = document.createElement("div");
    toast.className = `toast-message ${type}`;
    toast.innerText = message || "";
    document.body.appendChild(toast);
    setTimeout(() => (toast.style.opacity = "0"), 1800);
    setTimeout(() => toast.remove(), 2400);
  };

  // ---------- Postal lookup ----------
  const lookupPostalCode = async (postal) => {
    setLoadingPinLookup(true);
    try {
      if (!postal || postal.length < 4) {
        const msg = await getErrorText("EA006");
        setErrors((p) => ({ ...p, postal_code: msg }));
        setLoadingPinLookup(false);
        return;
      }

      // India API first
      if ((address.country || "India") === "India") {
        try {
          const indiaRes = await fetch(`https://api.postalpincode.in/pincode/${postal}`);
          const indiaData = await indiaRes.json();
          if (Array.isArray(indiaData) && indiaData[0]?.Status === "Success") {
            const p = indiaData[0].PostOffice?.[0];
            if (p) {
              setAddress((prev) => ({
                ...prev,
                city: p.Block || p.Name || prev.city,
                district: p.District || prev.district,
                state: p.State || prev.state,
                country: "India",
              }));
              setErrors((p) => ({ ...p, postal_code: "" }));
              setLoadingPinLookup(false);
              return;
            }
          }
        } catch (err) {
          // continue to zippopotamus fallback
        }
      }

      // fallback to zippopotam.us
      const res = await fetch(`https://api.zippopotam.us/${(address.country || "us").toLowerCase()}/${postal}`);
      if (!res.ok) {
        const msg = await getErrorText("EA007");
        setErrors((p) => ({ ...p, postal_code: msg }));
        setLoadingPinLookup(false);
        return;
      }
      const data = await res.json();
      const place = data.places?.[0];
      if (place) {
        setAddress((prev) => ({
          ...prev,
          city: place["place name"] || prev.city,
          state: place["state"] || prev.state,
          country: data["country"] || prev.country,
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
    } finally {
      setLoadingPinLookup(false);
    }
  };

  // ---------- Handlers ----------
  const generatePassword = () => {
    const pwd = Math.random().toString(36).slice(-8);
    setUser((prev) => ({ ...prev, password: pwd }));
  };

  const handleChangeUser = async (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
    if (["username", "first_name", "last_name", "phone", "email", "password"].includes(name)) {
      // validate on change (non-blocking)
      await validatePersonalField(name, value);
    }
  };

  const handleChangeAddress = async (e) => {
    const { name, value } = e.target;
    setAddress((prev) => ({ ...prev, [name]: value }));

    if (name === "postal_code") {
      await validateAddressField(name, value);
      if (value.length >= 4) lookupPostalCode(value);
    } else {
      await validateAddressField(name, value);
    }
  };

  // ---------- Save ----------
  const handleSave = async () => {
    setErrors({});
    // client-side validation first
    if (!(await validateAll())) {
      return;
    }

    setSaving(true);
    try {
      // create user
      const userRes = await axios.post(
        "http://127.0.0.1:8000/api/viewprofile/admin/users/",
        user,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // backend may return created user object
      const createdUser = userRes.data;
      const userId = createdUser?.id || createdUser?.user || null;

      // save address if any meaningful data present
      const hasAddressData = Object.values(address).some((v) => v && String(v).trim());
      if (hasAddressData) {
        const addrPayload = { ...address, user: userId };
        const addrRes = await axios.post(
          "http://127.0.0.1:8000/api/addresses/",
          addrPayload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // ignore addrRes content (errors handled in catch)
      }

      // success message from DB (IR001) or fallback text
      const infoMsg = (await getInfoText("IR001")) || (userRes.data?.message || "User created successfully.");
      await showToast(infoMsg, "success");
      setTimeout(() => navigate("/admin/users"), 1200);
    } catch (err) {
      console.error("Create user failed:", err);

      // Map backend response to friendly field errors using codes or direct messages
      const respData = err.response?.data;
      const newErrs = {};

      if (respData) {
        // common DRF validation shape: { field: ["error msg"] } or { "detail": "..." } or {code: "EP016"}
        if (typeof respData === "object") {
          Object.keys(respData).forEach((k) => {
            const val = respData[k];
            if (Array.isArray(val)) newErrs[k] = String(val[0]);
            else if (typeof val === "string") newErrs[k] = val;
            else newErrs[k] = JSON.stringify(val);
          });
        } else if (typeof respData === "string") {
          newErrs.general = respData;
        }

        // If response contains known codes inside values (e.g. EP016 / ES003), map them using getErrorText
        const stringified = JSON.stringify(respData || "");
        if (stringified.includes("EP016")) {
          newErrs.username = (await getErrorText("EP016")) || "Username already exists.";
        }
        if (stringified.includes("ES003")) {
          newErrs.email = (await getErrorText("ES003")) || "Email already exists.";
        }
      } else {
        // no structured response -> generic fallback
        newErrs.general = (await getErrorText("EA010")) || "Failed to create user.";
      }

      setErrors((p) => ({ ...p, ...newErrs }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="view-profile-page add-user-page">
      <div className="view-profile-header">
        <h2>Add New User</h2>
      </div>

      {/* ACCOUNT INFO */}
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
            {errors.username && <div className="alert-box alert-error">{errors.username}</div>}
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
            {errors.email && <div className="alert-box alert-error">{errors.email}</div>}
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
            {errors.password && <div className="alert-box alert-error">{errors.password}</div>}
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
                setUser((prev) => ({ ...prev, is_active: e.target.value === "Active" }))
              }
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <div className="profile-card">
        <h3>Personal Details</h3>
        <div className="add-user-grid">
          <div className="add-user-group">
            <label>First Name</label>
            <input name="first_name" value={user.first_name} onChange={handleChangeUser} />
            {errors.first_name && <div className="alert-box alert-error">{errors.first_name}</div>}
          </div>
          <div className="add-user-group">
            <label>Last Name</label>
            <input name="last_name" value={user.last_name} onChange={handleChangeUser} />
            {errors.last_name && <div className="alert-box alert-error">{errors.last_name}</div>}
          </div>
          <div className="add-user-group">
            <label>Phone</label>
            <input name="phone" value={user.phone} onChange={handleChangeUser} />
            {errors.phone && <div className="alert-box alert-error">{errors.phone}</div>}
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="profile-card">
        <h3>Address Details</h3>
        <div className="add-user-grid">
          <div className="add-user-group">
            <label>Flat / House</label>
            <input name="house_flat" value={address.house_flat} onChange={handleChangeAddress} />
            {errors.house_flat && <div className="alert-box alert-error">{errors.house_flat}</div>}
          </div>

          <div className="add-user-group">
            <label>Street</label>
            <input name="street" value={address.street} onChange={handleChangeAddress} />
            {errors.street && <div className="alert-box alert-error">{errors.street}</div>}
          </div>

          <div className="add-user-group">
            <label>Area</label>
            <input name="area" value={address.area} onChange={handleChangeAddress} />
            {errors.area && <div className="alert-box alert-error">{errors.area}</div>}
          </div>

          <div className="add-user-group">
            <label>Pincode {loadingPinLookup && "(Fetching…)"}</label>
            <input name="postal_code" value={address.postal_code} onChange={handleChangeAddress} />
            {errors.postal_code && <div className="alert-box alert-error">{errors.postal_code}</div>}
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

      {/* Buttons */}
      <div className="action-buttons" style={{ justifyContent: "flex-end" }}>
        <button className="save-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save User"}
        </button>
        <button className="cancel-btn" onClick={() => navigate("/admin/users")}>
          Cancel
        </button>
      </div>

      {/* general error */}
      {errors.general && <div style={{ marginTop: 12 }} className="alert-box alert-error">{errors.general}</div>}
    </div>
  );
}
